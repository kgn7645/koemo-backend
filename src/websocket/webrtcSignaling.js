// WebRTC Signaling Server for KOEMO
const { v4: uuidv4 } = require('uuid');

class WebRTCSignalingManager {
    constructor() {
        this.rooms = new Map(); // roomId -> { participants: Set, offers: Map, answers: Map, iceCandidates: Map }
        this.userRooms = new Map(); // userId -> roomId
        this.connections = new Map(); // ws connection -> { userId, roomId }
        
        console.log('🎯 WebRTC Signaling Manager initialized');
    }

    // Handle new WebSocket connection
    handleConnection(ws, userId) {
        console.log(`🔗 WebRTC: User ${userId} connected to signaling server`);
        
        this.connections.set(ws, { userId });

        // Handle incoming messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleMessage(ws, message);
            } catch (error) {
                console.error('❌ WebRTC: Invalid message format:', error);
                this.sendError(ws, 'Invalid message format');
            }
        });

        // Handle disconnection
        ws.on('close', () => {
            this.handleDisconnection(ws);
        });

        // Send connection confirmation
        this.sendMessage(ws, {
            type: 'connected',
            userId: userId
        });
    }

    // Handle incoming messages
    handleMessage(ws, message) {
        const connection = this.connections.get(ws);
        if (!connection) {
            console.error('❌ WebRTC: Unknown connection');
            return;
        }

        const { userId } = connection;
        console.log(`📨 WebRTC: Received ${message.type} from ${userId}`);

        switch (message.type) {
            case 'join-room':
                this.handleJoinRoom(ws, userId, message.roomId);
                break;
            
            case 'offer':
                this.handleOffer(ws, userId, message);
                break;
            
            case 'answer':
                this.handleAnswer(ws, userId, message);
                break;
            
            case 'ice-candidate':
                this.handleIceCandidate(ws, userId, message);
                break;
            
            case 'leave-room':
                this.handleLeaveRoom(ws, userId);
                break;
            
            default:
                console.warn(`⚠️ WebRTC: Unknown message type: ${message.type}`);
                this.sendError(ws, `Unknown message type: ${message.type}`);
        }
    }

    // Join a room for peer-to-peer connection
    handleJoinRoom(ws, userId, roomId) {
        console.log(`🏠 WebRTC: User ${userId} joining room ${roomId}`);

        // Leave current room if any
        if (this.userRooms.has(userId)) {
            this.handleLeaveRoom(ws, userId);
        }

        // Create room if it doesn't exist
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                participants: new Set(),
                offers: new Map(),
                answers: new Map(),
                iceCandidates: new Map()
            });
            console.log(`🆕 WebRTC: Created new room ${roomId}`);
        }

        const room = this.rooms.get(roomId);
        
        // Check room capacity (max 2 participants for peer-to-peer)
        if (room.participants.size >= 2) {
            this.sendError(ws, 'Room is full');
            return;
        }

        // Add user to room
        room.participants.add(userId);
        this.userRooms.set(userId, roomId);
        
        // Update connection info
        const connection = this.connections.get(ws);
        connection.roomId = roomId;

        console.log(`✅ WebRTC: User ${userId} joined room ${roomId} (${room.participants.size}/2)`);

        // Notify user of successful join
        this.sendMessage(ws, {
            type: 'joined-room',
            roomId: roomId,
            participantCount: room.participants.size
        });

        // If room is full, notify both participants they can start the call
        if (room.participants.size === 2) {
            console.log(`🎉 WebRTC: Room ${roomId} is full, ready to start call`);
            this.broadcastToRoom(roomId, {
                type: 'room-ready',
                roomId: roomId,
                participants: Array.from(room.participants)
            });
        }
    }

    // Handle WebRTC offer
    handleOffer(ws, userId, message) {
        const roomId = this.userRooms.get(userId);
        if (!roomId) {
            this.sendError(ws, 'Not in a room');
            return;
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            this.sendError(ws, 'Room not found');
            return;
        }

        console.log(`📢 WebRTC: Handling offer from ${userId} in room ${roomId}`);

        // Store offer
        room.offers.set(userId, message.offer);

        // Forward offer to other participant(s)
        this.broadcastToRoom(roomId, {
            type: 'offer',
            offer: message.offer,
            from: userId
        }, [userId]);
    }

    // Handle WebRTC answer
    handleAnswer(ws, userId, message) {
        const roomId = this.userRooms.get(userId);
        if (!roomId) {
            this.sendError(ws, 'Not in a room');
            return;
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            this.sendError(ws, 'Room not found');
            return;
        }

        console.log(`📣 WebRTC: Handling answer from ${userId} in room ${roomId}`);

        // Store answer
        room.answers.set(userId, message.answer);

        // Forward answer to other participant(s)
        this.broadcastToRoom(roomId, {
            type: 'answer',
            answer: message.answer,
            from: userId
        }, [userId]);
    }

    // Handle ICE candidate
    handleIceCandidate(ws, userId, message) {
        const roomId = this.userRooms.get(userId);
        if (!roomId) {
            this.sendError(ws, 'Not in a room');
            return;
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            this.sendError(ws, 'Room not found');
            return;
        }

        console.log(`🧊 WebRTC: Handling ICE candidate from ${userId}`);

        // Store ICE candidate
        if (!room.iceCandidates.has(userId)) {
            room.iceCandidates.set(userId, []);
        }
        room.iceCandidates.get(userId).push(message.candidate);

        // Forward ICE candidate to other participant(s)
        this.broadcastToRoom(roomId, {
            type: 'ice-candidate',
            candidate: message.candidate,
            from: userId
        }, [userId]);
    }

    // Handle leaving room
    handleLeaveRoom(ws, userId) {
        const roomId = this.userRooms.get(userId);
        if (!roomId) {
            return; // Not in any room
        }

        console.log(`👋 WebRTC: User ${userId} leaving room ${roomId}`);

        const room = this.rooms.get(roomId);
        if (room) {
            // Remove user from room
            room.participants.delete(userId);
            
            // Clean up user's data
            room.offers.delete(userId);
            room.answers.delete(userId);
            room.iceCandidates.delete(userId);

            // Notify other participants
            this.broadcastToRoom(roomId, {
                type: 'participant-left',
                userId: userId,
                participantCount: room.participants.size
            }, [userId]);

            // Clean up empty room
            if (room.participants.size === 0) {
                this.rooms.delete(roomId);
                console.log(`🗑️ WebRTC: Cleaned up empty room ${roomId}`);
            }
        }

        // Clean up user mappings
        this.userRooms.delete(userId);
        
        // Update connection info
        const connection = this.connections.get(ws);
        if (connection) {
            delete connection.roomId;
        }

        // Confirm leaving
        this.sendMessage(ws, {
            type: 'left-room',
            roomId: roomId
        });
    }

    // Handle WebSocket disconnection
    handleDisconnection(ws) {
        const connection = this.connections.get(ws);
        if (!connection) {
            return;
        }

        const { userId } = connection;
        console.log(`🔌 WebRTC: User ${userId} disconnected from signaling server`);

        // Leave room if in one
        this.handleLeaveRoom(ws, userId);

        // Clean up connection
        this.connections.delete(ws);
    }

    // Send message to specific WebSocket
    sendMessage(ws, message) {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    // Send error to specific WebSocket
    sendError(ws, error) {
        this.sendMessage(ws, {
            type: 'error',
            error: error
        });
    }

    // Broadcast message to all participants in a room
    broadcastToRoom(roomId, message, excludeUsers = []) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }

        console.log(`📡 WebRTC: Broadcasting ${message.type} to room ${roomId} (excluding ${excludeUsers.join(', ')})`);

        // Find connections for room participants
        for (const [ws, connection] of this.connections.entries()) {
            if (connection.roomId === roomId && !excludeUsers.includes(connection.userId)) {
                this.sendMessage(ws, message);
            }
        }
    }

    // Get room statistics
    getRoomStats(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return null;
        }

        return {
            roomId: roomId,
            participantCount: room.participants.size,
            participants: Array.from(room.participants),
            hasOffers: room.offers.size > 0,
            hasAnswers: room.answers.size > 0,
            iceCandidatesCount: Array.from(room.iceCandidates.values()).reduce((total, candidates) => total + candidates.length, 0)
        };
    }

    // Get all active rooms
    getAllRoomStats() {
        const stats = [];
        for (const roomId of this.rooms.keys()) {
            stats.push(this.getRoomStats(roomId));
        }
        return stats;
    }
}

module.exports = WebRTCSignalingManager;