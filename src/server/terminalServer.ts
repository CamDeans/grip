import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { spawn } from 'child_process'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.NEXTAUTH_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
})

io.on('connection', (socket) => {
  console.log('Client connected to terminal')
  let shell: any

  socket.on('start', () => {
    // Use cmd.exe for Windows, or 'bash' for Unix-like systems
    const shellCommand = process.platform === 'win32' ? 'cmd.exe' : 'bash'
    shell = spawn(shellCommand, [], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    shell.stdout.on('data', (data: Buffer) => {
      socket.emit('output', data.toString())
    })

    shell.stderr.on('data', (data: Buffer) => {
      socket.emit('output', data.toString())
    })

    shell.on('exit', (code: number) => {
      socket.emit('exit', code)
    })
  })

  socket.on('input', (data: string) => {
    if (shell && shell.stdin.writable) {
      shell.stdin.write(data + '\n')
    }
  })

  socket.on('resize', () => {
    // Terminal resize logic if needed
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected from terminal')
    if (shell) {
      shell.kill()
    }
  })
})

const PORT = process.env.TERMINAL_PORT || 3002
server.listen(PORT, () => {
  console.log(`Terminal server running on port ${PORT}`)
})

export { app, server }
