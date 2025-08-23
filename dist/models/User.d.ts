import { ObjectId } from 'mongodb';
export interface UserProfile {
    nickname: string;
    gender: 'male' | 'female' | 'other';
    age?: number;
    region?: string;
}
export interface UserStatus {
    current: 'online' | 'offline' | 'calling' | 'matching';
    lastActiveAt: Date;
}
export interface TicketInfo {
    balance: number;
    freeCallsToday: number;
    lastFreeCallAt?: Date;
}
export interface User {
    _id?: ObjectId;
    deviceId: string;
    profile: UserProfile;
    status: UserStatus;
    tickets: TicketInfo;
    isBlocked: boolean;
    blockedUsers: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export declare const createUser: (deviceId: string, profile: UserProfile) => User;
//# sourceMappingURL=User.d.ts.map