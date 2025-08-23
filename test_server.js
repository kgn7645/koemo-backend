const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const MatchingService = require('./src/services/matchingService');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static(__dirname));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
    console.log(`Headers: ${JSON.stringify(req.headers)}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`Body: ${JSON.stringify(req.body)}`);
    }
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// User registration endpoint
app.post('/api/register', (req, res) => {
    const { deviceId, nickname, gender, age, region } = req.body;
    
    console.log('📝 Registration request:', req.body);
    
    // Simple validation
    if (!deviceId || !nickname || !gender) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Missing required fields'
            }
        });
    }
    
    // Generate mock user data
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    const accessToken = 'token_' + Math.random().toString(36).substr(2, 20);
    const refreshToken = 'refresh_' + Math.random().toString(36).substr(2, 20);
    
    const response = {
        success: true,
        data: {
            userId: userId,
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: {
                nickname: nickname,
                gender: gender,
                age: age,
                region: region
            },
            tickets: {
                balance: 0,
                freeCallsToday: 3,
                lastFreeCallAt: null
            }
        }
    };
    
    console.log('✅ Registration successful:', userId);
    res.json(response);
});

// Create HTTP server
const server = createServer(app);

// WebSocket server for matching and signaling
const wss = new WebSocketServer({ 
    server,
    path: '/signaling' 
});

const matchingService = new MatchingService();

// Simple signaling manager
class SimpleSignalingManager {
    constructor() {
        this.rooms = new Map();
        this.userConnections = new Map();
    }
    
    handleConnection(ws, userId) {
        this.userConnections.set(userId, ws);
        console.log(`🔌 User ${userId} connected to signaling`);
    }
    
    handleMessage(ws, userId, message) {
        switch (message.type) {
            case 'join-room':
                this.joinRoom(userId, message.roomId);
                break;
            case 'offer':
            case 'answer':
            case 'ice-candidate':
                this.forwardToRoom(userId, message);
                break;
        }
    }
    
    joinRoom(userId, roomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, { participants: [] });
        }
        
        const room = this.rooms.get(roomId);
        if (!room.participants.includes(userId)) {
            room.participants.push(userId);
        }
        
        console.log(`🏠 User ${userId} joined room ${roomId} (${room.participants.length}/2)`);
        
        // Notify user they joined
        const ws = this.userConnections.get(userId);
        if (ws) {
            ws.send(JSON.stringify({
                type: 'joined-room',
                roomId: roomId,
                participantCount: room.participants.length
            }));
        }
        
        // If room is full, notify all participants
        if (room.participants.length === 2) {
            room.participants.forEach(participantId => {
                const participantWs = this.userConnections.get(participantId);
                if (participantWs) {
                    participantWs.send(JSON.stringify({
                        type: 'room-ready',
                        participants: room.participants
                    }));
                }
            });
        }
    }
    
    forwardToRoom(senderId, message) {
        // Find room containing sender
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.participants.includes(senderId)) {
                console.log(`📡 Forwarding ${message.type} from ${senderId} to room ${roomId}`);
                
                // Forward to other participants
                room.participants.forEach(participantId => {
                    if (participantId !== senderId) {
                        const ws = this.userConnections.get(participantId);
                        if (ws) {
                            console.log(`📤 Sending ${message.type} to ${participantId}`);
                            ws.send(JSON.stringify({
                                ...message,
                                from: senderId,
                                roomId: roomId
                            }));
                        }
                    }
                });
                break;
            }
        }
    }
    
    handleDisconnection(userId) {
        console.log(`🔌 User ${userId} disconnected from signaling`);
        this.userConnections.delete(userId);
        
        // Remove from rooms
        for (const [roomId, room] of this.rooms.entries()) {
            const index = room.participants.indexOf(userId);
            if (index !== -1) {
                room.participants.splice(index, 1);
                
                // Notify remaining participants
                room.participants.forEach(participantId => {
                    const ws = this.userConnections.get(participantId);
                    if (ws) {
                        ws.send(JSON.stringify({
                            type: 'participant-left',
                            userId: userId
                        }));
                    }
                });
                
                // Remove empty rooms
                if (room.participants.length === 0) {
                    this.rooms.delete(roomId);
                }
            }
        }
    }
}

const signalingManager = new SimpleSignalingManager();

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
        console.error('❌ WebSocket connection without userId');
        ws.close(1008, 'User ID required');
        return;
    }
    
    console.log(`🔌 WebSocket connected: ${userId}`);
    
    // Handle both signaling and matching
    signalingManager.handleConnection(ws, userId);
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`📨 Message from ${userId}:`, message.type);
            
            // Handle matching messages
            switch (message.type) {
                case 'start-matching':
                    console.log(`🎯 User ${userId} wants to start matching`);
                    const userProfile = message.profile || {
                        nickname: message.nickname || 'Anonymous',
                        gender: message.gender || 'unknown',
                        age: message.age || 20,
                        region: message.region || 'Unknown',
                        deviceId: message.deviceId || userId
                    };
                    matchingService.addUserToQueue(userId, userProfile, ws);
                    break;
                    
                case 'cancel-matching':
                    console.log(`❌ User ${userId} cancelled matching`);
                    matchingService.removeUserFromQueue(userId);
                    break;
                    
                case 'accept-match':
                    console.log(`✅ User ${userId} accepted match: ${message.matchId}`);
                    matchingService.acceptMatch(userId, message.matchId);
                    break;
                    
                case 'reject-match':
                    console.log(`❌ User ${userId} rejected match: ${message.matchId}`);
                    matchingService.rejectMatch(userId, message.matchId);
                    break;
                    
                case 'end-match':
                    console.log(`📴 User ${userId} ended match: ${message.matchId}`);
                    matchingService.endMatch(userId, message.matchId);
                    break;
                    
                case 'get-status':
                    const status = matchingService.getUserStatus(userId);
                    ws.send(JSON.stringify({
                        type: 'status-update',
                        status: status
                    }));
                    break;
                    
                default:
                    // Handle signaling messages
                    signalingManager.handleMessage(ws, userId, message);
                    break;
            }
        } catch (error) {
            console.error(`❌ Error parsing message from ${userId}:`, error);
        }
    });
    
    ws.on('close', () => {
        console.log(`🔌 WebSocket disconnected: ${userId}`);
        matchingService.removeUserFromQueue(userId);
        signalingManager.handleDisconnection(userId);
    });
    
    // Send connection confirmation
    ws.send(JSON.stringify({
        type: 'connected',
        userId: userId,
        timestamp: Date.now()
    }));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Test Server running on port ${PORT}`);
    console.log(`📖 Health check: http://localhost:${PORT}/health`);
    console.log(`🎯 Test page: http://localhost:${PORT}/test_matching.html`);
    console.log(`🎯 WebSocket: ws://localhost:${PORT}/signaling`);
});