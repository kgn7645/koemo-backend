import { ObjectId } from 'mongodb';
export interface Message {
    _id?: ObjectId;
    senderId: string;
    receiverId: string;
    content: string;
    isRead: boolean;
    createdAt: Date;
}
export interface ChatHistory {
    partnerId: string;
    partnerProfile: {
        nickname: string;
        gender: string;
        age?: number;
        region?: string;
    };
    lastMessage?: Message;
    lastCallTime?: Date;
    unreadCount: number;
}
//# sourceMappingURL=Message.d.ts.map