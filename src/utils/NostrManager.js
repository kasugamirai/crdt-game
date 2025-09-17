import { generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent } from 'nostr-tools/pure'

class NostrManager {
  constructor(relays = [
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ]) {
    this.relays = relays
    this.pool = new SimplePool()
    this.secretKey = null
    this.publicKey = null
    this.clientId = null
    
    // Game room identifier - using a fixed room for now
    this.gameRoomId = 'plane-battle-room-2025'
    
    // Local state
    this.players = {}
    this.bullets = []
    this.gameState = {}
    this.localPlayerState = null
    
    // Callbacks
    this.onConnectionChangeCallback = null
    this.onPlayersChangeCallback = null
    this.onBulletsChangeCallback = null
    this.onGameStateChangeCallback = null
    
    this.connectionStatus = 'disconnected'
    this.subscriptions = []
    
    // Event cleanup intervals
    this.cleanupInterval = null
    this.heartbeatInterval = null
    
    this.initializeKeys()
  }
  
  initializeKeys() {
    // Generate or load keys from localStorage
    const storedSecretKey = localStorage.getItem('nostr-game-secret-key')
    if (storedSecretKey) {
      this.secretKey = new Uint8Array(JSON.parse(storedSecretKey))
    } else {
      this.secretKey = generateSecretKey()
      localStorage.setItem('nostr-game-secret-key', JSON.stringify(Array.from(this.secretKey)))
    }
    
    this.publicKey = getPublicKey(this.secretKey)
    this.clientId = this.publicKey.slice(-8) // Use last 8 chars as client ID
    console.log('Nostr keys initialized, client ID:', this.clientId)
  }
  
  async connect() {
    try {
      console.log('Connecting to Nostr relays:', this.relays)
      this.connectionStatus = 'connecting'
      
      if (this.onConnectionChangeCallback) {
        this.onConnectionChangeCallback('connecting')
      }
      
      // Subscribe to game events
      await this.subscribeToGameEvents()
      
      // Initialize player
      this.initializePlayer()
      
      // Start heartbeat and cleanup
      this.startHeartbeat()
      this.startCleanup()
      
      this.connectionStatus = 'connected'
      if (this.onConnectionChangeCallback) {
        this.onConnectionChangeCallback('connected')
      }
      
      console.log('Connected to Nostr network')
      
    } catch (error) {
      console.error('Nostr connection failed:', error)
      this.connectionStatus = 'disconnected'
      if (this.onConnectionChangeCallback) {
        this.onConnectionChangeCallback('disconnected')
      }
      throw error
    }
  }
  
  async subscribeToGameEvents() {
    // Subscribe to player state events (kind 1000)
    const playerSub = this.pool.subscribeMany(
      this.relays,
      [{
        kinds: [1000], // Custom kind for player states
        '#t': [this.gameRoomId],
        since: Math.floor(Date.now() / 1000) - 60 // Events from last minute
      }],
      {
        onevent: (event) => this.handlePlayerEvent(event),
        oneose: () => console.log('Player events subscription established')
      }
    )
    
    // Subscribe to bullet events (kind 1001)
    const bulletSub = this.pool.subscribeMany(
      this.relays,
      [{
        kinds: [1001], // Custom kind for bullets
        '#t': [this.gameRoomId],
        since: Math.floor(Date.now() / 1000) - 10 // Bullets from last 10 seconds
      }],
      {
        onevent: (event) => this.handleBulletEvent(event),
        oneose: () => console.log('Bullet events subscription established')
      }
    )
    
    // Subscribe to game state events (kind 1002)
    const gameStateSub = this.pool.subscribeMany(
      this.relays,
      [{
        kinds: [1002], // Custom kind for game state
        '#t': [this.gameRoomId],
        since: Math.floor(Date.now() / 1000) - 300 // Game state from last 5 minutes
      }],
      {
        onevent: (event) => this.handleGameStateEvent(event),
        oneose: () => console.log('Game state events subscription established')
      }
    )
    
    this.subscriptions = [playerSub, bulletSub, gameStateSub]
  }
  
  handlePlayerEvent(event) {
    try {
      const playerData = JSON.parse(event.content)
      const playerId = event.pubkey.slice(-8)
      
      // Update player state
      this.players[playerId] = {
        ...playerData,
        id: playerId,
        pubkey: event.pubkey,
        lastUpdate: event.created_at * 1000
      }
      
      // Trigger callback
      if (this.onPlayersChangeCallback) {
        this.onPlayersChangeCallback(this.players)
      }
      
    } catch (error) {
      console.error('Error handling player event:', error)
    }
  }
  
  handleBulletEvent(event) {
    try {
      const bulletData = JSON.parse(event.content)
      
      // Check if bullet already exists
      const existingIndex = this.bullets.findIndex(b => b.id === bulletData.id)
      if (existingIndex === -1) {
        this.bullets.push({
          ...bulletData,
          createdAt: event.created_at * 1000
        })
        
        // Trigger callback
        if (this.onBulletsChangeCallback) {
          this.onBulletsChangeCallback(this.bullets)
        }
      }
      
    } catch (error) {
      console.error('Error handling bullet event:', error)
    }
  }
  
  handleGameStateEvent(event) {
    try {
      const gameStateData = JSON.parse(event.content)
      this.gameState = { ...this.gameState, ...gameStateData }
      
      if (this.onGameStateChangeCallback) {
        this.onGameStateChangeCallback(this.gameState)
      }
      
    } catch (error) {
      console.error('Error handling game state event:', error)
    }
  }
  
  initializePlayer() {
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
    
    // Publish initial player state
    this.publishPlayerState()
    
    // Initialize game state if needed
    if (!this.gameState.started) {
      this.publishGameState({
        started: true,
        startTime: Date.now()
      })
    }
  }
  
  async publishPlayerState() {
    if (!this.localPlayerState) return
    
    try {
      const event = finalizeEvent({
        kind: 1000,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['t', this.gameRoomId],
          ['p', this.publicKey]
        ],
        content: JSON.stringify(this.localPlayerState)
      }, this.secretKey)
      
      await this.pool.publish(this.relays, event)
      
    } catch (error) {
      console.error('Error publishing player state:', error)
    }
  }
  
  async publishBullet(bulletData) {
    try {
      const bullet = {
        ...bulletData,
        id: `${this.clientId}-${Date.now()}-${Math.random()}`,
        playerId: this.clientId,
        createdAt: Date.now()
      }
      
      const event = finalizeEvent({
        kind: 1001,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['t', this.gameRoomId],
          ['p', this.publicKey]
        ],
        content: JSON.stringify(bullet)
      }, this.secretKey)
      
      await this.pool.publish(this.relays, event)
      
    } catch (error) {
      console.error('Error publishing bullet:', error)
    }
  }
  
  async publishGameState(gameStateData) {
    try {
      const event = finalizeEvent({
        kind: 1002,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['t', this.gameRoomId],
          ['p', this.publicKey]
        ],
        content: JSON.stringify(gameStateData)
      }, this.secretKey)
      
      await this.pool.publish(this.relays, event)
      
    } catch (error) {
      console.error('Error publishing game state:', error)
    }
  }
  
  startHeartbeat() {
    // Send heartbeat every 5 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.localPlayerState) {
        this.localPlayerState.lastUpdate = Date.now()
        this.publishPlayerState()
      }
    }, 5000)
  }
  
  startCleanup() {
    // Cleanup old events every 10 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupBullets()
      this.cleanupOfflinePlayers()
    }, 10000)
  }
  
  // Public API methods matching YjsManager interface
  
  updatePlayer(playerData) {
    if (!this.localPlayerState) return
    
    this.localPlayerState = {
      ...this.localPlayerState,
      ...playerData,
      lastUpdate: Date.now()
    }
    
    this.publishPlayerState()
  }
  
  addBullet(bulletData) {
    this.publishBullet(bulletData)
  }
  
  removeBullet(bulletId) {
    this.bullets = this.bullets.filter(bullet => bullet.id !== bulletId)
    
    if (this.onBulletsChangeCallback) {
      this.onBulletsChangeCallback(this.bullets)
    }
  }
  
  cleanupBullets() {
    const now = Date.now()
    const oldBulletsCount = this.bullets.length
    
    this.bullets = this.bullets.filter(bullet => {
      return now - bullet.createdAt < 10000 // Keep bullets for 10 seconds
    })
    
    if (this.bullets.length !== oldBulletsCount && this.onBulletsChangeCallback) {
      this.onBulletsChangeCallback(this.bullets)
    }
  }
  
  cleanupOfflinePlayers() {
    const now = Date.now()
    const offlineThreshold = 30000 // 30 seconds
    let hasChanges = false
    
    Object.keys(this.players).forEach(playerId => {
      const player = this.players[playerId]
      if (now - player.lastUpdate > offlineThreshold) {
        delete this.players[playerId]
        hasChanges = true
      }
    })
    
    if (hasChanges && this.onPlayersChangeCallback) {
      this.onPlayersChangeCallback(this.players)
    }
  }
  
  damagePlayer(playerId, damage) {
    if (playerId === this.clientId && this.localPlayerState) {
      const newHealth = Math.max(0, this.localPlayerState.health - damage)
      this.localPlayerState.health = newHealth
      this.publishPlayerState()
      
      if (newHealth <= 0) {
        setTimeout(() => {
          this.respawnPlayer()
        }, 2000)
      }
    }
  }
  
  respawnPlayer() {
    if (!this.localPlayerState) return
    
    this.localPlayerState = {
      ...this.localPlayerState,
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100,
      health: 100,
      lastUpdate: Date.now()
    }
    
    this.publishPlayerState()
  }
  
  addScore(points) {
    if (!this.localPlayerState) return
    
    this.localPlayerState.score = (this.localPlayerState.score || 0) + points
    this.publishPlayerState()
    console.log('Score updated to:', this.localPlayerState.score)
  }
  
  getAllPlayers() {
    return this.players
  }
  
  getAllBullets() {
    return this.bullets
  }
  
  getGameState() {
    return this.gameState
  }
  
  getClientId() {
    return this.clientId
  }
  
  getOnlinePlayerCount() {
    return Object.keys(this.players).length
  }
  
  // Event listeners
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
    console.log('Disconnecting from Nostr network')
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    // Close subscriptions
    this.subscriptions.forEach(sub => {
      sub.close()
    })
    this.subscriptions = []
    
    // Close pool
    this.pool.close(this.relays)
    
    this.connectionStatus = 'disconnected'
    if (this.onConnectionChangeCallback) {
      this.onConnectionChangeCallback('disconnected')
    }
  }
}

export default NostrManager
