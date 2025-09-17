<template>
  <div class="game-container">
    <canvas 
      ref="gameCanvas" 
      class="game-canvas"
      @keydown="handleKeyDown"
      @keyup="handleKeyUp"
      tabindex="0"
    ></canvas>
    
    <div class="ui-overlay">
      <div :class="['connection-status', connectionStatus]">
        {{ getConnectionText() }}
      </div>
      
      <div class="game-info">
        <h3>Game Status</h3>
        <p>Player ID: {{ playerId }}</p>
        <p>Health: {{ playerHealth }}/100</p>
        <p>Score: {{ playerScore }}</p>
        <p>Online Players: {{ onlinePlayerCount }} 
          <button @click="refreshPlayerCount" style="margin-left: 10px; padding: 2px 6px; font-size: 10px;">Refresh</button>
        </p>
      </div>
      
      <div class="player-list">
        <h3>Player List</h3>
        <div v-for="(player, id) in players" :key="id" class="player-item">
          <span :class="{ 'current-player': id === playerId }">
            {{ id === playerId ? 'You' : `Player${id.slice(-4)}` }}
          </span>
          <span class="player-score">{{ player.score || 0 }}</span>
        </div>
      </div>
      
      <div class="controls">
        <p><strong>Controls:</strong></p>
        <p>WASD/Arrow keys: Move plane</p>
        <p>Space: Shoot bullets</p>
        <p>ESC: Pause game</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import NostrManager from '../utils/NostrManager.js'
import GameEngine from '../utils/GameEngine.js'

export default {
  name: 'GameContainer',
  setup() {
    const gameCanvas = ref(null)
    const connectionStatus = ref('connecting')
    const playerId = ref('')
    const playerHealth = ref(100)
    const playerScore = ref(0)
    const players = reactive({})
    const onlinePlayerCount = ref(0)
    
    let nostrManager = null
    let gameEngine = null
    let animationFrame = null
    let updateInterval = null
    
    const keys = reactive({
      w: false, a: false, s: false, d: false,
      ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
      space: false
    })
    
    const initGame = async () => {
      try {
        nostrManager = new NostrManager()
        await nostrManager.connect()
        
        playerId.value = nostrManager.getClientId()
        connectionStatus.value = 'connected'
        
        nostrManager.onConnectionChange((status) => {
          connectionStatus.value = status
        })
        
        nostrManager.onPlayersChange((newPlayers) => {
          console.log('Players changed:', newPlayers)
          
          Object.keys(players).forEach(key => {
            if (!(key in newPlayers)) {
              delete players[key]
            }
          })
          
          Object.assign(players, newPlayers)
          
          onlinePlayerCount.value = nostrManager.getOnlinePlayerCount()
          console.log('Online count updated to:', onlinePlayerCount.value)
          
          const currentPlayer = players[playerId.value]
          if (currentPlayer) {
            playerHealth.value = currentPlayer.health || 100
            playerScore.value = currentPlayer.score || 0
            console.log('Player stats updated - Health:', playerHealth.value, 'Score:', playerScore.value)
          }
        })
        
        await nextTick()
        if (gameCanvas.value) {
          gameEngine = new GameEngine(gameCanvas.value, nostrManager)
          gameEngine.start()
          
          gameLoop()
          
          updateInterval = setInterval(() => {
            const newCount = nostrManager.getOnlinePlayerCount()
            if (newCount !== onlinePlayerCount.value) {
              onlinePlayerCount.value = newCount
              console.log('Periodic update - Online count:', newCount)
            }
          }, 1000)
          
          setTimeout(() => {
            onlinePlayerCount.value = nostrManager.getOnlinePlayerCount()
            console.log('Initial online count:', onlinePlayerCount.value)
          }, 500)
        }
        
      } catch (error) {
        console.error('Game initialization failed:', error)
        connectionStatus.value = 'disconnected'
      }
    }
    
    const gameLoop = () => {
      if (gameEngine) {
        const input = {
          up: keys.w || keys.ArrowUp,
          down: keys.s || keys.ArrowDown,
          left: keys.a || keys.ArrowLeft,
          right: keys.d || keys.ArrowRight,
          shoot: keys.space
        }
        
        gameEngine.update(input)
        gameEngine.render()
      }
      
      animationFrame = requestAnimationFrame(gameLoop)
    }
    
    const handleKeyDown = (event) => {
      event.preventDefault()
      if (keys.hasOwnProperty(event.code.replace('Key', '').toLowerCase()) || 
          keys.hasOwnProperty(event.key)) {
        keys[event.code.replace('Key', '').toLowerCase()] = true
        keys[event.key] = true
      }
      if (event.code === 'Space') {
        keys.space = true
      }
    }
    
    const handleKeyUp = (event) => {
      event.preventDefault()
      if (keys.hasOwnProperty(event.code.replace('Key', '').toLowerCase()) || 
          keys.hasOwnProperty(event.key)) {
        keys[event.code.replace('Key', '').toLowerCase()] = false
        keys[event.key] = false
      }
      if (event.code === 'Space') {
        keys.space = false
      }
    }
    
    const getConnectionText = () => {
      switch (connectionStatus.value) {
        case 'connected': return 'Connected'
        case 'connecting': return 'Connecting...'
        case 'disconnected': return 'Disconnected'
        default: return 'Unknown'
      }
    }
    
    const refreshPlayerCount = () => {
      if (nostrManager) {
        const newCount = nostrManager.getOnlinePlayerCount()
        onlinePlayerCount.value = newCount
        console.log('Manual refresh - Online count:', newCount)
        
        const allPlayers = nostrManager.getAllPlayers()
        console.log('All current players:', allPlayers)
      }
    }
    
    onMounted(() => {
      initGame()
      
      nextTick(() => {
        if (gameCanvas.value) {
          gameCanvas.value.focus()
        }
      })
      
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('keyup', handleKeyUp)
    })
    
    onUnmounted(() => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
      if (updateInterval) {
        clearInterval(updateInterval)
      }
      if (gameEngine) {
        gameEngine.destroy()
      }
      if (nostrManager) {
        nostrManager.disconnect()
      }
      
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    })
    
    return {
      gameCanvas,
      connectionStatus,
      playerId,
      playerHealth,
      playerScore,
      players,
      onlinePlayerCount,
      handleKeyDown,
      handleKeyUp,
      getConnectionText,
      refreshPlayerCount
    }
  }
}
</script>

<style scoped>
.current-player {
  font-weight: bold;
  color: #4CAF50;
}

.player-item {
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
  padding: 5px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
}

.player-score {
  color: #FFD700;
  font-weight: bold;
}
</style>

