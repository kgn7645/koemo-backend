# KOEMO Backend

WebRTC signaling server for KOEMO iOS voice calling app.

## Features

- 🎙️ WebRTC voice call signaling
- 📱 iOS-to-iOS random matching
- 🔄 Real-time WebSocket communication  
- 💾 Memory database (no external DB required)
- 🌍 Free TURN server integration
- ⚡ Railway deployment ready

## Quick Deploy

### Railway Web Dashboard
1. Go to [Railway.app](https://railway.app)
2. Connect GitHub account
3. Import repository: `kgn7645/koemo-backend`
4. Set environment variables:
   - `NODE_ENV=production`
   - `USE_MONGODB=false` 
   - `PORT=3000`
   - `JWT_SECRET=your-secret-key`
   - `CORS_ORIGIN=*`

### Railway CLI
```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

## Environment Variables

Required for production:
- `NODE_ENV=production`
- `USE_MONGODB=false`
- `PORT=3000`
- `JWT_SECRET=secure-random-key`

## API Endpoints

- `GET /health` - Health check
- `WebSocket /` - Main signaling connection

## iOS App Integration

Update `WebSocketService.swift`:
```swift
// Replace with your Railway URL
guard let url = URL(string: "wss://your-app.railway.app?token=\(token)") else {
```

## Architecture

- **Matching**: Random user pairing
- **Signaling**: WebRTC offer/answer/ICE exchange
- **Audio**: P2P voice calls with TURN fallback
- **Storage**: 24-hour ephemeral data

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm start
```

Built for KOEMO - Anonymous voice calling app 🎯