# Nostr Protocol Implementation for Multiplayer Battle Game

This project has been migrated from using CRDT (Yjs) to the **Nostr protocol** for real-time multiplayer synchronization.

## What is Nostr?

Nostr (Notes and Other Stuff Transmitted by Relays) is a simple, open protocol that enables global, decentralized, and censorship-resistant social media. In our implementation, we use Nostr's event system to synchronize game state across multiple players in real-time.

## Key Benefits of Using Nostr

1. **Decentralized**: No single point of failure - uses multiple relay servers
2. **Censorship-resistant**: No central authority can shut down the game
3. **Global reach**: Players can connect from anywhere in the world
4. **Real-time**: Fast event propagation across the network
5. **Persistent**: Game events are stored on relays for reliability

## How It Works

### Event Types
- **Kind 1000**: Player state events (position, health, score)
- **Kind 1001**: Bullet events (creation, movement)
- **Kind 1002**: Game state events (room status, global state)

### Architecture
1. **NostrManager**: Handles connection to Nostr relays and event publishing/subscription
2. **GameEngine**: Modified to use NostrManager instead of YjsManager
3. **Real-time sync**: All game events are published as Nostr events and synchronized across clients

### Relay Servers
The game connects to multiple Nostr relays for redundancy:
- wss://relay.damus.io
- wss://relay.primal.net
- wss://nos.lol
- wss://relay.nostr.band

## Features

### Player Identity
- Each player gets a unique Nostr keypair (stored locally)
- Player ID is derived from the public key
- Persistent identity across sessions

### Real-time Synchronization
- Player movements and actions are instantly synchronized
- Bullet trajectories are shared across all clients
- Health, score, and game state updates in real-time

### Automatic Cleanup
- Old bullets are automatically cleaned up after 10 seconds
- Offline players are removed after 30 seconds of inactivity
- Heartbeat system keeps active players visible

## Running the Game

```bash
npm install
npm run dev
```

The game will automatically:
1. Generate or load Nostr keys from localStorage
2. Connect to multiple Nostr relays
3. Join the game room
4. Start synchronizing with other players

## Game Controls

- **WASD/Arrow keys**: Move your plane
- **Space**: Shoot bullets
- **ESC**: Pause game

## Technical Implementation

### NostrManager.js
- Manages Nostr connections and subscriptions
- Publishes player state, bullets, and game events
- Handles event cleanup and player management

### Modified GameEngine.js
- Replaced all YjsManager calls with NostrManager
- Maintains the same game logic and rendering
- Improved real-time responsiveness

### Event Flow
1. Player action (move, shoot) → NostrManager.publishEvent()
2. Event propagated to all connected relays
3. Other clients receive event → Update local game state
4. Game engine renders updated state

## Comparison: CRDT vs Nostr

| Feature | CRDT (Yjs) | Nostr Protocol |
|---------|------------|----------------|
| Architecture | Centralized WebSocket server | Decentralized relay network |
| Scalability | Limited by server capacity | Scales with relay network |
| Reliability | Single point of failure | Multiple relays for redundancy |
| Censorship resistance | Vulnerable | Resistant |
| Setup complexity | Requires server setup | Uses existing public relays |
| Real-time performance | Excellent | Excellent |
| Offline support | Limited | Events persisted on relays |

## Future Enhancements

- **Room system**: Private game rooms with custom relay selection
- **Leaderboards**: Global scoring using Nostr events
- **Spectator mode**: Watch games without participating
- **Game replays**: Reconstruct games from stored Nostr events
- **Custom relays**: Deploy private relays for tournament play

## Dependencies

- `nostr-tools`: Official Nostr JavaScript library
- `vue`: Frontend framework
- `vite`: Build tool

## Learn More

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [nostr-tools Documentation](https://github.com/nbd-wtf/nostr-tools)
- [Nostr Relays](https://nostr.watch/)
