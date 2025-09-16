class WebSocketAdapter {
  constructor(url) {
    this.url = url
    this.ws = null
    this.onOpenCallbacks = []
    this.onMessageCallbacks = []
    this.onCloseCallbacks = []
    this.onErrorCallbacks = []
  }
  
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
        
        this.ws.onopen = (event) => {
          console.log('WebSocket connection established')
          this.onOpenCallbacks.forEach(callback => callback(event))
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          this.onMessageCallbacks.forEach(callback => callback(event))
        }
        
        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed')
          this.onCloseCallbacks.forEach(callback => callback(event))
        }
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.onErrorCallbacks.forEach(callback => callback(error))
          reject(error)
        }
        
      } catch (error) {
        reject(error)
      }
    })
  }
  
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }
  
  close() {
    if (this.ws) {
      this.ws.close()
    }
  }
  
  onOpen(callback) {
    this.onOpenCallbacks.push(callback)
  }
  
  onMessage(callback) {
    this.onMessageCallbacks.push(callback)
  }
  
  onClose(callback) {
    this.onCloseCallbacks.push(callback)
  }
  
  onError(callback) {
    this.onErrorCallbacks.push(callback)
  }
  
  get readyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED
  }
}

export default WebSocketAdapter

