"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const memoryDatabase_1 = __importDefault(require("../config/memoryDatabase"));
const User_1 = require("../models/User");
// Select database based on environment
const database = process.env.USE_MONGODB === 'true' ? database_1.default : memoryDatabase_1.default;
class AuthController {
    async register(req, res) {
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
            const profile = {
                nickname: nickname.trim(),
                gender,
                age: age ? parseInt(age) : undefined,
                region: region?.trim()
            };
            // Create new user
            const user = (0, User_1.createUser)(deviceId, profile);
            const result = await db.collection('users').insertOne(user);
            const userId = result.insertedId.toString();
            // Generate tokens
            const jwtSecret = process.env.JWT_SECRET || 'default-secret';
            const accessTokenOptions = { expiresIn: process.env.JWT_EXPIRES_IN || '30d' };
            const refreshTokenOptions = { expiresIn: '90d' };
            const accessToken = jsonwebtoken_1.default.sign({ userId, deviceId }, jwtSecret, accessTokenOptions);
            const refreshToken = jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, jwtSecret, refreshTokenOptions);
            res.status(201).json({
                success: true,
                data: {
                    userId,
                    accessToken,
                    refreshToken,
                    profile
                }
            });
        }
        catch (error) {
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
    async login(req, res) {
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
            await db.collection('users').updateOne({ _id: user._id }, {
                $set: {
                    'status.current': 'online',
                    'status.lastActiveAt': new Date(),
                    updatedAt: new Date()
                }
            });
            // Generate tokens
            const jwtSecret = process.env.JWT_SECRET || 'default-secret';
            const accessTokenOptions = { expiresIn: process.env.JWT_EXPIRES_IN || '30d' };
            const refreshTokenOptions = { expiresIn: '90d' };
            const accessToken = jsonwebtoken_1.default.sign({ userId: user._id, deviceId }, jwtSecret, accessTokenOptions);
            const refreshToken = jsonwebtoken_1.default.sign({ userId: user._id, type: 'refresh' }, jwtSecret, refreshTokenOptions);
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
        }
        catch (error) {
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
    async refreshToken(req, res) {
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
            const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_SECRET || 'default-secret');
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
            const accessTokenOptions = { expiresIn: process.env.JWT_EXPIRES_IN || '30d' };
            const accessToken = jsonwebtoken_1.default.sign({ userId: user._id, deviceId: user.deviceId }, jwtSecret, accessTokenOptions);
            res.json({
                success: true,
                data: {
                    accessToken
                }
            });
        }
        catch (error) {
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
    async logout(req, res) {
        try {
            const userId = req.userId;
            const db = database.getDb();
            await db.collection('users').updateOne({ _id: userId }, {
                $set: {
                    'status.current': 'offline',
                    'status.lastActiveAt': new Date(),
                    updatedAt: new Date()
                }
            });
            res.json({
                success: true,
                data: { message: 'Logged out successfully' }
            });
        }
        catch (error) {
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
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map