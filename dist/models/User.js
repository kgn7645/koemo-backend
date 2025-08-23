"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = void 0;
const createUser = (deviceId, profile) => {
    return {
        deviceId,
        profile,
        status: {
            current: 'online',
            lastActiveAt: new Date()
        },
        tickets: {
            balance: 0,
            freeCallsToday: 3,
            lastFreeCallAt: undefined
        },
        isBlocked: false,
        blockedUsers: [],
        createdAt: new Date(),
        updatedAt: new Date()
    };
};
exports.createUser = createUser;
//# sourceMappingURL=User.js.map