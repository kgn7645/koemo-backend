import { Call } from '../models/Call';
import mongoDatabase from '../config/database';
import memoryDatabase from '../config/memoryDatabase';
import { v4 as uuidv4 } from 'uuid';

// Select database based on environment
const database = process.env.USE_MONGODB === 'true' ? mongoDatabase : memoryDatabase;

class MatchingService {
  private matchingQueue: Set<string> = new Set();
  private userSockets: Map<string, any> = new Map(); // userId -> WebSocket

  async joinMatchingQueue(userId: string, socket: any): Promise<void> {
    // Update user status to matching
    const db = database.getDb();
    await db.collection('users').updateOne(
      { _id: userId as any },
      { 
        $set: { 
          'status.current': 'matching',
          'status.lastActiveAt': new Date(),
          updatedAt: new Date()
        }
      }
    );

    this.userSockets.set(userId, socket);
    this.matchingQueue.add(userId);

    console.log(`User ${userId} joined matching queue. Queue size: ${this.matchingQueue.size}`);

    // Try to find a match immediately
    await this.tryToMatch(userId);
  }

  async leaveMatchingQueue(userId: string): Promise<void> {
    this.matchingQueue.delete(userId);
    this.userSockets.delete(userId);

    // Update user status back to online
    const db = database.getDb();
    await db.collection('users').updateOne(
      { _id: userId as any },
      { 
        $set: { 
          'status.current': 'online',
          'status.lastActiveAt': new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`User ${userId} left matching queue. Queue size: ${this.matchingQueue.size}`);
  }

  private async tryToMatch(userId: string): Promise<void> {
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

  private async createMatch(userId: string, partnerId: string): Promise<void> {
    const db = database.getDb();
    
    try {
      // Get user profiles
      const [user, partner] = await Promise.all([
        db.collection('users').findOne({ _id: userId as any }),
        db.collection('users').findOne({ _id: partnerId as any })
      ]);

      if (!user || !partner) {
        console.error('User or partner not found during matching');
        return;
      }

      // Create call record
      const callId = uuidv4();
      const call: Call = {
        userId,
        partnerId,
        startTime: new Date(),
        status: 'connecting',
        initiator: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('calls').insertOne({ ...call, _id: callId as any });

      // Remove both users from matching queue
      this.matchingQueue.delete(userId);
      this.matchingQueue.delete(partnerId);

      // Update user statuses to calling
      await Promise.all([
        db.collection('users').updateOne(
          { _id: userId as any },
          { 
            $set: { 
              'status.current': 'calling',
              'status.lastActiveAt': new Date(),
              updatedAt: new Date()
            }
          }
        ),
        db.collection('users').updateOne(
          { _id: partnerId as any },
          { 
            $set: { 
              'status.current': 'calling',
              'status.lastActiveAt': new Date(),
              updatedAt: new Date()
            }
          }
        )
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
      
    } catch (error) {
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

  async acceptMatch(_userId: string, callId: string): Promise<boolean> {
    const db = database.getDb();
    
    try {
      const call = await db.collection('calls').findOne({ _id: callId as any });
      if (!call || call.status !== 'connecting') {
        return false;
      }

      await db.collection('calls').updateOne(
        { _id: callId as any },
        { 
          $set: { 
            status: 'active',
            updatedAt: new Date()
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error accepting match:', error);
      return false;
    }
  }

  async cancelMatch(_userId: string, callId: string): Promise<boolean> {
    const db = database.getDb();
    
    try {
      const call = await db.collection('calls').findOne({ _id: callId as any });
      if (!call || call.status !== 'connecting') {
        return false;
      }

      await db.collection('calls').updateOne(
        { _id: callId as any },
        { 
          $set: { 
            status: 'cancelled',
            endTime: new Date(),
            updatedAt: new Date()
          }
        }
      );

      // Return both users to online status
      await Promise.all([
        db.collection('users').updateOne(
          { _id: call.userId as any },
          { 
            $set: { 
              'status.current': 'online',
              'status.lastActiveAt': new Date(),
              updatedAt: new Date()
            }
          }
        ),
        db.collection('users').updateOne(
          { _id: call.partnerId as any },
          { 
            $set: { 
              'status.current': 'online',
              'status.lastActiveAt': new Date(),
              updatedAt: new Date()
            }
          }
        )
      ]);

      console.log(`Match cancelled: Call ID ${callId}`);
      return true;
    } catch (error) {
      console.error('Error cancelling match:', error);
      return false;
    }
  }

  getQueueSize(): number {
    return this.matchingQueue.size;
  }
}

export default new MatchingService();