'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, X, ChevronRight, Terminal as TerminalIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TerminalProps {
  id: string
  onDelete: (id: string) => void
}

interface TerminalOutput {
  command: string
  output: string
  error?: string
  timestamp: Date
}

// Common terminal commands for suggestions
const COMMON_COMMANDS = [
  'ls', 'cd', 'mkdir', 'touch', 'rm', 'cp', 'mv', 
  'cat', 'grep', 'find', 'echo', 'pwd', 'npm', 'git'
];

/**
 * Terminal Component - Part of Phase 6, Step 1 of G.R.I.P. Enhancement Plan
 * A virtual terminal interface for executing commands
 */
export function Terminal({ id, onDelete }: TerminalProps) {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<TerminalOutput[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load terminal history when component mounts
  useEffect(() => {
    const loadHistory = async () => {
      try {
        // First, try to load the history
        const response = await fetch(`/api/terminal/command?terminalId=${id}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.history && Array.isArray(data.history)) {
            // Transform the history format to match the component's expected format
            const formattedHistory = data.history.map((item: any) => ({
              command: item.command,
              output: item.output,
              error: item.exitCode !== 0 ? 'Error: Non-zero exit code' : undefined,
              timestamp: new Date(item.timestamp)
            }));
            
            setHistory(formattedHistory || []);
            
            // Extract just the commands for command history
            const commands = data.history
              .map((item: any) => item.command)
              .filter(Boolean)
              .reverse();
            
            setCommandHistory(commands);
          }
        } else if (response.status === 404) {
          // Terminal might not exist, try to create it
          console.log('Terminal not found, creating a new one...');
          
          // Add initial welcome message to the history
          setHistory([{
            command: '',
            output: 'Terminal session not found. A new session will be created when you execute a command.',
            timestamp: new Date()
          }]);
        } else {
          throw new Error('Failed to load terminal history');
        }
      } catch (error) {
        console.error('Error loading terminal history:', error);
        
        // Add error message to history for better user experience
        setHistory([{
          command: '',
          output: 'Failed to connect to terminal server. Please try again later.',
          timestamp: new Date()
        }]);
      }
    };

    loadHistory();
  }, [id]);

  // Auto-scroll when history updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history])

  // Handle command execution
  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsLoading(true);
    
    // Add command to UI immediately for better UX
    const now = new Date();
    setHistory(prev => [...prev, {
      command,
      output: '',
      timestamp: now
    }]);
    
    try {
      // Try to execute the command
      const response = await fetch('/api/terminal/command', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminalId: id, command })
      });

      if (!response.ok) {
        // If terminal session doesn't exist, try to create it first
        if (response.status === 404) {
          try {
            // Create a new terminal session with the specific ID
            console.log(`Creating new terminal session with ID: ${id}`);
            const createResponse = await fetch('/api/terminal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                projectId: '000000000000000000000000', // Use default MongoDB ObjectId
                sessionId: id  // Pass the specific ID we want to create
              })
            });
            
            if (createResponse.ok) {
              // Retry command execution with the new terminal
              const retryResponse = await fetch('/api/terminal/command', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ terminalId: id, command })
              });
              
              if (retryResponse.ok) {
                const data = await retryResponse.json();
                handleCommandResponse(data);
              } else {
                throw new Error('Failed to execute command after creating terminal');
              }
            } else {
              throw new Error('Failed to create terminal session');
            }
          } catch (createError) {
            console.error('Error creating terminal:', createError);
            throw new Error('Failed to create terminal session');
          }
        } else {
          throw new Error('Failed to execute command');
        }
      } else {
        const data = await response.json();
        handleCommandResponse(data);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      
      // Update the last history entry with the error
      setHistory(prev => {
        const newHistory = [...prev];
        const lastIndex = newHistory.length - 1;
        
        if (lastIndex >= 0) {
          newHistory[lastIndex] = {
            ...newHistory[lastIndex],
            output: '',
            error: error instanceof Error ? error.message : 'Failed to execute command'
          };
        }
        
        return newHistory;
      });
    } finally {
      setIsLoading(false);
      setCommand('');
      setHistoryIndex(-1);
      setShowSuggestions(false);
    }
  };
  
  // Helper function to handle command response
  const handleCommandResponse = (data: any) => {
    // Check if this is a clear command
    if (data.clear) {
      setHistory([]);
      return;
    }

    // Update the last history entry with the command response
    setHistory(prev => {
      const newHistory = [...prev];
      const lastIndex = newHistory.length - 1;
      
      if (lastIndex >= 0) {
        newHistory[lastIndex] = {
          ...newHistory[lastIndex],
          output: data.output || '',
          error: data.exitCode !== 0 ? `Error: Exit code ${data.exitCode}` : undefined
        };
      }
      
      return newHistory;
    });

    // Add to command history for up/down navigation
    if (command.trim() && !commandHistory.includes(command)) {
      setCommandHistory(prev => [command, ...prev.slice(0, 49)]);
    }
  };

  // Handle keyboard navigation through command history and tab completion
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      if (suggestions.length === 1) {
        // If there's only one suggestion, use it
        setCommand(suggestions[0]);
        setSuggestions([]);
        setShowSuggestions(false);
      } else if (suggestions.length > 1) {
        // Toggle suggestions display
        setShowSuggestions(!showSuggestions);
      } else {
        // Generate new suggestions based on current command
        const newSuggestions = generateSuggestions(command);
        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
      }
    } else if (e.key === 'Escape') {
      // Clear suggestions
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  // Generate command suggestions based on input
  const generateSuggestions = (input: string): string[] => {
    if (!input) return [];
    
    // Get unique commands from history
    const historicalCommands = Array.from(
      new Set(commandHistory.map(cmd => cmd.split(' ')[0]))
    );
    
    // Combine with common commands
    const allCommands = Array.from(
      new Set([...historicalCommands, ...COMMON_COMMANDS])
    );
    
    // Filter commands that start with the input
    return allCommands
      .filter(cmd => cmd.startsWith(input))
      .sort()
      .slice(0, 5); // Limit to 5 suggestions
  }

  // Handle input change and update suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCommand(value);
    
    // Reset history index when manually typing
    if (historyIndex !== -1) {
      setHistoryIndex(-1);
    }
    
    // Update suggestions
    if (value.trim()) {
      const newSuggestions = generateSuggestions(value.trim());
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  // Select a suggestion
  const selectSuggestion = (suggestion: string) => {
    setCommand(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between py-3 border-b">
        <div className="flex items-center">
          <div className="flex space-x-2 mr-3">
            <div className="h-3 w-3 rounded-full bg-destructive" />
            <div className="h-3 w-3 rounded-full bg-accent-amber" />
            <div className="h-3 w-3 rounded-full bg-success" />
          </div>
          <TerminalIcon className="h-5 w-5 mr-2 text-primary" />
          <CardTitle className="text-md">Terminal {id.slice(0, 8)}</CardTitle>
          <Badge variant="outline" className="ml-2 text-xs">
            {history.length} commands
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(id)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 h-full">
        <div className="bg-background-primary text-text-primary p-4 font-mono text-sm h-full flex flex-col border border-border rounded-b-lg">
          <ScrollArea className="flex-1 pr-4 mb-4 min-h-0">
            <div className="space-y-2" ref={scrollRef}>
              <div className="p-3 bg-primary/10 border border-primary/20 rounded text-xs mb-4">
                <div className="flex items-center">
                  <TerminalIcon className="h-4 w-4 mr-2 text-primary" />
                  <p className="font-semibold text-primary">G.R.I.P. Terminal v1.0</p>
                </div>
                <p className="mt-1 text-text-secondary">Type <span className="text-primary font-semibold">help</span> for a list of available commands.</p>
              </div>
              
              {history.map((entry, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center text-success">
                    <ChevronRight className="h-3 w-3 mr-1" />
                    <span className="font-semibold">{entry.command}</span>
                  </div>
                  {entry.output && (
                    <div className="pl-4 text-text-secondary whitespace-pre-wrap">
                      {entry.output}
                    </div>
                  )}
                  {entry.error && (
                    <div className="pl-4 text-destructive whitespace-pre-wrap">
                      {entry.error}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Current command input display */}
              {!isLoading && (
                <div className="flex items-center text-success animate-pulse">
                  <ChevronRight className="h-3 w-3 mr-1" />
                  <span>_</span>
                </div>
              )}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center text-primary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="bg-background-tertiary rounded border border-border mb-2">
              <div className="text-xs text-text-muted p-1 border-b border-border">
                Suggestions:
              </div>
              <div className="p-1">
                {suggestions.map((suggestion, i) => (
                  <Button 
                    key={i}
                    variant="ghost"
                    size="sm"
                    onClick={() => selectSuggestion(suggestion)}
                    className="text-primary hover:text-primary-hover hover:bg-background-secondary mr-1 mb-1"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Command input */}
          <form onSubmit={executeCommand} className="relative mt-auto">
            <div className="flex items-center">
              <ChevronRight className="h-4 w-4 mr-2 text-success absolute left-3" />
              <Input
                ref={inputRef}
                type="text"
                value={command}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Enter command..."
                className="pl-10 font-mono bg-background-secondary border-border text-text-primary focus-visible:ring-primary w-full"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  )
} 