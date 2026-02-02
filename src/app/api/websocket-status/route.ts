import { NextResponse } from 'next/server';

export async function GET() {
  // Check whether WebSockets are disabled based on environment variables
  const websocketsDisabled = process.env.DISABLE_WEBSOCKETS === 'true' || 
                            process.env.NEXT_PUBLIC_DISABLE_WEBSOCKETS === 'true';
  
  return NextResponse.json({ 
    enabled: !websocketsDisabled,
    message: websocketsDisabled ? 'WebSocket connections are disabled via environment variable' : 'WebSocket connections are enabled'
  });
} 