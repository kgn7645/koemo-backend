import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoDatabase from '../config/database';
import memoryDatabase from '../config/memoryDatabase';
import { createUser, UserProfile } from '../models/User';

// Select database based on environment
const database = process.env.USE_MONGODB === 'true' ? mongoDatabase : memoryDatabase;

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, nickname, gender, age, region } = req.body;

      // Validate required fields
      if (!deviceId || !nickname || !gender) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Device ID, nickname, and gender are required'
          }
        });
        return;
      }

      const db = database.getDb();

      // Check if user already exists
      const existingUser = await db.collection('users').findOne({ deviceId });
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this device ID already exists'
          }
        });
        return;
      }

      // Create user profile
      const profile: UserProfile = {
        nickname: nickname.trim(),
        gender,
        age: age ? parseInt(age) : undefined,
        region: region?.trim()
      };

      // Create new user
      const user = createUser(deviceId, profile);
      
      const result = await db.collection('users').insertOne(user);
      const userId = result.insertedId.toString();

      // Generate tokens
      const jwtSecret = process.env.JWT_SECRET || 'default-secret';
      const accessTokenOptions: any = { expiresIn: process.env.JWT_EXPIRES_IN || '30d' };
      const refreshTokenOptions: any = { expiresIn: '90d' };
      
      const accessToken = jwt.sign(
        { userId, deviceId },
        jwtSecret,
        accessTokenOptions
      );

      const refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        jwtSecret,
        refreshTokenOptions
      );

      res.status(201).json({
        success: true,
        data: {
          userId,
          accessToken,
          refreshToken,
          profile
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to register user'
        }
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.body;

      if (!deviceId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_DEVICE_ID',
            message: 'Device ID is required'
          }
        });
        return;
      }

      const db = database.getDb();
      const user = await db.collection('users').findOne({ deviceId });

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
        return;
      }

      if (user.isBlocked) {
        res.status(403).json({
          success: false,
          error: {
            code: 'USER_BLOCKED',
            message: 'Account has been blocked'
          }
        });
        return;
      }

      // Update last active time
      await db.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            'status.current': 'online',
            'status.lastActiveAt': new Date(),
            updatedAt: new Date()
          }
        }
      );

      // Generate tokens
      const jwtSecret = process.env.JWT_SECRET || 'default-secret';
      const accessTokenOptions: any = { expiresIn: process.env.JWT_EXPIRES_IN || '30d' };
      const refreshTokenOptions: any = { expiresIn: '90d' };
      
      const accessToken = jwt.sign(
        { userId: user._id, deviceId },
        jwtSecret,
        accessTokenOptions
      );

      const refreshToken = jwt.sign(
        { userId: user._id, type: 'refresh' },
        jwtSecret,
        refreshTokenOptions
      );

      res.json({
        success: true,
        data: {
          userId: user._id,
          accessToken,
          refreshToken,
          profile: user.profile,
          tickets: user.tickets
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to login'
        }
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required'
          }
        });
        return;
      }

      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET || 'default-secret'
      ) as any;

      if (decoded.type !== 'refresh') {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token'
          }
        });
        return;
      }

      const db = database.getDb();
      const user = await db.collection('users').findOne({ _id: decoded.userId });

      if (!user || user.isBlocked) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_USER',
            message: 'User not found or blocked'
          }
        });
        return;
      }

      // Generate new access token
      const jwtSecret = process.env.JWT_SECRET || 'default-secret';
      const accessTokenOptions: any = { expiresIn: process.env.JWT_EXPIRES_IN || '30d' };
      
      const accessToken = jwt.sign(
        { userId: user._id, deviceId: user.deviceId },
        jwtSecret,
        accessTokenOptions
      );

      res.json({
        success: true,
        data: {
          accessToken
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      const db = database.getDb();
      await db.collection('users').updateOne(
        { _id: userId },
        {
          $set: {
            'status.current': 'offline',
            'status.lastActiveAt': new Date(),
            updatedAt: new Date()
          }
        }
      );

      res.json({
        success: true,
        data: { message: 'Logged out successfully' }
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to logout'
        }
      });
    }
  }
}