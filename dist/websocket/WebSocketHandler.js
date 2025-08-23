"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketHandler = void 0;
const ws_1 = __importDefault(require("ws"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const memoryDatabase_1 = __importDefault(require("../config/memoryDatabase"));
const MatchingService_1 = __importDefault(require("../services/MatchingService"));
const WebRTCSignalingManager = require('./webrtcSignaling');
// Select database based on environment
const database = process.env.USE_MONGODB === 'true' ? database_1.default : memoryDatabase_1.default;
class WebSocketHandler {
    constructor(port) {
        this.wss = new ws_1.default.Server({
            port,
            verifyClient: this.verifyClient.bind(this)
        });
        this.webrtcSignaling = new WebRTCSignalingManager();
        this.wss.on('connection', this.handleConnection.bind(this));
        this.setupHeartbeat();
        console.log(`WebSocket server started on port ${port}`);
    }
    async verifyClient(info) {
        try {
            const url = new URL(info.req.url || '', 'http://localhost');
            const token = url.searchParams.get('token');
            if (!token) {
                console.log('WebSocket connection rejected: No token provided');
                return false;
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default-secret');
            // Attach userId to request for later use
            info.req.userId = decoded.userId;
            return true;
        }
        catch (error) {
            console.log('WebSocket connection rejected: Invalid token');
            return false;
        }
    }
    handleConnection(ws, req) {
        const userId = req.userId;
        ws.userId = userId;
        ws.isAlive = true;
        console.log(`WebSocket connection established for user: ${userId}`);
        // Update user status to online
        this.updateUserStatus(userId, 'online');
        ws.on('message', (data) => {
            this.handleMessage(ws, data);
        });
        ws.on('close', () => {
            this.handleDisconnection(ws);
        });
        ws.on('pong', () => {
            ws.isAlive = true;
        });
        // Initialize WebRTC signaling for this connection
        this.webrtcSignaling.handleConnection(ws, userId);
        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            data: { userId }
        }));
    }
    async handleMessage(ws, data) {
        try {
            const message = JSON.parse(data.toString());
            const { type, payload } = message;
            switch (type) {
                case 'join_matching':
                    await this.handleJoinMatching(ws);
                    break;
                case 'leave_matching':
                    await this.handleLeaveMatching(ws);
                    break;
                case 'accept_match':
                    await this.handleAcceptMatch(ws, payload.callId);
                    break;
                case 'cancel_match':
                    await this.handleCancelMatch(ws, payload.callId);
                    break;
                case 'end_call':
                    await this.handleEndCall(ws, payload.callId);
                    break;
                case 'webrtc_signal':
                    await this.handleWebRTCSignal(ws, payload);
                    break;
                // WebRTC Signaling messages
                case 'join-room':
                case 'offer':
                case 'answer':
                case 'ice-candidate':
                case 'leave-room':
                    this.webrtcSignaling.handleMessage(ws, { type, ...payload });
                    break;
                case 'send_message':
                    await this.handleSendMessage(ws, payload);
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                default:
                    console.log(`Unknown message type: ${type}`);
            }
        }
        catch (error) {
            console.error('Error handling WebSocket message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Invalid message format' }
            }));
        }
    }
    async handleJoinMatching(ws) {
        if (!ws.userId)
            return;
        try {
            await MatchingService_1.default.joinMatchingQueue(ws.userId, ws);
            ws.send(JSON.stringify({
                type: 'matching_started',
                data: { queueSize: MatchingService_1.default.getQueueSize() }
            }));
        }
        catch (error) {
            console.error('Error joining matching queue:', error);
            ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Failed to join matching queue' }
            }));
        }
    }
    async handleLeaveMatching(ws) {
        if (!ws.userId)
            return;
        try {
            await MatchingService_1.default.leaveMatchingQueue(ws.userId);
            ws.send(JSON.stringify({
                type: 'matching_stopped',
                data: {}
            }));
        }
        catch (error) {
            console.error('Error leaving matching queue:', error);
        }
    }
    async handleAcceptMatch(ws, callId) {
        if (!ws.userId)
            return;
        try {
            const success = await MatchingService_1.default.acceptMatch(ws.userId, callId);
            if (success) {
                ws.send(JSON.stringify({
                    type: 'match_accepted',
                    data: { callId }
                }));
            }
            else {
                ws.send(JSON.stringify({
                    type: 'error',
                    data: { message: 'Failed to accept match' }
                }));
            }
        }
        catch (error) {
            console.error('Error accepting match:', error);
        }
    }
    async handleCancelMatch(ws, callId) {
        if (!ws.userId)
            return;
        try {
            const success = await MatchingService_1.default.cancelMatch(ws.userId, callId);
            if (success) {
                ws.send(JSON.stringify({
                    type: 'match_cancelled',
                    data: { callId }
                }));
            }
        }
        catch (error) {
            console.error('Error cancelling match:', error);
        }
    }
    async handleEndCall(ws, callId) {
        if (!ws.userId)
            return;
        try {
            const db = database.getDb();
            const call = await db.collection('calls').findOne({ _id: callId });
            if (!call) {
                ws.send(JSON.stringify({
                    type: 'error',
                    data: { message: 'Call not found' }
                }));
                return;
            }
            const endTime = new Date();
            const duration = Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000);
            await db.collection('calls').updateOne({ _id: callId }, {
                $set: {
                    status: 'ended',
                    endTime,
                    duration,
                    updatedAt: new Date()
                }
            });
            // Update both users' status back to online
            await Promise.all([
                this.updateUserStatus(call.userId, 'online'),
                this.updateUserStatus(call.partnerId, 'online')
            ]);
            ws.send(JSON.stringify({
                type: 'call_ended',
                data: { callId, duration }
            }));
            console.log(`Call ended: ${callId}, Duration: ${duration}s`);
        }
        catch (error) {
            console.error('Error ending call:', error);
        }
    }
    async handleWebRTCSignal(ws, payload) {
        // Handle WebRTC signaling between peers
        const { targetUserId, signal } = payload;
        if (!targetUserId || !signal) {
            ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Invalid WebRTC signal format' }
            }));
            return;
        }
        // Find target user's WebSocket connection by searching in call records
        const db = database.getDb();
        const call = await db.collection('calls').findOne({
            $or: [
                { userId: ws.userId, partnerId: targetUserId },
                { userId: targetUserId, partnerId: ws.userId }
            ],
            status: { $in: ['connecting', 'active'] }
        });
        if (!call) {
            ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'No active call found with target user' }
            }));
            return;
        }
        // Find target user's WebSocket connection
        const targetWs = this.findUserSocket(call.userId === ws.userId ? call.partnerId : call.userId);
        if (targetWs) {
            targetWs.send(JSON.stringify({
                type: 'webrtc_signal',
                data: {
                    fromUserId: ws.userId,
                    signal
                }
            }));
            console.log(`WebRTC signal forwarded from ${ws.userId} to ${targetUserId}`);
        }
        else {
            ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Target user not connected' }
            }));
        }
    }
    async handleSendMessage(ws, payload) {
        if (!ws.userId)
            return;
        try {
            const { receiverId, content } = payload;
            const db = database.getDb();
            const message = {
                senderId: ws.userId,
                receiverId,
                content,
                isRead: false,
                createdAt: new Date()
            };
            await db.collection('messages').insertOne(message);
            // Try to send to receiver if online
            const receiverWs = this.findUserSocket(receiverId);
            if (receiverWs) {
                receiverWs.send(JSON.stringify({
                    type: 'new_message',
                    data: message
                }));
            }
            ws.send(JSON.stringify({
                type: 'message_sent',
                data: { messageId: message._id }
            }));
        }
        catch (error) {
            console.error('Error sending message:', error);
        }
    }
    handleDisconnection(ws) {
        if (ws.userId) {
            console.log(`WebSocket disconnected for user: ${ws.userId}`);
            // Remove from matching queue if in queue
            MatchingService_1.default.leaveMatchingQueue(ws.userId);
            // Update user status to offline
            this.updateUserStatus(ws.userId, 'offline');
        }
    }
    async updateUserStatus(userId, status) {
        try {
            const db = database.getDb();
            await db.collection('users').updateOne({ _id: userId }, {
                $set: {
                    'status.current': status,
                    'status.lastActiveAt': new Date(),
                    updatedAt: new Date()
                }
            });
        }
        catch (error) {
            console.error('Error updating user status:', error);
        }
    }
    findUserSocket(userId) {
        for (const client of this.wss.clients) {
            const ws = client;
            if (ws.userId === userId && ws.readyState === ws_1.default.OPEN) {
                return ws;
            }
        }
        return null;
    }
    setupHeartbeat() {
        const interval = setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (!ws.isAlive) {
                    ws.terminate();
                    return;
                }
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000); // 30 seconds
        this.wss.on('close', () => {
            clearInterval(interval);
        });
    }
    getConnectedUsersCount() {
        return this.wss.clients.size;
    }
}
exports.WebSocketHandler = WebSocketHandler;
//# sourceMappingURL=WebSocketHandler.js.map