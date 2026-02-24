import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Terminal } from '@/components/terminal/Terminal';
import { CommandSuggestions } from '@/components/terminal/CommandSuggestions';
import { TerminalChatBridge } from '@/components/terminal/TerminalChatBridge';

// Mock the useTerminal hook
jest.mock('@/hooks/useTerminal', () => ({
  useTerminal: jest.fn(() => ({
    sessionId: 'test-session-id',
    output: [
      { id: '1', type: 'command', content: 'ls -la', timestamp: new Date().toISOString() },
      { id: '2', type: 'output', content: 'total 0\ndrwxr-xr-x  2 user user  40 Jan 1 12:00 .', timestamp: new Date().toISOString() }
    ],
    isConnected: true,
    isLoading: false,
    error: null,
    sendCommand: jest.fn((command) => {
      // Simulate adding command and response to output
      const output = [
        { id: Date.now().toString(), type: 'command', content: command, timestamp: new Date().toISOString() },
        { id: (Date.now() + 1).toString(), type: 'output', content: `Executed: ${command}`, timestamp: new Date().toISOString() }
      ];
      return Promise.resolve(output);
    }),
    clearOutput: jest.fn(),
    reconnect: jest.fn()
  }))
}));

// Mock the useChat hook for the bridge
jest.mock('@/hooks/useChat', () => ({
  useChat: jest.fn(() => ({
    messages: [
      { id: 'msg-1', role: 'user', content: 'How do I list files?', timestamp: new Date() },
      { id: 'msg-2', role: 'assistant', content: 'You can use the `ls` command to list files.', timestamp: new Date() }
    ],
    sendMessage: jest.fn((message) => {
      return Promise.resolve({
        id: 'msg-3', 
        role: 'assistant',
        content: `I'll help you with: ${message}`,
        timestamp: new Date()
      });
    }),
    isLoading: false,
    error: null
  }))
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/terminal'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  useParams: jest.fn(() => ({ projectId: 'test-project-id' })),
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    connected: true
  };
  return jest.fn(() => mockSocket);
});

// Create mock functions for command execution
const mockOnDelete = jest.fn();
const mockOnStatusChange = jest.fn();
const mockOnSelectSuggestion = jest.fn();
const mockOnExecuteCommand = jest.fn();

// Create a wrapper component that simulates the terminal integration
const TerminalSystemIntegration = () => {
  const [commandInput, setCommandInput] = React.useState('');
  const [commandHistory, setCommandHistory] = React.useState<string[]>(['ls', 'cd /home', 'pwd']);
  const [lastCommand, setLastCommand] = React.useState({
    command: 'ls -la',
    output: 'total 0\ndrwxr-xr-x  2 user user  40 Jan 1 12:00 .',
    timestamp: new Date(),
    exitCode: 0
  });

  const handleExecuteCommand = async (command: string) => {
    mockOnExecuteCommand(command);
    setCommandHistory(prev => [...prev, command]);
    setLastCommand({
      command,
      output: `Executed: ${command}`,
      timestamp: new Date(),
      exitCode: 0
    });
  };

  return (
    <div>
      <Terminal 
        id="test-terminal-id"
        onDelete={mockOnDelete}
        status="active"
        onStatusChange={mockOnStatusChange}
        projectId="test-project-id"
        currentDirectory="/home/user"
      />
      <CommandSuggestions 
        input={commandInput}
        projectId="test-project-id"
        currentDirectory="/home/user"
        commandHistory={commandHistory}
        onSelectSuggestion={mockOnSelectSuggestion}
        className="mt-4"
      />
      <TerminalChatBridge 
        terminalId="test-terminal-id"
        lastCommand={lastCommand}
        onExecuteCommand={handleExecuteCommand}
      />
    </div>
  );
};

describe.skip('Terminal System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the terminal system components together', async () => {
    render(<TerminalSystemIntegration />);
    
    // Wait for components to load
    await waitFor(() => {
      // Terminal should display command input
      expect(screen.getByPlaceholderText(/Enter command/i)).toBeInTheDocument();
      
      // Terminal should show previous command outputs
      expect(screen.getByText(/ls -la/i)).toBeInTheDocument();
      expect(screen.getByText(/total 0/i)).toBeInTheDocument();
      
      // Command suggestions should be visible
      expect(screen.getByText(/Suggested Commands/i)).toBeInTheDocument();
      
      // Terminal-Chat bridge should show chat messages
      expect(screen.getByText(/How do I list files?/i)).toBeInTheDocument();
    });
  });

  it('executes commands in the terminal', async () => {
    render(<TerminalSystemIntegration />);
    
    // Find the command input and send a command
    const commandInput = screen.getByPlaceholderText(/Enter command/i);
    fireEvent.change(commandInput, { target: { value: 'npm install' } });
    fireEvent.keyDown(commandInput, { key: 'Enter', code: 'Enter' });
    
    // Wait for the command and output to appear
    await waitFor(() => {
      expect(screen.getByText(/npm install/i)).toBeInTheDocument();
      expect(screen.getByText(/Executed: npm install/i)).toBeInTheDocument();
    });
    
    // Verify that sendCommand was called
    const { useTerminal } = require('@/hooks/useTerminal');
    expect(useTerminal().sendCommand).toHaveBeenCalledWith('npm install');
  });

  it('suggests commands based on context', async () => {
    // Mock the API call that fetches command suggestions
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        suggestions: [
          { command: 'npm start', description: 'Start the development server' },
          { command: 'git status', description: 'Check git status' }
        ]
      })
    });
    
    render(<TerminalSystemIntegration />);
    
    // Wait for suggestions to load
    await waitFor(() => {
      expect(screen.getByText(/npm start/i)).toBeInTheDocument();
      expect(screen.getByText(/git status/i)).toBeInTheDocument();
    });
    
    // Click on a suggestion
    const suggestion = screen.getByText(/npm start/i);
    fireEvent.click(suggestion);
    
    // The suggestion callback should be called
    expect(mockOnSelectSuggestion).toHaveBeenCalledWith('npm start');
  });

  it('bridges terminal commands to chat', async () => {
    render(<TerminalSystemIntegration />);
    
    // Wait for the bridge component to load
    await waitFor(() => {
      expect(screen.getByText(/Terminal-Chat Bridge/i)).toBeInTheDocument();
    });
    
    // Find the send to chat button and click it
    const sendToChatButton = screen.getByText(/Send to Chat/i);
    fireEvent.click(sendToChatButton);
    
    // Wait for the command to be sent to chat
    await waitFor(() => {
      const { useChat } = require('@/hooks/useChat');
      expect(useChat().sendMessage).toHaveBeenCalled();
    });
    
    // The chat response should appear
    await waitFor(() => {
      expect(screen.getByText(/I'll help you with/i)).toBeInTheDocument();
    });
  });

  it('sends chat-recommended commands to terminal', async () => {
    render(<TerminalSystemIntegration />);
    
    // Find the chat message with a command recommendation
    const chatMessage = screen.getByText(/You can use the `ls` command/i);
    
    // Find and click the "Run this" button next to the command in the chat
    const runCommandButton = screen.getByText(/Run this/i);
    fireEvent.click(runCommandButton);
    
    // The command should be executed
    await waitFor(() => {
      expect(mockOnExecuteCommand).toHaveBeenCalledWith('ls');
    });
  });

  it('integrates context between terminal and chat', async () => {
    // Mock the context sharing API call
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/terminal/context')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            context: {
              recentCommands: ['npm install', 'git init'],
              currentDirectory: '/home/user/project',
              environmentVariables: { NODE_ENV: 'development' }
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
    
    render(<TerminalSystemIntegration />);
    
    // Find the "Share Context with Chat" button
    const shareContextButton = screen.getByText(/Share Context/i);
    fireEvent.click(shareContextButton);
    
    // Context should be fetched and sent to chat
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/terminal/context'), expect.any(Object));
      
      const { useChat } = require('@/hooks/useChat');
      expect(useChat().sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('recent commands')
      );
    });
    
    // Chat should respond with context-aware suggestions
    await waitFor(() => {
      expect(screen.getByText(/I'll help you with/i)).toBeInTheDocument();
    });
  });
}); 