import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

// Define configurable options for the WebSocket hook
interface WebSocketOptions {
  url?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
  onMessage?: (message: any) => void;
}

// Support both string projectId and options object
export function useWebSocket(projectIdOrOptions: string | WebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const socketRef = useRef<Socket | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const hasLoggedDisabled = useRef<boolean>(false)
  // Only connect when a WebSocket server URL is explicitly set (no Socket.IO server on Next/Vercel by default)
  const shouldTryToConnect = useRef<boolean>(
    process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true' && !!process.env.NEXT_PUBLIC_WEBSOCKET_URL
  )

  // Extract options based on input type
  const isStringProjectId = typeof projectIdOrOptions === 'string'
  const projectId = isStringProjectId ? projectIdOrOptions : ''
  const options = isStringProjectId ? {} : projectIdOrOptions
  
  // Handle custom callbacks from options
  const onOpenRef = useRef(options.onOpen)
  const onCloseRef = useRef(options.onClose)
  const onErrorRef = useRef(options.onError)
  const onMessageRef = useRef(options.onMessage)
  
  // Update callback refs when options change
  useEffect(() => {
    if (!isStringProjectId) {
      onOpenRef.current = options.onOpen
      onCloseRef.current = options.onClose
      onErrorRef.current = options.onError
      onMessageRef.current = options.onMessage
    }
  }, [isStringProjectId, options])

  // Listen for reconnect events
  useEffect(() => {
    const handleReconnectEvent = () => {
      console.log('Received reconnect event')
      // Attempt to reconnect if we have a socket
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current.connect()
      }
    }
    
    window.addEventListener('grip:reconnect-websocket', handleReconnectEvent)
    
    return () => {
      window.removeEventListener('grip:reconnect-websocket', handleReconnectEvent)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') && !process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
      shouldTryToConnect.current = false
    }

    if (!shouldTryToConnect.current) {
      if (!hasLoggedDisabled.current) {
        console.log('WebSocket connections are disabled via environment variable')
        hasLoggedDisabled.current = true
      }
      return
    }

    // Don't try to reconnect after a connection refused error
    if (connectionError === 'ECONNREFUSED') {
      if (!hasLoggedDisabled.current) {
        console.log('WebSocket server is unavailable, not attempting to reconnect')
        hasLoggedDisabled.current = true
      }
      return
    }

    // Clear previous error when attempting a new connection
    setConnectionError(null)

    // Initialize socket connection
    try {
      let wsUrl: string
      
      // Use custom URL if provided in options
      if (!isStringProjectId && options.url) {
        wsUrl = options.url
      } else {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        // Default to port 3001 for WebSockets, different from the main app (3000)
        const wsPort = process.env.NEXT_PUBLIC_WS_PORT || '3001'
        wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 
          process.env.NEXT_PUBLIC_VERCEL_URL || 
          `${wsProtocol}//${window.location.hostname}:${wsPort}`
      }
      
      if (!hasLoggedDisabled.current) {
        console.log(`Connecting to WebSocket at: ${wsUrl}`)
      }
      
      socketRef.current = io(wsUrl, {
        query: isStringProjectId ? { projectId } : undefined,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        autoConnect: true
      })

      // Set up event listeners
      socketRef.current.on('connect', () => {
        if (!hasLoggedDisabled.current) {
          console.log('WebSocket connected')
          hasLoggedDisabled.current = true
        }
        setIsConnected(true)
        setConnectionError(null)
        
        // Call custom onOpen handler if provided
        if (onOpenRef.current) {
          onOpenRef.current()
        }
      })

      socketRef.current.on('disconnect', () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        
        // Call custom onClose handler if provided
        if (onCloseRef.current) {
          onCloseRef.current()
        }
      })

      socketRef.current.on('connect_error', (error) => {
        if (!hasLoggedDisabled.current) {
          console.warn('WebSocket connection error:', error.message)
          hasLoggedDisabled.current = true
        }
        setConnectionError(error.message)
        
        // Permanently disable connection attempts if the server is unreachable
        if (error.message === 'xhr poll error' || error.message.includes('ECONNREFUSED')) {
          shouldTryToConnect.current = false
          setConnectionError('ECONNREFUSED')
          
          // Disconnect to prevent further automatic reconnection attempts
          if (socketRef.current) {
            socketRef.current.disconnect()
          }
        }
        
        setIsConnected(false)
        
        // Call custom onError handler if provided
        if (onErrorRef.current) {
          onErrorRef.current()
        }
      })
      
      // Handle incoming messages
      socketRef.current.on('message', (message) => {
        setLastMessage(message)
        
        // Call custom onMessage handler if provided
        if (onMessageRef.current) {
          onMessageRef.current(message)
        }
      })

      // Cleanup on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect()
          socketRef.current = null
        }
      }
    } catch (error) {
      if (!hasLoggedDisabled.current) {
        console.error('Error initializing WebSocket:', error)
        hasLoggedDisabled.current = true
      }
      setIsConnected(false)
      setConnectionError(error instanceof Error ? error.message : 'Unknown error')
      shouldTryToConnect.current = false
      
      // Call custom onError handler if provided
      if (onErrorRef.current) {
        onErrorRef.current()
      }
    }
  }, [projectId, connectionError, isStringProjectId, options])

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    lastMessage
  }
} 