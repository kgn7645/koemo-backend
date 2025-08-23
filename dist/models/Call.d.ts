import { ObjectId } from 'mongodb';
export interface Call {
    _id?: ObjectId;
    userId: string;
    partnerId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'connecting' | 'active' | 'ended' | 'cancelled';
    initiator: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CallMatch {
    callId: string;
    userId: string;
    partnerId: string;
    partnerProfile: {
        nickname: string;
        gender: string;
    };
    matchedAt: Date;
}
//# sourceMappingURL=Call.d.ts.map