import { Server as SocketIOServer } from 'socket.io'
import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { spawn } from 'child_process'

let io: SocketIOServer

export async function GET(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!io) {
      const server = (req as any).socket.server
      io = new SocketIOServer(server)

      io.on('connection', (socket) => {
        const shell = spawn(process.platform === 'win32' ? 'powershell.exe' : 'bash')

        shell.stdout.on('data', (data) => {
          socket.emit('output', data.toString())
        })

        shell.stderr.on('data', (data) => {
          socket.emit('output', data.toString())
        })

        socket.on('input', (data) => {
          shell.stdin.write(data)
        })

        socket.on('disconnect', () => {
          shell.kill()
        })
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Socket error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 
