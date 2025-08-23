"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const ws_1 = require("ws");
// Load environment variables first
dotenv_1.default.config();
// Configure DNS for MongoDB Atlas
const dnsConfig_1 = require("./utils/dnsConfig");
(0, dnsConfig_1.configureDNS)();
// Database imports
const database_1 = __importDefault(require("./config/database"));
const memoryDatabase_1 = __importDefault(require("./config/memoryDatabase"));
// Database selection based on environment variable
const database = process.env.USE_MONGODB === 'true' ? database_1.default : memoryDatabase_1.default;
console.log('Using database:', process.env.USE_MONGODB === 'true' ? 'MongoDB' : 'Memory DB');
console.log('Database object:', typeof database, database ? 'loaded' : 'undefined');
// Import WebRTC signaling and matching service
const WebRTCSignalingManager = require('./websocket/webrtcSignaling');
const MatchingService_1 = __importDefault(require("./services/MatchingService"));
// import { WebSocketHandler } from './websocket/WebSocketHandler';
// import { AuthController } from './controllers/AuthController';
// import { DebugController } from './controllers/debugController';
console.log('Creating Express app...');
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
console.log(`Server will run on port ${PORT}`);
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files
app.use(express_1.default.static('.'));
// Controllers
// const authController = new AuthController();
// const debugController = new DebugController();
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// API Routes
// app.post('/api/register', authController.register.bind(authController));
// app.post('/api/login', authController.login.bind(authController));
// app.post('/api/refresh-token', authController.refreshToken.bind(authController));
// app.post('/api/logout', authController.logout.bind(authController));
// Debug routes (開発環境のみ)
// if (process.env.NODE_ENV !== 'production') {
//   app.get('/api/debug/users', debugController.getAllUsers.bind(debugController));
//   app.get('/api/debug/users/:deviceId', debugController.getUserByDeviceId.bind(debugController));
//   app.get('/api/debug/stats', debugController.getStats.bind(debugController));
// }
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred'
        }
    });
});
// 404 handler - Skip WebSocket upgrade requests
app.use('*', (req, res, next) => {
    // Skip if it's a WebSocket upgrade request
    if (req.headers.upgrade === 'websocket') {
        return next();
    }
    console.log(`❓ Unknown endpoint: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});
async function startServer() {
    try {
        console.log('Starting server...');
        console.log('USE_MONGODB:', process.env.USE_MONGODB);
        // Connect to database
        console.log('Connecting to database...');
        await database.connect();
        // Create indexes if using MongoDB
        if (process.env.USE_MONGODB === 'true') {
            console.log('Creating MongoDB indexes...');
            await database.createIndexes();
        }
        const dbType = process.env.USE_MONGODB === 'true' ? 'MongoDB' : 'In-Memory Database';
        console.log(`✅ ${dbType} connected successfully`);
        // Create HTTP server
        const server = (0, http_1.createServer)(app);
        // Start WebRTC signaling WebSocket server BEFORE starting HTTP server
        const wss = new ws_1.WebSocketServer({
            server
            // No path restriction - handle both /signaling and / paths
        });
        const signalingManager = new WebRTCSignalingManager();
        // matchingService is already imported as an instance
        wss.on('connection', (ws, req) => {
            // Extract user ID or token from query parameters
            const url = new URL(req.url, `http://${req.headers.host}`);
            const userId = url.searchParams.get('userId') || url.searchParams.get('token');
            if (!userId) {
                console.error('❌ WebSocket connection without userId or token');
                ws.close(1008, 'User ID or token required');
                return;
            }
            console.log(`🔌 WebSocket connected: ${userId} via ${req.url}`);
            // Handle both signaling and matching through WebSocket
            signalingManager.handleConnection(ws, userId);
            // Handle matching messages
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log(`📨 Message from ${userId}:`, message.type);
                    // Handle matching-specific messages
                    switch (message.type) {
                        case 'join_matching':
                        case 'start-matching':
                            console.log(`🎯 User ${userId} wants to start matching`);
                            const userProfile = message.profile || {
                                nickname: message.nickname || 'Anonymous',
                                gender: message.gender || 'unknown',
                                age: message.age || 20,
                                region: message.region || 'Unknown',
                                deviceId: message.deviceId || userId
                            };
                            console.log('User profile:', userProfile);
                            await MatchingService_1.default.joinMatchingQueue(userId, ws);
                            break;
                        case 'leave_matching':
                        case 'cancel-matching':
                            console.log(`❌ User ${userId} cancelled matching`);
                            await MatchingService_1.default.leaveMatchingQueue(userId);
                            break;
                        case 'accept_match':
                        case 'accept-match':
                            const acceptCallId = message.payload?.callId || message.matchId;
                            console.log(`✅ User ${userId} accepted match: ${acceptCallId}`);
                            await MatchingService_1.default.acceptMatch(userId, acceptCallId);
                            break;
                        case 'cancel_match':
                        case 'reject-match':
                            const rejectCallId = message.payload?.callId || message.matchId;
                            console.log(`❌ User ${userId} rejected match: ${rejectCallId}`);
                            await MatchingService_1.default.cancelMatch(userId, rejectCallId);
                            break;
                        case 'end_call':
                        case 'end-match':
                            const endCallId = message.payload?.callId || message.matchId;
                            console.log(`📴 User ${userId} ended match: ${endCallId}`);
                            await MatchingService_1.default.cancelMatch(userId, endCallId);
                            break;
                        case 'get-status':
                            const status = MatchingService_1.default.getQueueSize();
                            ws.send(JSON.stringify({
                                type: 'status-update',
                                status: status
                            }));
                            break;
                        default:
                            // Let signaling manager handle WebRTC messages
                            signalingManager.handleMessage(ws, message);
                            break;
                    }
                }
                catch (error) {
                    console.error(`❌ Error parsing message from ${userId}:`, error);
                }
            });
            // Handle disconnection
            ws.on('close', async () => {
                console.log(`🔌 WebSocket disconnected: ${userId}`);
                await MatchingService_1.default.leaveMatchingQueue(userId);
                signalingManager.handleDisconnection(ws);
            });
            // Send connection confirmation
            ws.send(JSON.stringify({
                type: 'connected',
                userId: userId,
                timestamp: Date.now()
            }));
        });
        // Start HTTP server
        server.listen(PORT, () => {
            console.log(`🚀 HTTP Server running on port ${PORT}`);
            console.log(`📖 API Documentation: http://localhost:${PORT}/health`);
            console.log(`🎯 WebRTC Signaling Server running on ws://localhost:${PORT}/signaling`);
        });
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('📴 SIGTERM received, shutting down gracefully...');
            server.close(async () => {
                await database.disconnect();
                process.exit(0);
            });
        });
        process.on('SIGINT', async () => {
            console.log('📴 SIGINT received, shutting down gracefully...');
            server.close(async () => {
                await database.disconnect();
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map