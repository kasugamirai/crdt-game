class GameEngine {
  constructor(canvas, yjsManager) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.yjsManager = yjsManager
    
    this.isRunning = false
    this.lastTime = 0
    
    this.width = 0
    this.height = 0
    
    this.players = {}
    this.bullets = []
    this.explosions = []
    
    this.lastShootTime = 0
    this.shootCooldown = 200
    
    this.PLAYER_SPEED = 300
    this.BULLET_SPEED = 500
    this.PLAYER_SIZE = 20
    this.BULLET_SIZE = 4
    
    this.setupCanvas()
    this.setupEventListeners()
  }
  
  setupCanvas() {
    this.resizeCanvas()
    window.addEventListener('resize', () => this.resizeCanvas())
    
    this.ctx.imageSmoothingEnabled = true
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
  }
  
  resizeCanvas() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height
  }
  
  setupEventListeners() {
    this.yjsManager.onPlayersChange((players) => {
      this.players = players
    })
    
    this.yjsManager.onBulletsChange((bullets) => {
      this.bullets = bullets
    })
  }
  
  start() {
    this.isRunning = true
    this.lastTime = performance.now()
  }
  
  stop() {
    this.isRunning = false
  }
  
  update(input) {
    if (!this.isRunning) return
    
    const currentTime = performance.now()
    const deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime
    
    this.updateCurrentPlayer(input, deltaTime)
    this.updateBullets(deltaTime)
    this.updateExplosions(deltaTime)
    this.checkCollisions()
    this.cleanup()
  }
  
  updateCurrentPlayer(input, deltaTime) {
    const playerId = this.yjsManager.getClientId()
    if (!playerId) return
    
    const player = this.players[playerId]
    if (!player || player.health <= 0) return
    
    let newX = player.x
    let newY = player.y
    let newRotation = player.rotation
    
    if (input.up) newY -= this.PLAYER_SPEED * deltaTime
    if (input.down) newY += this.PLAYER_SPEED * deltaTime
    if (input.left) {
      newX -= this.PLAYER_SPEED * deltaTime
      newRotation = -90
    }
    if (input.right) {
      newX += this.PLAYER_SPEED * deltaTime
      newRotation = 90
    }
    
    newX = Math.max(this.PLAYER_SIZE, Math.min(this.width - this.PLAYER_SIZE, newX))
    newY = Math.max(this.PLAYER_SIZE, Math.min(this.height - this.PLAYER_SIZE, newY))
    
    if (input.shoot) {
      this.handleShooting(newX, newY, newRotation)
    }
    
    if (newX !== player.x || newY !== player.y || newRotation !== player.rotation) {
      this.yjsManager.updatePlayer({
        x: newX,
        y: newY,
        rotation: newRotation
      })
    }
  }
  
  handleShooting(x, y, rotation) {
    const now = Date.now()
    if (now - this.lastShootTime < this.shootCooldown) return
    
    this.lastShootTime = now
    
    let vx = 0, vy = -this.BULLET_SPEED
    
    if (rotation === -90) {
      vx = -this.BULLET_SPEED
      vy = 0
    } else if (rotation === 90) {
      vx = this.BULLET_SPEED
      vy = 0
    }
    
    this.yjsManager.addBullet({
      x: x,
      y: y - this.PLAYER_SIZE,
      vx: vx,
      vy: vy
    })
  }
  
  updateBullets(deltaTime) {
    this.bullets.forEach(bullet => {
      bullet.x += bullet.vx * deltaTime
      bullet.y += bullet.vy * deltaTime
    })
    
    this.bullets = this.bullets.filter(bullet => {
      const inBounds = bullet.x >= 0 && bullet.x <= this.width && 
                     bullet.y >= 0 && bullet.y <= this.height
      
      if (!inBounds) {
        this.yjsManager.removeBullet(bullet.id)
      }
      
      return inBounds
    })
  }
  
  updateExplosions(deltaTime) {
    this.explosions = this.explosions.filter(explosion => {
      explosion.time += deltaTime
      explosion.scale = Math.min(2, explosion.time * 4)
      explosion.alpha = Math.max(0, 1 - explosion.time * 2)
      return explosion.time < 0.5
    })
  }
  
  checkCollisions() {
    const playerId = this.yjsManager.getClientId()
    
    this.bullets.forEach(bullet => {
      Object.values(this.players).forEach(player => {
        if (bullet.playerId === player.id || player.health <= 0) return
        
        const dx = bullet.x - player.x
        const dy = bullet.y - player.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < this.PLAYER_SIZE) {
          this.createExplosion(player.x, player.y)
          
          if (player.id === playerId) {
            this.yjsManager.damagePlayer(playerId, 20)
          }
          
          if (bullet.playerId === playerId) {
            this.yjsManager.addScore(10)
          }
          
          this.yjsManager.removeBullet(bullet.id)
        }
      })
    })
  }
  
  createExplosion(x, y) {
    this.explosions.push({
      x: x,
      y: y,
      time: 0,
      scale: 0,
      alpha: 1
    })
  }
  
  cleanup() {
    if (Math.random() < 0.01) {
      this.yjsManager.cleanupBullets()
      this.yjsManager.cleanupOfflinePlayers()
    }
  }
  
  render() {
    if (!this.isRunning) return
    
    this.ctx.fillStyle = 'rgba(12, 20, 69, 0.1)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    this.renderStars()
    this.renderPlayers()
    this.renderBullets()
    this.renderExplosions()
  }
  
  renderStars() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    
    const time = Date.now() * 0.0001
    for (let i = 0; i < 100; i++) {
      const x = (Math.sin(i * 0.1 + time) * 0.5 + 0.5) * this.width
      const y = (Math.cos(i * 0.1 + time * 0.7) * 0.5 + 0.5) * this.height
      const size = Math.sin(i * 0.5 + time * 2) * 0.5 + 1
      
      this.ctx.beginPath()
      this.ctx.arc(x, y, size, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }
  
  renderPlayers() {
    const currentPlayerId = this.yjsManager.getClientId()
    
    Object.values(this.players).forEach(player => {
      if (player.health <= 0) return
      
      this.ctx.save()
      this.ctx.translate(player.x, player.y)
      this.ctx.rotate((player.rotation || 0) * Math.PI / 180)
      
      if (player.id === currentPlayerId) {
        this.ctx.fillStyle = '#2196F3'
        this.ctx.shadowColor = '#2196F3'
        this.ctx.shadowBlur = 15
      } else {
        this.ctx.fillStyle = '#f44336'
        this.ctx.shadowColor = '#f44336'
        this.ctx.shadowBlur = 10
      }
      
      this.ctx.beginPath()
      this.ctx.moveTo(0, -this.PLAYER_SIZE)
      this.ctx.lineTo(-this.PLAYER_SIZE * 0.6, this.PLAYER_SIZE * 0.8)
      this.ctx.lineTo(this.PLAYER_SIZE * 0.6, this.PLAYER_SIZE * 0.8)
      this.ctx.closePath()
      this.ctx.fill()
      
      this.ctx.restore()
      this.drawHealthBar(player.x, player.y - this.PLAYER_SIZE - 10, player.health)
      
      this.ctx.fillStyle = 'white'
      this.ctx.font = '12px Arial'
      this.ctx.fillText(
        player.id === currentPlayerId ? 'You' : player.id.slice(-4),
        player.x,
        player.y + this.PLAYER_SIZE + 15
      )
    })
  }
  
  drawHealthBar(x, y, health) {
    const barWidth = 40
    const barHeight = 4
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.fillRect(x - barWidth/2, y, barWidth, barHeight)
    
    const healthPercent = health / 100
    this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : 
                        healthPercent > 0.25 ? '#FFC107' : '#f44336'
    this.ctx.fillRect(x - barWidth/2, y, barWidth * healthPercent, barHeight)
  }
  
  renderBullets() {
    this.ctx.fillStyle = '#FFD700'
    this.ctx.shadowColor = '#FFD700'
    this.ctx.shadowBlur = 8
    
    this.bullets.forEach(bullet => {
      this.ctx.beginPath()
      this.ctx.arc(bullet.x, bullet.y, this.BULLET_SIZE, 0, Math.PI * 2)
      this.ctx.fill()
    })
    
    this.ctx.shadowBlur = 0
  }
  
  renderExplosions() {
    this.explosions.forEach(explosion => {
      this.ctx.save()
      this.ctx.globalAlpha = explosion.alpha
      
      const gradient = this.ctx.createRadialGradient(
        explosion.x, explosion.y, 0,
        explosion.x, explosion.y, 30 * explosion.scale
      )
      gradient.addColorStop(0, '#ff6b35')
      gradient.addColorStop(0.3, '#f7931e')
      gradient.addColorStop(1, 'transparent')
      
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(explosion.x, explosion.y, 30 * explosion.scale, 0, Math.PI * 2)
      this.ctx.fill()
      
      this.ctx.restore()
    })
  }
  
  destroy() {
    this.stop()
    window.removeEventListener('resize', () => this.resizeCanvas())
  }
}

export default GameEngine

