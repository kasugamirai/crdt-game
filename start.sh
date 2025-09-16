#!/bin/bash


if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🎮 Starting game server..."
echo ""
echo "🔗 Game address: http://localhost:3000"
echo "📖 Usage:"
echo "   - WASD/Arrow keys: Move plane"
echo "   - Space: Shoot bullets"
echo "   - ESC: Pause game"
echo ""
echo "⚠️  Please ensure the backend server is running on localhost:8000"
echo "   (Run your Rust backend server)"
echo ""

npm run dev

