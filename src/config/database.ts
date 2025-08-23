import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    try {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('MongoDB URI is not defined in environment variables');
      }

      this.client = new MongoClient(uri);
      await this.client.connect();
      console.log('✅ Connected to MongoDB successfully');

      // Select database
      this.db = this.client.db('koemo');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  async createIndexes(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      // User indexes
      await this.db.collection('users').createIndex({ deviceId: 1 }, { unique: true });
      await this.db.collection('users').createIndex({ 'status.current': 1 });
      await this.db.collection('users').createIndex({ createdAt: -1 });

      // Call indexes with TTL for 24-hour expiration
      await this.db.collection('calls').createIndex({ userId: 1 });
      await this.db.collection('calls').createIndex({ partnerId: 1 });
      await this.db.collection('calls').createIndex({ startTime: -1 });
      await this.db.collection('calls').createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 86400 } // 24 hours
      );

      // Message indexes with TTL
      await this.db.collection('messages').createIndex({ senderId: 1 });
      await this.db.collection('messages').createIndex({ receiverId: 1 });
      await this.db.collection('messages').createIndex({ createdAt: -1 });
      await this.db.collection('messages').createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 86400 } // 24 hours
      );

      // Report indexes
      await this.db.collection('reports').createIndex({ reporterId: 1 });
      await this.db.collection('reports').createIndex({ reportedUserId: 1 });
      await this.db.collection('reports').createIndex({ createdAt: -1 });

      // System logs with longer TTL
      await this.db.collection('systemLogs').createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 2592000 } // 30 days
      );

      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }
  }
}

export default new Database();