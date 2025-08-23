"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugController = void 0;
const database_1 = __importDefault(require("../config/database"));
const memoryDatabase_1 = __importDefault(require("../config/memoryDatabase"));
// Select database based on environment
const database = process.env.USE_MONGODB === 'true' ? database_1.default : memoryDatabase_1.default;
class DebugController {
    // デバッグ用：全ユーザーを表示
    async getAllUsers(_req, res) {
        try {
            const db = database.getDb();
            const users = await (await db.collection('users').find({})).toArray();
            res.json({
                success: true,
                data: {
                    count: users.length,
                    users: users.map(user => ({
                        _id: user._id,
                        deviceId: user.deviceId,
                        profile: user.profile,
                        status: user.status,
                        tickets: user.tickets,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt
                    }))
                }
            });
        }
        catch (error) {
            console.error('Debug getAllUsers error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get users'
                }
            });
        }
    }
    // デバッグ用：特定のユーザーを検索
    async getUserByDeviceId(req, res) {
        try {
            const { deviceId } = req.params;
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
            res.json({
                success: true,
                data: user
            });
        }
        catch (error) {
            console.error('Debug getUserByDeviceId error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get user'
                }
            });
        }
    }
    // デバッグ用：全てのコレクションの統計情報
    async getStats(_req, res) {
        try {
            const db = database.getDb();
            const collections = ['users', 'calls', 'messages', 'reports'];
            const stats = {};
            for (const collection of collections) {
                const data = await (await db.collection(collection).find({})).toArray();
                stats[collection] = {
                    count: data.length,
                    sample: data.slice(0, 3) // 最初の3件のサンプルデータ
                };
            }
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            console.error('Debug getStats error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get stats'
                }
            });
        }
    }
}
exports.DebugController = DebugController;
//# sourceMappingURL=debugController.js.map