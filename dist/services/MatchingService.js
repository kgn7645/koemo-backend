"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const memoryDatabase_1 = __importDefault(require("../config/memoryDatabase"));
const uuid_1 = require("uuid");
// Select database based on environment
const database = process.env.USE_MONGODB === 'true' ? database_1.default : memoryDatabase_1.default;
class MatchingService {
    constructor() {
        this.matchingQueue = new Set();
        this.userSockets = new Map(); // userId -> WebSocket
    }
    async joinMatchingQueue(userId, socket) {
        // Update user status to matching
        const db = database.getDb();
        await db.collection('users').updateOne({ _id: userId }, {
            $set: {
                'status.current': 'matching',
                'status.lastActiveAt': new Date(),
                updatedAt: new Date()
            }
        });
        this.userSockets.set(userId, socket);
        this.matchingQueue.add(userId);
        console.log(`User ${userId} joined matching queue. Queue size: ${this.matchingQueue.size}`);
        // Try to find a match immediately
        await this.tryToMatch(userId);
    }
    async leaveMatchingQueue(userId) {
        this.matchingQueue.delete(userId);
        this.userSockets.delete(userId);
        // Update user status back to online
        const db = database.getDb();
        await db.collection('users').updateOne({ _id: userId }, {
            $set: {
                'status.current': 'online',
                'status.lastActiveAt': new Date(),
                updatedAt: new Date()
            }
        });
        console.log(`User ${userId} left matching queue. Queue size: ${this.matchingQueue.size}`);
    }
    async tryToMatch(userId) {
        const availableUsers = Array.from(this.matchingQueue).filter(id => id !== userId);
        if (availableUsers.length === 0) {
            console.log(`No available users for matching with ${userId}`);
            return;
        }
        // For now, simple random matching
        // TODO: Implement more sophisticated matching algorithm based on user preferences
        const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
        await this.createMatch(userId, partnerId);
    }
    async createMatch(userId, partnerId) {
        const db = database.getDb();
        try {
            // Get user profiles
            const [user, partner] = await Promise.all([
                db.collection('users').findOne({ _id: userId }),
                db.collection('users').findOne({ _id: partnerId })
            ]);
            if (!user || !partner) {
                console.error('User or partner not found during matching');
                return;
            }
            // Create call record
            const callId = (0, uuid_1.v4)();
            const call = {
                userId,
                partnerId,
                startTime: new Date(),
                status: 'connecting',
                initiator: userId,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await db.collection('calls').insertOne({ ...call, _id: callId });
            // Remove both users from matching queue
            this.matchingQueue.delete(userId);
            this.matchingQueue.delete(partnerId);
            // Update user statuses to calling
            await Promise.all([
                db.collection('users').updateOne({ _id: userId }, {
                    $set: {
                        'status.current': 'calling',
                        'status.lastActiveAt': new Date(),
                        updatedAt: new Date()
                    }
                }),
                db.collection('users').updateOne({ _id: partnerId }, {
                    $set: {
                        'status.current': 'calling',
                        'status.lastActiveAt': new Date(),
                        updatedAt: new Date()
                    }
                })
            ]);
            // Create WebRTC room
            const roomId = `room_${callId}`;
            // Notify both users about match found
            const userSocket = this.userSockets.get(userId);
            const partnerSocket = this.userSockets.get(partnerId);
            if (userSocket) {
                userSocket.send(JSON.stringify({
                    type: 'match-found',
                    partner: {
                        nickname: partner.profile.nickname,
                        gender: partner.profile.gender,
                        age: partner.profile.age || null,
                        region: partner.profile.region || null
                    },
                    matchId: callId
                }));
                // Send start-call message after short delay
                setTimeout(() => {
                    userSocket.send(JSON.stringify({
                        type: 'start-call',
                        matchId: callId,
                        roomId: roomId,
                        isInitiator: true // First user is the initiator
                    }));
                }, 1000);
            }
            if (partnerSocket) {
                partnerSocket.send(JSON.stringify({
                    type: 'match-found',
                    partner: {
                        nickname: user.profile.nickname,
                        gender: user.profile.gender,
                        age: user.profile.age || null,
                        region: user.profile.region || null
                    },
                    matchId: callId
                }));
                // Send start-call message after short delay
                setTimeout(() => {
                    partnerSocket.send(JSON.stringify({
                        type: 'start-call',
                        matchId: callId,
                        roomId: roomId,
                        isInitiator: false // Second user receives the offer
                    }));
                }, 1500); // Slightly later than initiator
            }
            // Clean up socket references
            this.userSockets.delete(userId);
            this.userSockets.delete(partnerId);
            console.log(`✅ Match created: ${userId} <-> ${partnerId}`);
            console.log(`📞 Call ID: ${callId}`);
            console.log(`🏠 Room ID: ${roomId}`);
            console.log(`👤 Initiator: ${userId}`);
        }
        catch (error) {
            console.error('❌ Error creating match:', error);
            // Return users to queue on error
            this.matchingQueue.add(userId);
            this.matchingQueue.add(partnerId);
            // Notify users of error
            const userSocket = this.userSockets.get(userId);
            const partnerSocket = this.userSockets.get(partnerId);
            if (userSocket) {
                userSocket.send(JSON.stringify({
                    type: 'error',
                    data: { message: 'Failed to create match' }
                }));
            }
            if (partnerSocket) {
                partnerSocket.send(JSON.stringify({
                    type: 'error',
                    data: { message: 'Failed to create match' }
                }));
            }
        }
    }
    async acceptMatch(_userId, callId) {
        const db = database.getDb();
        try {
            const call = await db.collection('calls').findOne({ _id: callId });
            if (!call || call.status !== 'connecting') {
                return false;
            }
            await db.collection('calls').updateOne({ _id: callId }, {
                $set: {
                    status: 'active',
                    updatedAt: new Date()
                }
            });
            return true;
        }
        catch (error) {
            console.error('Error accepting match:', error);
            return false;
        }
    }
    async cancelMatch(_userId, callId) {
        const db = database.getDb();
        try {
            const call = await db.collection('calls').findOne({ _id: callId });
            if (!call || call.status !== 'connecting') {
                return false;
            }
            await db.collection('calls').updateOne({ _id: callId }, {
                $set: {
                    status: 'cancelled',
                    endTime: new Date(),
                    updatedAt: new Date()
                }
            });
            // Return both users to online status
            await Promise.all([
                db.collection('users').updateOne({ _id: call.userId }, {
                    $set: {
                        'status.current': 'online',
                        'status.lastActiveAt': new Date(),
                        updatedAt: new Date()
                    }
                }),
                db.collection('users').updateOne({ _id: call.partnerId }, {
                    $set: {
                        'status.current': 'online',
                        'status.lastActiveAt': new Date(),
                        updatedAt: new Date()
                    }
                })
            ]);
            console.log(`Match cancelled: Call ID ${callId}`);
            return true;
        }
        catch (error) {
            console.error('Error cancelling match:', error);
            return false;
        }
    }
    getQueueSize() {
        return this.matchingQueue.size;
    }
}
exports.default = new MatchingService();
//# sourceMappingURL=MatchingService.js.map