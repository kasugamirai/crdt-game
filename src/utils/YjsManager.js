import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import * as awarenessProtocol from 'y-protocols/awareness'

class YjsManager {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.doc = new Y.Doc()
    this.provider = null
    this.awareness = null
    this.clientId = null
    
    this.players = this.doc.getMap('players')
    this.bullets = this.doc.getArray('bullets')
    this.gameState = this.doc.getMap('gameState')
    
    this.onConnectionChangeCallback = null
    this.onPlayersChangeCallback = null
    this.onBulletsChangeCallback = null
    this.onGameStateChangeCallback = null
    this.onAwarenessChangeCallback = null
    
    this.connectionStatus = 'disconnected'
    this.localPlayerState = null
  }
  
  async connect() {
    try {
      this.provider = new WebsocketProvider(this.wsUrl, 'game-room', this.doc)
      this.awareness = this.provider.awareness
      
      this.provider.on('status', (event) => {
        console.log('WebSocket status:', event.status)
        this.connectionStatus = event.status
        if (this.onConnectionChangeCallback) {
          this.onConnectionChangeCallback(event.status)
        }
      })
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 5000)
        
        const onSynced = () => {
          clearTimeout(timeout)
          this.clientId = this.awareness.clientID.toString()
          console.log('Yjs synced, client ID:', this.clientId)
          resolve()
        }
        
        if (this.provider.synced) {
          onSynced()
        } else {
          this.provider.on('synced', onSynced)
        }
      })
      
      this.setupListeners()
      this.initializePlayer()
      
    } catch (error) {
      console.error('Yjs connection failed:', error)
      throw error
    }
  }
  
  setupListeners() {
    this.awareness.on('change', () => {
      if (this.onAwarenessChangeCallback) {
        const states = {}
        this.awareness.getStates().forEach((state, clientId) => {
          if (state.player) {
            states[clientId] = state.player
          }
        })
        this.onAwarenessChangeCallback(states)
      }
      
      if (this.onPlayersChangeCallback) {
        const states = {}
        this.awareness.getStates().forEach((state, clientId) => {
          if (state.player) {
            states[clientId] = state.player
          }
        })
        this.onPlayersChangeCallback(states)
      }
    })
    
    this.bullets.observe((event) => {
      if (this.onBulletsChangeCallback) {
        this.onBulletsChangeCallback(this.bullets.toArray())
      }
    })
    
    this.gameState.observe((event) => {
      if (this.onGameStateChangeCallback) {
        const gameStateData = {}
        this.gameState.forEach((value, key) => {
          gameStateData[key] = value
        })
        this.onGameStateChangeCallback(gameStateData)
      }
    })
    
    window.addEventListener('beforeunload', () => {
      this.disconnect()
    })
  }
  
  initializePlayer() {
    if (!this.clientId || !this.awareness) return
    
    this.localPlayerState = {
      id: this.clientId,
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100,
      rotation: 0,
      health: 100,
      score: 0,
      lastUpdate: Date.now(),
      isActive: true
    }
    
    this.awareness.setLocalStateField('player', this.localPlayerState)
    
    if (!this.gameState.has('started')) {
      this.gameState.set('started', true)
      this.gameState.set('startTime', Date.now())
    }
  }
  
  updatePlayer(playerData) {
    if (!this.clientId || !this.awareness) return
    
    this.localPlayerState = {
      ...this.localPlayerState,
      ...playerData,
      lastUpdate: Date.now()
    }
    
    this.awareness.setLocalStateField('player', this.localPlayerState)
  }
  
  addBullet(bulletData) {
    const bullet = {
      id: `${this.clientId}-${Date.now()}-${Math.random()}`,
      playerId: this.clientId,
      x: bulletData.x,
      y: bulletData.y,
      vx: bulletData.vx,
      vy: bulletData.vy,
      createdAt: Date.now()
    }
    
    this.bullets.push([bullet])
  }
  
  removeBullet(bulletId) {
    const bullets = this.bullets.toArray()
    const index = bullets.findIndex(bullet => bullet.id === bulletId)
    if (index !== -1) {
      this.bullets.delete(index, 1)
    }
  }
  
  cleanupBullets() {
    const now = Date.now()
    const bullets = this.bullets.toArray()
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i]
      if (now - bullet.createdAt > 5000) {
        this.bullets.delete(i, 1)
      }
    }
  }
  
  damagePlayer(playerId, damage) {
    if (playerId === this.clientId && this.localPlayerState) {
      const newHealth = Math.max(0, this.localPlayerState.health - damage)
      this.localPlayerState.health = newHealth
      this.awareness.setLocalStateField('player', this.localPlayerState)
      
      if (newHealth <= 0) {
        setTimeout(() => {
          this.respawnPlayer()
        }, 2000)
      }
    }
  }
  
  respawnPlayer() {
    if (!this.clientId || !this.localPlayerState) return
    
    this.localPlayerState = {
      ...this.localPlayerState,
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100,
      health: 100,
      lastUpdate: Date.now()
    }
    
    this.awareness.setLocalStateField('player', this.localPlayerState)
  }
  
  addScore(points) {
    if (!this.clientId || !this.localPlayerState) return
    
    this.localPlayerState.score = (this.localPlayerState.score || 0) + points
    this.awareness.setLocalStateField('player', this.localPlayerState)
  }
  
  getAllPlayers() {
    const playersData = {}
    if (this.awareness) {
      this.awareness.getStates().forEach((state, clientId) => {
        if (state.player) {
          playersData[clientId] = state.player
        }
      })
    }
    return playersData
  }
  
  getAllBullets() {
    return this.bullets.toArray()
  }
  
  getGameState() {
    const gameStateData = {}
    this.gameState.forEach((value, key) => {
      gameStateData[key] = value
    })
    return gameStateData
  }
  
  getClientId() {
    return this.clientId
  }
  
  onConnectionChange(callback) {
    this.onConnectionChangeCallback = callback
  }
  
  onPlayersChange(callback) {
    this.onPlayersChangeCallback = callback
  }
  
  onAwarenessChange(callback) {
    this.onAwarenessChangeCallback = callback
  }
  
  getOnlinePlayerCount() {
    if (!this.awareness) return 0
    return Array.from(this.awareness.getStates().values()).filter(state => state.player).length
  }
  
  onBulletsChange(callback) {
    this.onBulletsChangeCallback = callback
  }
  
  onGameStateChange(callback) {
    this.onGameStateChangeCallback = callback
  }
  
  disconnect() {
    if (this.awareness && this.localPlayerState) {
      this.localPlayerState.isActive = false
      this.awareness.setLocalStateField('player', this.localPlayerState)
    }
    
    if (this.provider) {
      this.provider.destroy()
    }
  }
  
  cleanupOfflinePlayers() {
  }
}

export default YjsManager

