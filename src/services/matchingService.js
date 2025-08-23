// Real-time matching service for KOEMO
const { v4: uuidv4 } = require('uuid');

class MatchingService {
    constructor() {
        this.waitingUsers = new Map(); // userId -> { profile, socketId, timestamp }
        this.activeMatches = new Map(); // matchId -> { user1, user2, roomId, timestamp }
        this.userConnections = new Map(); // userId -> ws connection
        
        // Clean up expired matches and waiting users every 30 seconds
        setInterval(() => {
            this.cleanupExpired();
        }, 30000);
        
        console.log('🎯 MatchingService initialized');
    }

    // Register user for matching
    addUserToQueue(userId, userProfile, ws) {
        console.log(`➕ Adding user ${userId} to matching queue`);
        
        this.userConnections.set(userId, ws);
        this.waitingUsers.set(userId, {
            profile: userProfile,
            socketId: userId,
            timestamp: Date.now()
        });

        // Try to find a match immediately
        const match = this.findMatch(userId);
        if (match) {
            this.createMatch(match.user1Id, match.user2Id);
        } else {
            // Notify user they're in queue
            this.notifyUser(userId, {
                type: 'matching-status',
                status: 'searching',
                queuePosition: this.waitingUsers.size
            });
        }
        
        console.log(`📊 Queue status: ${this.waitingUsers.size} users waiting`);
    }

    // Remove user from queue
    removeUserFromQueue(userId) {
        console.log(`➖ Removing user ${userId} from matching queue`);
        
        this.waitingUsers.delete(userId);
        this.userConnections.delete(userId);
        
        // If user was in an active match, notify the other user
        for (const [matchId, match] of this.activeMatches.entries()) {
            if (match.user1.id === userId || match.user2.id === userId) {
                const otherUserId = match.user1.id === userId ? match.user2.id : match.user1.id;
                this.notifyUser(otherUserId, {
                    type: 'match-cancelled',
                    reason: 'partner-disconnected'
                });
                this.activeMatches.delete(matchId);
                break;
            }
        }
    }

    // Find a compatible match for the user
    findMatch(currentUserId) {
        const currentUser = this.waitingUsers.get(currentUserId);
        if (!currentUser) return null;

        // Simple matching logic - find the first available user
        // In production, this would include compatibility algorithms
        for (const [userId, userData] of this.waitingUsers.entries()) {
            if (userId !== currentUserId) {
                // Basic compatibility check
                if (this.isCompatible(currentUser.profile, userData.profile)) {
                    return {
                        user1Id: currentUserId,
                        user2Id: userId
                    };
                }
            }
        }

        return null;
    }

    // Check if two users are compatible
    isCompatible(profile1, profile2) {
        // Simple compatibility logic
        // In production, this would be more sophisticated
        
        // Don't match users with themselves
        if (profile1.deviceId === profile2.deviceId) {
            return false;
        }

        // For now, match anyone (basic implementation)
        return true;
    }

    // Create a match between two users
    createMatch(user1Id, user2Id) {
        const user1Data = this.waitingUsers.get(user1Id);
        const user2Data = this.waitingUsers.get(user2Id);
        
        if (!user1Data || !user2Data) {
            console.error(`❌ Cannot create match: User data missing`);
            return null;
        }

        // Generate match and room IDs
        const matchId = uuidv4();
        const roomId = `match_${matchId.substring(0, 8)}`;

        // Create match record
        const match = {
            matchId,
            roomId,
            user1: {
                id: user1Id,
                profile: user1Data.profile
            },
            user2: {
                id: user2Id,
                profile: user2Data.profile
            },
            timestamp: Date.now(),
            status: 'matched'
        };

        this.activeMatches.set(matchId, match);

        // Remove users from waiting queue
        this.waitingUsers.delete(user1Id);
        this.waitingUsers.delete(user2Id);

        console.log(`🎉 Match created: ${user1Id} ↔ ${user2Id} (room: ${roomId})`);

        // Notify both users about the match
        this.notifyUser(user1Id, {
            type: 'match-found',
            matchId,
            roomId,
            partner: {
                nickname: user2Data.profile.nickname,
                gender: user2Data.profile.gender,
                age: user2Data.profile.age,
                region: user2Data.profile.region
            },
            isInitiator: true
        });

        this.notifyUser(user2Id, {
            type: 'match-found',
            matchId,
            roomId,
            partner: {
                nickname: user1Data.profile.nickname,
                gender: user1Data.profile.gender,
                age: user1Data.profile.age,
                region: user1Data.profile.region
            },
            isInitiator: false
        });

        return match;
    }

    // Accept a match
    acceptMatch(userId, matchId) {
        const match = this.activeMatches.get(matchId);
        if (!match) {
            console.error(`❌ Match ${matchId} not found for user ${userId}`);
            return false;
        }

        // Mark match as accepted by this user
        if (match.user1.id === userId) {
            match.user1.accepted = true;
        } else if (match.user2.id === userId) {
            match.user2.accepted = true;
        } else {
            console.error(`❌ User ${userId} not part of match ${matchId}`);
            return false;
        }

        console.log(`✅ User ${userId} accepted match ${matchId}`);

        // If both users have accepted, start the call
        if (match.user1.accepted && match.user2.accepted) {
            match.status = 'calling';
            
            // Notify both users to start WebRTC connection
            this.notifyUser(match.user1.id, {
                type: 'start-call',
                matchId,
                roomId: match.roomId,
                isInitiator: true
            });

            this.notifyUser(match.user2.id, {
                type: 'start-call',
                matchId,
                roomId: match.roomId,
                isInitiator: false
            });

            console.log(`📞 Starting call for match ${matchId} in room ${match.roomId}`);
        }

        return true;
    }

    // Reject/skip a match
    rejectMatch(userId, matchId) {
        const match = this.activeMatches.get(matchId);
        if (!match) {
            console.error(`❌ Match ${matchId} not found for user ${userId}`);
            return false;
        }

        console.log(`❌ User ${userId} rejected match ${matchId}`);

        // Notify the other user
        const otherUserId = match.user1.id === userId ? match.user2.id : match.user1.id;
        this.notifyUser(otherUserId, {
            type: 'match-cancelled',
            reason: 'partner-declined'
        });

        // Remove match and put users back in queue
        this.activeMatches.delete(matchId);
        
        // Put both users back in queue for new matches
        const user1Profile = match.user1.profile;
        const user2Profile = match.user2.profile;
        
        if (this.userConnections.has(match.user1.id)) {
            this.addUserToQueue(match.user1.id, user1Profile, this.userConnections.get(match.user1.id));
        }
        
        if (this.userConnections.has(match.user2.id)) {
            this.addUserToQueue(match.user2.id, user2Profile, this.userConnections.get(match.user2.id));
        }

        return true;
    }

    // End a call/match
    endMatch(userId, matchId) {
        const match = this.activeMatches.get(matchId);
        if (!match) {
            return false;
        }

        console.log(`📴 Ending match ${matchId} by user ${userId}`);

        // Notify the other user
        const otherUserId = match.user1.id === userId ? match.user2.id : match.user1.id;
        this.notifyUser(otherUserId, {
            type: 'call-ended',
            reason: 'partner-ended'
        });

        // Clean up match
        this.activeMatches.delete(matchId);
        return true;
    }

    // Send notification to a user
    notifyUser(userId, message) {
        const ws = this.userConnections.get(userId);
        if (ws && ws.readyState === ws.OPEN) {
            try {
                ws.send(JSON.stringify(message));
                console.log(`📤 Sent to ${userId}: ${message.type}`);
            } catch (error) {
                console.error(`❌ Failed to send message to ${userId}:`, error);
                this.userConnections.delete(userId);
            }
        } else {
            console.warn(`⚠️ Cannot send message to ${userId}: Connection not available`);
        }
    }

    // Clean up expired users and matches
    cleanupExpired() {
        const now = Date.now();
        const WAIT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        const MATCH_TIMEOUT = 10 * 60 * 1000; // 10 minutes

        // Clean up expired waiting users
        for (const [userId, userData] of this.waitingUsers.entries()) {
            if (now - userData.timestamp > WAIT_TIMEOUT) {
                console.log(`🧹 Removing expired user from queue: ${userId}`);
                this.removeUserFromQueue(userId);
            }
        }

        // Clean up expired matches
        for (const [matchId, match] of this.activeMatches.entries()) {
            if (now - match.timestamp > MATCH_TIMEOUT) {
                console.log(`🧹 Removing expired match: ${matchId}`);
                this.activeMatches.delete(matchId);
            }
        }
    }

    // Get service statistics
    getStats() {
        return {
            waitingUsers: this.waitingUsers.size,
            activeMatches: this.activeMatches.size,
            connectedUsers: this.userConnections.size
        };
    }

    // Get user's current status
    getUserStatus(userId) {
        if (this.waitingUsers.has(userId)) {
            return {
                status: 'waiting',
                queuePosition: Array.from(this.waitingUsers.keys()).indexOf(userId) + 1
            };
        }

        for (const [matchId, match] of this.activeMatches.entries()) {
            if (match.user1.id === userId || match.user2.id === userId) {
                return {
                    status: match.status,
                    matchId: matchId,
                    roomId: match.roomId
                };
            }
        }

        return { status: 'idle' };
    }
}

module.exports = MatchingService;