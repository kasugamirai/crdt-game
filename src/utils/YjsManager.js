import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

class YjsManager {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.doc = new Y.Doc()
    this.provider = null
    this.clientId = null
    
    this.players = this.doc.getMap('players')
    this.bullets = this.doc.getArray('bullets')
    this.gameState = this.doc.getMap('gameState')
    
    this.onConnectionChangeCallback = null
    this.onPlayersChangeCallback = null
    this.onBulletsChangeCallback = null
    this.onGameStateChangeCallback = null
    
    this.connectionStatus = 'disconnected'
  }
  
  async connect() {
    try {
      this.provider = new WebsocketProvider(this.wsUrl, 'game-room', this.doc)
      
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
        
        this.provider.on('synced', () => {
          clearTimeout(timeout)
          this.clientId = this.doc.clientID.toString()
          console.log('Yjs synced, client ID:', this.clientId)
          resolve()
        })
      })
      
      this.setupListeners()
      this.initializePlayer()
      
    } catch (error) {
      console.error('Yjs connection failed:', error)
      throw error
    }
  }
  
  setupListeners() {
    this.players.observe((event) => {
      if (this.onPlayersChangeCallback) {
        const playersData = {}
        this.players.forEach((value, key) => {
          playersData[key] = value
        })
        this.onPlayersChangeCallback(playersData)
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
  }
  
  initializePlayer() {
    if (!this.clientId) return
    
    const playerData = {
      id: this.clientId,
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100,
      rotation: 0,
      health: 100,
      score: 0,
      lastUpdate: Date.now(),
      isActive: true
    }
    
    this.players.set(this.clientId, playerData)
    
    if (!this.gameState.has('started')) {
      this.gameState.set('started', true)
      this.gameState.set('startTime', Date.now())
    }
  }
  
  updatePlayer(playerData) {
    if (!this.clientId) return
    
    const currentPlayer = this.players.get(this.clientId) || {}
    const updatedPlayer = {
      ...currentPlayer,
      ...playerData,
      lastUpdate: Date.now()
    }
    
    this.players.set(this.clientId, updatedPlayer)
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
    const player = this.players.get(playerId)
    if (player) {
      const newHealth = Math.max(0, player.health - damage)
      this.players.set(playerId, { ...player, health: newHealth })
      
      if (playerId === this.clientId && newHealth <= 0) {
        setTimeout(() => {
          this.respawnPlayer()
        }, 2000)
      }
    }
  }
  
  respawnPlayer() {
    if (!this.clientId) return
    
    const player = this.players.get(this.clientId)
    if (player) {
      this.players.set(this.clientId, {
        ...player,
        x: Math.random() * 800 + 100,
        y: Math.random() * 600 + 100,
        health: 100,
        lastUpdate: Date.now()
      })
    }
  }
  
  addScore(points) {
    if (!this.clientId) return
    
    const player = this.players.get(this.clientId)
    if (player) {
      this.players.set(this.clientId, {
        ...player,
        score: (player.score || 0) + points
      })
    }
  }
  
  getAllPlayers() {
    const playersData = {}
    this.players.forEach((value, key) => {
      playersData[key] = value
    })
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
  
  onBulletsChange(callback) {
    this.onBulletsChangeCallback = callback
  }
  
  onGameStateChange(callback) {
    this.onGameStateChangeCallback = callback
  }
  
  disconnect() {
    if (this.clientId) {
      const player = this.players.get(this.clientId)
      if (player) {
        this.players.set(this.clientId, { ...player, isActive: false })
      }
    }
    
    if (this.provider) {
      this.provider.destroy()
    }
  }
  
  cleanupOfflinePlayers() {
    const now = Date.now()
    const playersToRemove = []
    
    this.players.forEach((player, playerId) => {
      if (!player.isActive || (now - player.lastUpdate > 10000)) {
        playersToRemove.push(playerId)
      }
    })
    
    playersToRemove.forEach(playerId => {
      this.players.delete(playerId)
    })
  }
}

export default YjsManager

