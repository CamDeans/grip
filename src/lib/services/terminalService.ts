/**
 * Terminal Command Interpreter Service
 * Part of Phase 6, Step 2 of G.R.I.P. Enhancement Plan
 * 
 * This service provides command parsing, execution, and output formatting
 * for the virtual terminal in the G.R.I.P. system.
 */

import path from 'path';
import { TerminalSession } from '@/lib/models/TerminalSession';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { WebSocket } from 'ws';

// Command result interface
export interface CommandResult {
  output: string;
  exitCode: number;
  duration: number;
  newDirectory?: string;
  clear?: boolean;
  progress?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

// Command interface
export interface Command {
  name: string;
  description: string;
  usage: string;
  category: CommandCategory;
  aliases?: string[];
  validate?: (args: string[], options: Map<string, string>) => string | null;
  execute: (args: string[], options: Map<string, string>, terminal: any) => Promise<CommandResult>;
}

// Command category enum
export enum CommandCategory {
  HELP = 'help',
  FILESYSTEM = 'filesystem',
  UTILITY = 'utility',
  PROJECT = 'project',
  GIT = 'git',
  NPM = 'npm',
  CUSTOM = 'custom'
}

// Command chain interface
interface CommandChain {
  commands: string[];
  operator: '&&' | '||' | '|';
}

// Available commands
const commands = new Map<string, Command>();

// Command aliases
const commandAliases = new Map<string, string>();

// Command pipelines
const commandPipelines = new Map<string, CommandChain>();

// WebSocket connections for real-time updates
const wsConnections = new Map<string, WebSocket>();

/**
 * Registers built-in commands with enhanced features
 */
function registerCommands() {
  // Help command with aliases
  commands.set('help', {
    name: 'help',
    description: 'Display help information for available commands',
    usage: 'help [command]',
    category: CommandCategory.HELP,
    aliases: ['h', '?'],
    validate: (args) => {
      if (args.length > 1) return 'Too many arguments';
      return null;
    },
    execute: async (args, options, terminal) => {
      if (args.length === 0) {
        // List all commands by category
        const categories = new Map<CommandCategory, Command[]>();
        
        // Use Array.from to handle Map iteration
        Array.from(commands.values()).forEach((cmd) => {
          if (!categories.has(cmd.category)) {
            categories.set(cmd.category, []);
          }
          categories.get(cmd.category)?.push(cmd);
        });
        
        let output = 'G.R.I.P. Terminal - Available Commands\n\n';
        
        // Use Array.from to handle Map iteration
        Array.from(categories.entries()).forEach(([category, cmds]) => {
          output += `${category.toUpperCase()}:\n`;
          
          cmds.forEach((cmd) => {
            output += `  ${cmd.name.padEnd(12)} - ${cmd.description}\n`;
          });
          
          output += '\n';
        });
        
        output += 'Type "help [command]" for more information about a specific command.';
        
        return {
          output,
          exitCode: 0,
          duration: 0,
          status: 'completed'
        };
      } else {
        // Show help for specific command
        const commandName = args[0];
        const command = commands.get(commandName);
        
        if (!command) {
          return {
            output: `Unknown command: ${commandName}`,
            exitCode: 1,
            duration: 0
          };
        }
        
        let output = `Command: ${command.name}\n`;
        output += `Description: ${command.description}\n`;
        output += `Usage: ${command.usage}\n`;
        output += `Category: ${command.category}`;
        
        return {
          output,
          exitCode: 0,
          duration: 0
        };
      }
    }
  });

  // Echo command
  commands.set('echo', {
    name: 'echo',
    description: 'Display a line of text',
    usage: 'echo [text]',
    category: CommandCategory.UTILITY,
    execute: async (args, options, terminal) => {
      return {
        output: args.join(' '),
        exitCode: 0,
        duration: 0
      };
    }
  });

  // PWD command
  commands.set('pwd', {
    name: 'pwd',
    description: 'Print working directory',
    usage: 'pwd',
    category: CommandCategory.FILESYSTEM,
    execute: async (args, options, terminal) => {
      return {
        output: terminal.currentDirectory,
        exitCode: 0,
        duration: 0
      };
    }
  });

  // LS command
  commands.set('ls', {
    name: 'ls',
    description: 'List directory contents',
    usage: 'ls [directory]',
    category: CommandCategory.FILESYSTEM,
    aliases: ['dir', 'list'],
    validate: (args) => {
      if (args.length > 1) return 'Too many arguments';
      return null;
    },
    execute: async (args, options, terminal) => {
      // In a real implementation, this would list actual directory contents
      // For now, we'll simulate based on the current directory
      
      let output = '';
      
      // Simulate directory content based on path
      const directory = args.length > 0 ? args[0] : terminal.currentDirectory;
      
      if (directory === '/' || directory === '/home') {
        output = 'bin/  etc/  home/  usr/  var/';
      } else if (directory === '/home/user') {
        output = 'documents/  downloads/  projects/';
      } else if (directory === '/home/user/projects') {
        output = 'my-project/  README.md  package.json';
      } else {
        output = 'file1.txt  file2.txt  directory/';
      }
      
      return {
        output,
        exitCode: 0,
        duration: 0
      };
    }
  });

  // CD command
  commands.set('cd', {
    name: 'cd',
    description: 'Change directory',
    usage: 'cd [directory]',
    category: CommandCategory.FILESYSTEM,
    execute: async (args, options, terminal) => {
      if (args.length === 0) {
        // Default to home directory if no args
        return {
          output: '',
          exitCode: 0,
          duration: 0,
          newDirectory: '/home/user'
        };
      }
      
      const targetDir = args[0];
      let newDirectory = terminal.currentDirectory;
      
      if (targetDir.startsWith('/')) {
        // Absolute path
        newDirectory = targetDir;
      } else if (targetDir === '..') {
        // Parent directory
        const parts = terminal.currentDirectory.split('/').filter(p => p !== '');
        if (parts.length > 0) {
          parts.pop();
        }
        newDirectory = '/' + parts.join('/');
      } else if (targetDir === '~') {
        // Home directory
        newDirectory = '/home/user';
      } else {
        // Relative path
        newDirectory = path.join(terminal.currentDirectory, targetDir);
      }
      
      // Make sure the path starts with a slash
      if (!newDirectory.startsWith('/')) {
        newDirectory = '/' + newDirectory;
      }
      
      // Replace backslashes with forward slashes for consistency
      newDirectory = newDirectory.replace(/\\/g, '/');
      
      // Handle double slashes
      newDirectory = newDirectory.replace(/\/+/g, '/');
      
      // Handle empty path
      if (newDirectory === '') {
        newDirectory = '/';
      }
      
      return {
        output: '',
        exitCode: 0,
        duration: 0,
        newDirectory
      };
    }
  });

  // Clear command
  commands.set('clear', {
    name: 'clear',
    description: 'Clear the terminal screen',
    usage: 'clear',
    category: CommandCategory.UTILITY,
    execute: async (args, options, terminal) => {
      return {
        output: '',
        exitCode: 0,
        duration: 0,
        clear: true
      };
    }
  });

  // Mkdir command
  commands.set('mkdir', {
    name: 'mkdir',
    description: 'Create a directory',
    usage: 'mkdir [directory]',
    category: CommandCategory.FILESYSTEM,
    execute: async (args, options, terminal) => {
      if (args.length === 0) {
        return {
          output: 'mkdir: missing operand\nTry \'mkdir --help\' for more information.',
          exitCode: 1,
          duration: 0
        };
      }
      
      // Simulate directory creation
      return {
        output: '',
        exitCode: 0,
        duration: 0
      };
    }
  });

  // Git command (simulated)
  commands.set('git', {
    name: 'git',
    description: 'Git version control',
    usage: 'git [command]',
    category: CommandCategory.GIT,
    execute: async (args, options, terminal) => {
      if (args.length === 0) {
        return {
          output: 'usage: git [--version] [--help] [-C <path>] [-c <name>=<value>]\n' +
                 '           [--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]\n' +
                 '           [-p | --paginate | -P | --no-pager] [--no-replace-objects] [--bare]\n' +
                 '           [--git-dir=<path>] [--work-tree=<path>] [--namespace=<name>]\n' +
                 '           <command> [<args>]',
          exitCode: 1,
          duration: 0
        };
      }
      
      const subcommand = args[0];
      
      if (subcommand === 'init') {
        return {
          output: 'Initialized empty Git repository',
          exitCode: 0,
          duration: 0
        };
      } else if (subcommand === 'status') {
        return {
          output: 'On branch main\nNothing to commit, working tree clean',
          exitCode: 0,
          duration: 0
        };
      } else if (subcommand === 'version') {
        return {
          output: 'git version 2.40.1',
          exitCode: 0,
          duration: 0
        };
      } else {
        return {
          output: `git: '${subcommand}' is not a git command. See 'git --help'.`,
          exitCode: 1,
          duration: 0
        };
      }
    }
  });

  // NPM command (simulated)
  commands.set('npm', {
    name: 'npm',
    description: 'Node package manager',
    usage: 'npm [command]',
    category: CommandCategory.NPM,
    execute: async (args, options, terminal) => {
      if (args.length === 0) {
        return {
          output: 'npm <command>\n\nUsage:\n\n  npm install [<package>]\n  npm run <script>\n  npm test',
          exitCode: 1,
          duration: 0
        };
      }
      
      const subcommand = args[0];
      
      if (subcommand === 'init') {
        return {
          output: 'This utility will walk you through creating a package.json file.\n' +
                 'Press ^C at any time to quit.',
          exitCode: 0,
          duration: 0
        };
      } else if (subcommand === 'install' || subcommand === 'i') {
        if (args.length === 1) {
          return {
            output: 'Installing dependencies...\nDone!',
            exitCode: 0,
            duration: 0
          };
        } else {
          const packageName = args[1];
          return {
            output: `Installing ${packageName}...\nAdded 1 package in 2s`,
            exitCode: 0,
            duration: 0
          };
        }
      } else if (subcommand === 'run') {
        if (args.length === 1) {
          return {
            output: 'npm run requires a script name',
            exitCode: 1,
            duration: 0
          };
        } else {
          const scriptName = args[1];
          return {
            output: `> project@1.0.0 ${scriptName}\n> Running script ${scriptName}...`,
            exitCode: 0,
            duration: 0
          };
        }
      } else {
        return {
          output: `Unknown command: ${subcommand}`,
          exitCode: 1,
          duration: 0
        };
      }
    }
  });
}

// Register commands
registerCommands();

/**
 * Parses a command string into command and arguments with support for chaining and pipelines
 */
function parseCommand(commandStr: string): { 
  command: string, 
  args: string[], 
  options: Map<string, string>,
  chain?: CommandChain 
} {
  // Check for command chaining
  if (commandStr.includes('&&') || commandStr.includes('||') || commandStr.includes('|')) {
    const parts = commandStr.split(/(&&|\|\||\|)/);
    const chain: CommandChain = {
      commands: [],
      operator: '&&'
    };

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === '&&' || part === '||' || part === '|') {
        chain.operator = part as '&&' | '||' | '|';
      } else {
        chain.commands.push(part.trim());
      }
    }

    return parseCommand(chain.commands[0]);
  }

  const parts = commandStr.trim().split(/\s+/);
  const command = parts[0] || '';
  const args: string[] = [];
  const options = new Map<string, string>();
  
  // Extract args and options
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    if (part.startsWith('--')) {
      // Long option
      const optParts = part.substring(2).split('=');
      const key = optParts[0];
      const value = optParts.length > 1 ? optParts[1] : 'true';
      options.set(key, value);
    } else if (part.startsWith('-') && part.length > 1) {
      // Short option
      for (let j = 1; j < part.length; j++) {
        options.set(part[j], 'true');
      }
    } else {
      // Regular argument
      args.push(part);
    }
  }
  
  return { command, args, options };
}

/**
 * Enhanced Terminal Service with real-time updates and error handling
 */
export const TerminalService = {
  /**
   * Execute a command in a terminal session with enhanced features
   */
  async executeCommand(terminalId: string, commandStr: string): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      // Parse the command
      const { command, args, options, chain } = parseCommand(commandStr);
      
      // Connect to the database
      await connectToDatabase();
      
      // Find the terminal session
      const terminal = await TerminalSession.findOne({ sessionId: terminalId });
      
      if (!terminal) {
        return {
          output: 'Terminal session not found',
          exitCode: 1,
          duration: Date.now() - startTime,
          status: 'failed'
        };
      }

      // Check for command aliases
      const actualCommand = commandAliases.get(command) || command;
      
      // Find and execute the command
      const cmd = commands.get(actualCommand);
      
      if (cmd) {
        // Validate command arguments
        if (cmd.validate) {
          const validationError = cmd.validate(args, options);
          if (validationError) {
            return {
              output: `Error: ${validationError}`,
              exitCode: 1,
              duration: Date.now() - startTime,
              status: 'failed'
            };
          }
        }

        // Update status to running
        this.updateCommandStatus(terminalId, 'running', 0);

        const result = await cmd.execute(args, options, terminal);
        
        // Update terminal directory if changed
        if (result.newDirectory) {
          terminal.currentDirectory = result.newDirectory;
          await terminal.save();
        }
        
        // Calculate final duration
        result.duration = Date.now() - startTime;
        result.status = 'completed';
        
        // Update status to completed
        this.updateCommandStatus(terminalId, 'completed', 100);
        
        return result;
      } else {
        return {
          output: `Command not found: ${command}`,
          exitCode: 127,
          duration: Date.now() - startTime,
          status: 'failed'
        };
      }
    } catch (error) {
      // Update status to failed
      this.updateCommandStatus(terminalId, 'failed', 0);
      
      return {
        output: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exitCode: 1,
        duration: Date.now() - startTime,
        status: 'failed'
      };
    }
  },

  /**
   * Update command status for real-time updates
   */
  updateCommandStatus(terminalId: string, status: string, progress: number) {
    const ws = wsConnections.get(terminalId);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'command_status',
        status,
        progress
      }));
    }
  },

  /**
   * Register a WebSocket connection for real-time updates
   */
  registerWebSocket(terminalId: string, ws: WebSocket) {
    wsConnections.set(terminalId, ws);
  },

  /**
   * Unregister a WebSocket connection
   */
  unregisterWebSocket(terminalId: string) {
    wsConnections.delete(terminalId);
  },

  /**
   * Get command suggestions with enhanced matching
   */
  getCommandSuggestions(input: string, currentDir: string): string[] {
    if (!input) {
      return ['ls', 'cd', 'pwd', 'git', 'npm', 'echo', 'mkdir', 'help'];
    }

    const matches: string[] = [];
    
    // Use Array.from to handle Map iteration
    Array.from(commands.keys()).forEach((cmdName: string) => {
      if (cmdName.startsWith(input)) {
        matches.push(cmdName);
      }
    });
    
    // Use Array.from to handle Map iteration
    Array.from(commandAliases.entries()).forEach(([alias, command]: [string, string]) => {
      if (alias.startsWith(input)) {
        matches.push(alias);
      }
    });
    
    return matches;
  },

  /**
   * Get the list of available commands with aliases
   */
  getAvailableCommands(): Map<string, Command> {
    const allCommands = new Map<string, Command>(commands);
    
    // Use Array.from to handle Map iteration
    Array.from(commandAliases.entries()).forEach(([alias, command]: [string, string]) => {
      const cmd = commands.get(command);
      if (cmd) {
        allCommands.set(alias, cmd);
      }
    });
    
    return allCommands;
  },

  /**
   * Check if a command exists (including aliases)
   */
  commandExists(command: string): boolean {
    return commands.has(command) || commandAliases.has(command);
  },

  /**
   * Register a command alias
   */
  registerAlias(alias: string, command: string): boolean {
    if (commands.has(command)) {
      commandAliases.set(alias, command);
      return true;
    }
    return false;
  },

  /**
   * Register a command pipeline
   */
  registerPipeline(name: string, chain: CommandChain): void {
    commandPipelines.set(name, chain);
  }
};

export default TerminalService; 