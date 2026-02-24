import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Only run for terminal WebSocket upgrade so we don't touch enhanced-chat, files, or other API routes.
// Running middleware on all /api/ can interfere with streaming or body parsing on some hosts.
export function middleware(request: NextRequest) {
  if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    return NextResponse.next()
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/terminal/:path*'],
} 
