# Multiplayer Plane Battle

Real-time multiplayer plane battle game based on Yjs and Vue.js.

## Features

- 🚀 Real-time multiplayer combat
- 🎯 Plane movement and shooting
- 💥 Collision detection and explosion effects
- 🏆 Real-time score tracking
- 💖 Health system
- 🌟 Cool visual effects
- 📱 Responsive design

## Tech Stack

- **Frontend**: Vue.js 3 + Vite
- **Real-time Sync**: Yjs + y-websocket
- **Backend**: Rust + Tokio + Warp (provided)
- **Rendering**: Canvas 2D API

## Project Structure

```
crdt/
├── src/
│   ├── components/
│   │   └── GameContainer.vue    # Main game container component
│   ├── utils/
│   │   ├── YjsManager.js        # Yjs data sync management
│   │   ├── GameEngine.js        # Game engine and rendering
│   │   └── WebSocketAdapter.js  # WebSocket adapter
│   ├── styles/
│   │   └── global.css           # Global styles
│   ├── App.vue                  # Root component
│   └── main.js                  # Entry file
├── env.js                       # Environment configuration
├── package.json
├── vite.config.js
└── index.html
```

## Installation and Running

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Backend Server
```
https://github.com/reearth/reearth-flow/tree/main/server/websocket
```
Make sure your Rust backend server is running on `localhost:8000`:

```bash
# Run in backend directory
cargo run
```

### 3. Start Frontend Development Server

```bash
npm run dev
```

The game will start at `http://localhost:3000`.

### 4. Multiplayer Gaming

Open the same URL in different browser tabs or devices to start multiplayer gaming.

## Game Controls

- **Movement**: `WASD` keys or arrow keys
- **Shooting**: `Space` key
- **Pause**: `ESC` key

## Game Rules

1. Each player controls a plane
2. Use bullets to attack other players
3. Getting hit reduces health (-20 per hit)
4. Hitting other players earns points (+10)
5. Respawn after 2 seconds when health reaches zero
6. Real-time display of all player status and scores

## Architecture Design

### Data Synchronization

Implemented using Yjs CRDT (Conflict-free Replicated Data Type) technology:

- `players` Map: Store all player states
- `bullets` Array: Store all bullet information
- `gameState` Map: Store global game state

### Game Engine

- **GameEngine**: Handle game logic, rendering and physics calculations
- **YjsManager**: Manage data synchronization and state updates
- **GameContainer**: Vue component, handle UI and user interactions

### Performance Optimization

- Use requestAnimationFrame for smooth rendering
- Regular cleanup of expired bullets and offline players
- Client-side prediction to reduce latency perception
- Canvas optimized rendering performance

## Environment Configuration

The WebSocket URL is configured in `env.js`. You can set the `VITE_WS_URL` environment variable or modify the default URL directly:

```javascript
export const config = {
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
}
```

## Development Notes

### Adding New Features

1. Add new data structures in `YjsManager.js`
2. Implement game logic in `GameEngine.js`
3. Add UI interactions in `GameContainer.vue`

### Debugging

Open browser developer tools to view:
- WebSocket connection status
- Yjs sync logs
- Game state updates

## Game Screenshots and Demo

The game includes the following visual elements:
- Deep blue gradient background
- Twinkling star effects
- Triangle planes (blue = self, red = enemies)
- Golden bullet trails
- Orange explosion effects
- Transparent UI panels

## Responsive Support

- ✅ Adaptive canvas size
- ✅ Mobile device compatibility
- ✅ Touch device support (to be improved)
- ✅ Different resolution adaptation

