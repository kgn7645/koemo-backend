#!/bin/bash

# KOEMO Backend Server Startup Script
# This script starts the KOEMO backend server for iOS app testing

echo "🚀 Starting KOEMO Backend Server..."
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed  
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Set environment variables for development
export NODE_ENV=development
export USE_MONGODB=false
export PORT=3000
export JWT_SECRET=koemo-development-secret-key

echo "🔧 Environment Configuration:"
echo "   - Node Environment: $NODE_ENV"
echo "   - Database: Memory Database (MongoDB disabled)"
echo "   - Port: $PORT"
echo "   - JWT Secret: Set"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Build TypeScript if dist doesn't exist or is older than src
if [ ! -d "dist" ] || [ "src" -nt "dist" ]; then
    echo "🔨 Building TypeScript..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Failed to build TypeScript"
        exit 1
    fi
fi

echo ""
echo "🎯 KOEMO Server Features:"
echo "   ✅ WebSocket Connection: ws://localhost:3000"
echo "   ✅ WebRTC Signaling Server"  
echo "   ✅ iOS App Matching Service"
echo "   ✅ Memory Database (No MongoDB required)"
echo ""

echo "📱 iOS App Configuration:"
echo "   - Update WebSocketService.swift:"
echo "   - Change URL to: ws://[YOUR_IP]:3000?token=[USER_ID]"
echo "   - Replace [YOUR_IP] with your computer's IP address"
echo "   - Replace [USER_ID] with a unique identifier"
echo ""

# Get local IP address
LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
if [ ! -z "$LOCAL_IP" ]; then
    echo "🌐 Your local IP address: $LOCAL_IP"
    echo "   Use this in your iOS app: ws://$LOCAL_IP:3000?token=user1"
    echo ""
fi

echo "🎮 Testing Instructions:"
echo "   1. Update iOS app WebSocket URL to use your IP"
echo "   2. Build and run the iOS app on two different simulators/devices"
echo "   3. Tap the call button on both devices to start matching"
echo "   4. The backend will match the two users and start WebRTC call"
echo ""

echo "🔍 Server Logs:"
echo "   Watch the console below for connection and matching logs"
echo "   Press Ctrl+C to stop the server"
echo ""

# Start the server
echo "Starting server..."
npm start