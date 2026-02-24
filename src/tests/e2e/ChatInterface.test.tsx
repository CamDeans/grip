import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ChatContextProvider } from '@/providers/ChatContextProvider';

// Mock useChat so ChatInterface has controlled state
jest.mock('@/hooks/useChat', () => ({
  useChat: jest.fn(() => ({
    messages: [],
    isLoading: false,
    sendMessage: jest.fn(),
  })),
}));

// Mock the next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  })),
  usePathname: jest.fn(() => '/projects/test-project-id/chat'),
  useParams: jest.fn(() => ({ projectId: 'test-project-id' })),
  useSearchParams: jest.fn(() => new URLSearchParams())
}));

// Mock the useProject hook
jest.mock('@/hooks/useProject', () => ({
  useProject: jest.fn(() => ({
    project: {
      id: 'test-project-id',
      title: 'Test Project',
      description: 'A test project for e2e testing',
      repositoryUrl: 'https://github.com/test/test-repo',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    loading: false,
    error: null
  }))
}));

// Mock the useAnalysis hook
jest.mock('@/hooks/useAnalysis', () => ({
  useAnalysis: jest.fn(() => ({
    analysis: {
      id: 'test-analysis-id',
      projectId: 'test-project-id',
      files: [
        { path: '/src/App.js', content: 'function App() { return <div>Hello World</div>; }' },
        { path: '/src/index.js', content: 'import React from "react"; import ReactDOM from "react-dom";' }
      ],
      dependencies: [
        { name: 'react', version: '^17.0.2' },
        { name: 'react-dom', version: '^17.0.2' }
      ],
      structure: {
        type: 'directory',
        name: 'root',
        children: [
          {
            type: 'directory',
            name: 'src',
            children: [
              { type: 'file', name: 'App.js' },
              { type: 'file', name: 'index.js' }
            ]
          },
          { type: 'file', name: 'package.json' }
        ]
      },
      status: 'completed',
      timestamp: new Date().toISOString()
    },
    loading: false,
    error: null
  }))
}));

// Mock fetch for API calls
global.fetch = jest.fn().mockImplementation((url) => {
  // Mock chat messages
  if (url.includes('/api/chat')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'test-message-id',
        role: 'assistant',
        content: "I've analyzed your project and found that it's a React application. Let me help you with your development.",
        timestamp: new Date().toISOString()
      })
    });
  }
  
  // Mock project files
  if (url.includes('/api/projects/test-project-id/files')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        files: [
          { id: 'file-1', path: '/src/components/Button.jsx', content: 'export function Button({ children }) { return <button>{children}</button>; }' },
          { id: 'file-2', path: '/src/components/Header.jsx', content: 'export function Header({ title }) { return <header>{title}</header>; }' }
        ]
      })
    });
  }
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  });
});

// Create a wrapper to provide context
const ChatInterfaceWithContext = () => {
  return (
    <ChatContextProvider>
      <ChatInterface />
    </ChatContextProvider>
  );
};

describe.skip('Chat Interface End-to-End', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chat interface with project context', async () => {
    render(<ChatInterfaceWithContext />);
    
    // Wait for the chat interface to load with project context
    await waitFor(() => {
      expect(screen.getByText(/Test Project/i)).toBeInTheDocument();
    });
    
    // Verify that project context is displayed
    expect(screen.getByText(/React application/i)).toBeInTheDocument();
  });

  it('sends a message and receives a response', async () => {
    render(<ChatInterfaceWithContext />);
    
    // Wait for the chat interface to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
    });
    
    // Type a message and send it
    const messageInput = screen.getByPlaceholderText(/Type your message/i);
    const sendButton = screen.getByLabelText(/Send message/i);
    
    await act(async () => {
      fireEvent.change(messageInput, { target: { value: 'How do I create a Button component?' } });
      fireEvent.click(sendButton);
    });
    
    // The message should be displayed in the chat
    expect(screen.getByText(/How do I create a Button component?/i)).toBeInTheDocument();
    
    // Wait for the assistant's response
    await waitFor(() => {
      expect(screen.getByText(/I've analyzed your project/i)).toBeInTheDocument();
    });
  });

  it('displays code snippets from the project', async () => {
    render(<ChatInterfaceWithContext />);
    
    // Wait for the chat interface to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
    });
    
    // Type a message asking for code
    const messageInput = screen.getByPlaceholderText(/Type your message/i);
    const sendButton = screen.getByLabelText(/Send message/i);
    
    await act(async () => {
      fireEvent.change(messageInput, { target: { value: 'Show me the Button component code' } });
      fireEvent.click(sendButton);
    });
    
    // Wait for the response with code snippet
    await waitFor(() => {
      expect(screen.getByText(/export function Button/i)).toBeInTheDocument();
    });
  });

  it('integrates with file previews in chat', async () => {
    // Mock the API response with file content
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/chat')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-message-id',
            role: 'assistant',
            content: "Here's the Button component code:\n```jsx\nexport function Button({ children }) { return <button>{children}</button>; }\n```\nWould you like me to explain how it works?",
            timestamp: new Date().toISOString()
          })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
    
    render(<ChatInterfaceWithContext />);
    
    // Wait for the chat interface to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
    });
    
    // Send a message asking for code
    const messageInput = screen.getByPlaceholderText(/Type your message/i);
    const sendButton = screen.getByLabelText(/Send message/i);
    
    await act(async () => {
      fireEvent.change(messageInput, { target: { value: 'Show me the Button component' } });
      fireEvent.click(sendButton);
    });
    
    // Wait for the code snippet to be displayed
    await waitFor(() => {
      expect(screen.getByText(/export function Button/i)).toBeInTheDocument();
    });
    
    // The code snippet should be formatted as a preview
    const codeBlock = screen.getByText(/export function Button/i).closest('pre');
    expect(codeBlock).toHaveClass('language-jsx');
  });

  it('provides project context-aware responses', async () => {
    // Mock a context-aware response
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/chat')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-message-id',
            role: 'assistant',
            content: "Based on your project structure, I can see you're using React. Your App.js file currently renders a simple Hello World component. Would you like me to help you enhance it?",
            timestamp: new Date().toISOString()
          })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
    
    render(<ChatInterfaceWithContext />);
    
    // Wait for the chat interface to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
    });
    
    // Send a message asking about the project
    const messageInput = screen.getByPlaceholderText(/Type your message/i);
    const sendButton = screen.getByLabelText(/Send message/i);
    
    await act(async () => {
      fireEvent.change(messageInput, { target: { value: 'What does my project do?' } });
      fireEvent.click(sendButton);
    });
    
    // Wait for the context-aware response
    await waitFor(() => {
      expect(screen.getByText(/Based on your project structure/i)).toBeInTheDocument();
      expect(screen.getByText(/App.js file currently renders/i)).toBeInTheDocument();
    });
  });

  it('allows attaching files to messages', async () => {
    render(<ChatInterfaceWithContext />);
    
    // Wait for the chat interface to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
    });
    
    // Find the attach file button
    const attachButton = screen.getByLabelText(/Attach file/i);
    
    // Mock the file input change
    const file = new File(['console.log("Hello World")'], 'test.js', { type: 'application/javascript' });
    const fileList = {
      0: file,
      length: 1,
      item: (index: number) => file
    };
    
    // Trigger file selection
    await act(async () => {
      fireEvent.click(attachButton);
      // Mock file input change
      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: fileList } });
    });
    
    // The file should be displayed in the chat input
    await waitFor(() => {
      expect(screen.getByText(/test.js/i)).toBeInTheDocument();
    });
    
    // Send the message with the attached file
    const messageInput = screen.getByPlaceholderText(/Type your message/i);
    const sendButton = screen.getByLabelText(/Send message/i);
    
    await act(async () => {
      fireEvent.change(messageInput, { target: { value: 'Can you review this file?' } });
      fireEvent.click(sendButton);
    });
    
    // Verify that the message with file was sent
    await waitFor(() => {
      expect(screen.getByText(/Can you review this file?/i)).toBeInTheDocument();
      expect(screen.getByText(/test.js/i)).toBeInTheDocument();
    });
  });
}); 