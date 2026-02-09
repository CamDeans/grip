import { NextResponse } from 'next/server'

interface ChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// Mock chat history data for demo project
const mockChatHistory: ChatMessage[] = []

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  // If this is the demo project, return mock data (empty history to start)
  if (id === 'demo-project-123') {
    return NextResponse.json(mockChatHistory)
  }
  
  // For other IDs, return an empty array
  return NextResponse.json([])
} 