import { Server } from 'socket.io'
import { NextApiResponse } from 'next'
import { NextRequest } from 'next/server'

const io = new Server({
  path: '/api//socket',
  addTrailingSlash: false,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('command', async (data) => {
    try {
      const { command, cwd } = data
      
      // Handle basic commands
      if (command === 'pwd') {
        socket.emit('output', { output: cwd })
        return
      }

      if (command === 'ls' || command === 'dir') {
        socket.emit('output', { 
          output: 'Directory listing functionality available in project explorer' 
        })
        return
      }

      if (command.startsWith('cd ')) {
        const newPath = command.slice(3).trim()
        socket.emit('output', {
          output: `Changed directory to: ${newPath}`,
          newCwd: newPath
        })
        return
      }

      // For other commands, respond with guidance
      socket.emit('output', {
        output: `Command '${command}' will be handled by the project's build system`
      })
    } catch (error) {
      console.error('Error handling command:', error)
      socket.emit('error', { 
        error: error instanceof Error ? error.message : 'Command execution failed' 
      })
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const preferredRegion = 'auto'

export function GET(_req: NextRequest, res: NextApiResponse) {
  // @ts-ignore - NextJS types don't include socket
  if (!res.socket.server.io) {
    // @ts-ignore - NextJS types don't include socket
    res.socket.server.io = io
  }

  res.end()
} 
