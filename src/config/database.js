const mongoose = require('mongoose');
const logger = require('./logger');
const config = require('./config');

class Database {
  constructor() {
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  async connect() {
    try {
      const uri = config.server.environment === 'test' 
        ? config.database.mongodb.testUri 
        : config.database.mongodb.uri;

      if (!uri) {
        throw new Error('MongoDB URI is not defined');
      }

      logger.info('Connecting to MongoDB...', { uri: uri.replace(/\/\/.*@/, '//***@') });

      await mongoose.connect(uri, config.database.mongodb.options);

      this.isConnected = true;
      this.connectionRetries = 0;

      logger.info('Successfully connected to MongoDB', {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      });

      // Setup event listeners
      this.setupEventListeners();

    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to MongoDB', { 
        error: error.message,
        retries: this.connectionRetries
      });

      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        logger.info(`Retrying connection in ${this.retryDelay / 1000} seconds...`, {
          attempt: this.connectionRetries,
          maxRetries: this.maxRetries
        });
        
        setTimeout(() => this.connect(), this.retryDelay);
      } else {
        logger.error('Max connection retries reached. Exiting...');
        throw error;
      }
    }
  }

  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      this.isConnected = true;
      logger.info('MongoDB connection established');
    });

    mongoose.connection.on('error', (error) => {
      this.isConnected = false;
      logger.error('MongoDB connection error', { error: error.message });
    });

    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
      logger.warn('MongoDB connection lost');
      
      // Attempt to reconnect if not in a shutdown process
      if (!this.isShuttingDown) {
        setTimeout(() => this.connect(), this.retryDelay);
      }
    });

    mongoose.connection.on('reconnected', () => {
      this.isConnected = true;
      logger.info('MongoDB reconnected');
    });

    // Handle application termination
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
  }

  async gracefulShutdown(signal) {
    this.isShuttingDown = true;
    logger.info(`${signal} received. Starting graceful shutdown...`);

    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
    } catch (error) {
      logger.error('Error during MongoDB disconnect', { error: error.message });
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        this.isConnected = false;
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', { error: error.message });
      throw error;
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected' };
      }

      // Simple ping to verify connection
      const admin = mongoose.connection.db.admin();
      const result = await admin.ping();
      
      return {
        status: 'connected',
        ping: result,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  // Create indexes for collections
  async createIndexes() {
    try {
      logger.info('Creating database indexes...');

      // User indexes
      await mongoose.connection.db.collection('users').createIndex({ deviceId: 1 }, { unique: true });
      await mongoose.connection.db.collection('users').createIndex({ 'status.current': 1 });
      await mongoose.connection.db.collection('users').createIndex({ 'flags.isBlocked': 1 });

      // Call indexes
      await mongoose.connection.db.collection('calls').createIndex({ callId: 1 }, { unique: true });
      await mongoose.connection.db.collection('calls').createIndex({ 'participants.caller.userId': 1 });
      await mongoose.connection.db.collection('calls').createIndex({ 'participants.callee.userId': 1 });
      await mongoose.connection.db.collection('calls').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // Message indexes
      await mongoose.connection.db.collection('messages').createIndex({ callId: 1, createdAt: -1 });
      await mongoose.connection.db.collection('messages').createIndex({ 'sender.userId': 1 });
      await mongoose.connection.db.collection('messages').createIndex({ 'receiver.userId': 1 });
      await mongoose.connection.db.collection('messages').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // Match indexes
      await mongoose.connection.db.collection('matches').createIndex({ matchId: 1 }, { unique: true });
      await mongoose.connection.db.collection('matches').createIndex({ 'users.userId': 1 });
      await mongoose.connection.db.collection('matches').createIndex({ status: 1, createdAt: -1 });

      // Ticket indexes
      await mongoose.connection.db.collection('tickets').createIndex({ userId: 1, createdAt: -1 });
      await mongoose.connection.db.collection('tickets').createIndex({ transactionId: 1 }, { unique: true });

      // Report indexes
      await mongoose.connection.db.collection('reports').createIndex({ 'reported.userId': 1 });
      await mongoose.connection.db.collection('reports').createIndex({ status: 1, createdAt: -1 });
      await mongoose.connection.db.collection('reports').createIndex({ reportId: 1 }, { unique: true });

      // Blocked users indexes
      await mongoose.connection.db.collection('blocked_users').createIndex({ blockerId: 1, blockedId: 1 }, { unique: true });
      await mongoose.connection.db.collection('blocked_users').createIndex({ blockedId: 1 });

      // System logs indexes
      await mongoose.connection.db.collection('system_logs').createIndex({ userId: 1, timestamp: -1 });
      await mongoose.connection.db.collection('system_logs').createIndex({ eventType: 1, timestamp: -1 });
      await mongoose.connection.db.collection('system_logs').createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Failed to create database indexes', { error: error.message });
      throw error;
    }
  }
}

module.exports = new Database();