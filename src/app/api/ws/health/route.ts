import { NextResponse } from 'next/server';

/**
 * WebSocket health check endpoint
 * This route returns the status of the WebSocket server
 * 
 * @route GET /api/ws/health
 */
export async function GET() {
  try {
    // Environment flags to control WebSocket availability
    const wsEnabled = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true';
    const wsDisabled = process.env.NEXT_PUBLIC_DISABLE_WEBSOCKETS === 'true';
    
    // Determine final status based on environment variables
    const status = wsDisabled ? 'disabled' : (wsEnabled ? 'active' : 'disabled');
    
    // Create response message based on status
    const message = status === 'active' 
      ? 'WebSocket server is running' 
      : 'WebSocket is disabled via environment variables';
    
    // Return health status
    return NextResponse.json({ 
      status,
      message,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    // Handle any unexpected errors
    console.error('Error in WebSocket health check:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check WebSocket health',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 