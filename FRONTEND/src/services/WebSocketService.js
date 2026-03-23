class WebSocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.listeners = {}
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectTimeout = null
    this.messageQueue = []
    this.vendorId = null
    this.counterId = null

    // WebSocket URL - matches backend server port
    // Prefer env override if provided via Vite
    const wsFromEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL
    this.serverUrl = wsFromEnv || 'ws://localhost:8000'
  }

  // Decide whether to use real WebSocket or simulation
  shouldUseRealWS() {
    try {
      const env = typeof import.meta !== 'undefined' ? import.meta.env : {}
      const flag = env && env.VITE_ENABLE_WS
      // Allow query override ?ws=off to force simulation
      const params = new URLSearchParams(window.location.search)
      if (params.get('ws') === 'off') return false
      if (params.get('ws') === 'on') return true
      // Default to simulation unless explicitly enabled
      return flag === 'true'
    } catch {
      return false
    }
  }

  // Initialize WebSocket connection
  connect(vendorId, counterId) {
    // Avoid reconnecting if already connected with same parameters
    if (this.isConnected && this.vendorId === vendorId && this.counterId === counterId) {
      console.log('WebSocket already connected with same parameters')
      return this
    }

    // Disconnect if connected with different parameters
    if (this.isConnected) {
      this.disconnect()
    }

    this.vendorId = vendorId
    this.counterId = counterId
    
    console.log(`Connecting to WebSocket for vendor ${vendorId}, counter ${counterId}...`)
    
    // If real WS not enabled, immediately switch to simulation
    if (!this.shouldUseRealWS()) {
      this.fallbackToSimulation(vendorId, counterId)
      return this
    }

    try {
      // Create actual WebSocket connection
      this.socket = new WebSocket(`${this.serverUrl}?vendorId=${vendorId}&counterId=${counterId}`)
      
      // Connection opened
      this.socket.onopen = () => {
        console.log('WebSocket connected successfully')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.notifyListeners('connect', { connected: true })

        // Start heartbeat to keep connection alive
        this.startHeartbeat()

        // Send authentication/registration message
        this.sendAuthMessage(vendorId, counterId)

        // Send queued messages
        this.processMessageQueue()
      }

      // Message received
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('WebSocket message received:', data)
          this.handleIncomingMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      // Connection closed
      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason)
        this.isConnected = false
        this.socket = null
        this.stopHeartbeat()
        this.notifyListeners('disconnect', { connected: false })

        // If server doesn't support WS (e.g., immediate close or abnormal close), fall back to simulation
        if (event.code === 1006 || event.code === 1005 || event.code === 1001) {
          console.warn('WebSocket closed abnormally, falling back to simulation')
          this.fallbackToSimulation(vendorId, counterId)
          return
        }

        // Auto-reconnect unless it was a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(vendorId, counterId)
        }
      }

      // Connection error
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.notifyListeners('error', { error })
        // Immediately fall back if connection cannot be established
        if (!this.isConnected) {
          console.warn('WebSocket connection failed, switching to simulation mode')
          this.fallbackToSimulation(vendorId, counterId)
        }
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      
      // If WebSocket creation fails, fall back to simulation mode
      console.log('Falling back to simulation mode...')
      this.fallbackToSimulation(vendorId, counterId)
    }

    return this
  }

  // Fallback to simulation if real WebSocket fails
  fallbackToSimulation(vendorId, counterId) {
    console.log('Running in simulation mode (no real WebSocket server)')
    
    setTimeout(() => {
      this.isConnected = true
      this.reconnectAttempts = 0
      this.notifyListeners('connect', { connected: true, simulation: true })
      console.log('WebSocket simulation connected')
      
      // Process queued messages in simulation
      this.processMessageQueue()
    }, 500)
  }

  // Send authentication message to server
  sendAuthMessage(vendorId, counterId) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const authMessage = {
        type: 'auth',
        data: {
          vendorId,
          counterId,
          timestamp: Date.now()
        }
      }
      this.socket.send(JSON.stringify(authMessage))
    }
  }

  // Process queued messages
  processMessageQueue() {
    if (this.messageQueue.length > 0) {
      console.log(`Processing ${this.messageQueue.length} queued messages`)
      this.messageQueue.forEach(({ eventType, data }) => {
        this._send(eventType, data)
      })
      this.messageQueue = []
    }
  }

  // Schedule reconnection
  scheduleReconnect(vendorId, counterId) {
    this.reconnectAttempts++
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 30000) // Exponential backoff, max 30s
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(vendorId, counterId)
    }, delay)
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.stopHeartbeat()

    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect') // Clean close
      this.socket = null
    }

    this.isConnected = false
    this.reconnectAttempts = 0
    console.log('WebSocket disconnected manually')
    return this
  }

  // Handle incoming WebSocket messages
  handleIncomingMessage(data) {
    const { type, payload } = data
    
    switch (type) {
      case 'token_generated':
        this.notifyListeners('new_token', payload)
        break
      case 'token_updated':
        this.notifyListeners('token_updated', payload)
        break
      case 'token_completed':
        this.notifyListeners('token_completed', payload)
        break
      case 'token_transferred':
        this.notifyListeners('token_transferred', payload)
        break
      case 'counter_status':
        this.notifyListeners('counter_status', payload)
        break
      case 'emergency_alert':
        this.notifyListeners('emergency_announcement', payload)
        break
      case 'pong':
        console.log('Received pong from server')
        break
      default:
        console.log('Unknown message type:', type)
        this.notifyListeners(type, payload)
    }

    // Handle emergency tokens
    if (type === 'token_generated' && payload.token && payload.token.type === 'red') {
      this.notifyListeners('emergency_announcement', {
        message: `URGENT: Emergency token ${payload.token.id} in queue - all counters alert`,
        token: payload.token
      })
    }
  }

  // Subscribe to events
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
    return this
  }

  // Unsubscribe from events
  off(event, callback) {
    if (!this.listeners[event]) return this
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
    return this
  }

  // Notify all listeners of an event
  notifyListeners(event, data) {
    if (!this.listeners[event]) return

    this.listeners[event].forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in WebSocket listener:', error)
      }
    })
  }

  // Send message to WebSocket server
  send(eventType, data) {
    if (!this.isConnected) {
      console.warn('WebSocket not connected, queuing message:', eventType)
      this.messageQueue.push({ eventType, data })
      return false
    }
    
    return this._send(eventType, data)
  }

  // Internal send method
  _send(eventType, data) {
    try {
      const message = {
        type: eventType,
        payload: data,
        timestamp: Date.now(),
        vendorId: this.vendorId,
        counterId: this.counterId
      }

      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Real WebSocket send
        this.socket.send(JSON.stringify(message))
        console.log(`Sent ${eventType} via WebSocket:`, data)
        return true
      } else {
        // Simulation mode
        console.log(`Simulating ${eventType} event:`, data)
        this.simulateServerResponse(eventType, data)
        return true
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error)
      return false
    }
  }

  // Simulate server responses (for when real server is not available)
  simulateServerResponse(eventType, data) {
    const delays = {
      token_generated: 1000,
      token_transfer: 800,
      token_completed: 500
    }

    const delay = delays[eventType] || 1000

    setTimeout(() => {
      if (eventType === 'token_generated') {
        this.handleIncomingMessage({
          type: 'token_generated',
          payload: { token: data.token, success: true }
        })
      } else if (eventType === 'token_transfer') {
        this.handleIncomingMessage({
          type: 'token_transferred',
          payload: data
        })
      } else if (eventType === 'token_completed') {
        this.handleIncomingMessage({
          type: 'token_completed',
          payload: data
        })
      }
    }, delay)
  }

  // Connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.messageQueue.length,
      vendorId: this.vendorId,
      counterId: this.counterId
    }
  }

  // Send heartbeat to keep connection alive
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'ping',
          payload: { timestamp: Date.now() }
        }))
      }
    }, 30000) // Send ping every 30 seconds
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Get detailed connection status
  getDetailedStatus() {
    return {
      isConnected: this.isConnected,
      vendorId: this.vendorId,
      counterId: this.counterId,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      messageQueueLength: this.messageQueue.length,
      serverUrl: this.serverUrl,
      socketState: this.socket ? this.socket.readyState : null,
      heartbeatActive: !!this.heartbeatInterval
    }
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService()

export default webSocketService
