"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class Database {
    constructor() {
        this.client = null;
        this.db = null;
    }
    async connect() {
        try {
            const uri = process.env.MONGODB_URI;
            if (!uri) {
                throw new Error('MongoDB URI is not defined in environment variables');
            }
            this.client = new mongodb_1.MongoClient(uri);
            await this.client.connect();
            console.log('✅ Connected to MongoDB successfully');
            // Select database
            this.db = this.client.db('koemo');
        }
        catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log('Disconnected from MongoDB');
        }
    }
    getDb() {
        if (!this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }
    async createIndexes() {
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
            await this.db.collection('calls').createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 } // 24 hours
            );
            // Message indexes with TTL
            await this.db.collection('messages').createIndex({ senderId: 1 });
            await this.db.collection('messages').createIndex({ receiverId: 1 });
            await this.db.collection('messages').createIndex({ createdAt: -1 });
            await this.db.collection('messages').createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 } // 24 hours
            );
            // Report indexes
            await this.db.collection('reports').createIndex({ reporterId: 1 });
            await this.db.collection('reports').createIndex({ reportedUserId: 1 });
            await this.db.collection('reports').createIndex({ createdAt: -1 });
            // System logs with longer TTL
            await this.db.collection('systemLogs').createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 } // 30 days
            );
            console.log('✅ Database indexes created successfully');
        }
        catch (error) {
            console.error('Error creating indexes:', error);
            throw error;
        }
    }
}
exports.default = new Database();
//# sourceMappingURL=database.js.map