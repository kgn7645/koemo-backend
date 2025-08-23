import { ObjectId } from 'mongodb';

export interface Call {
  _id?: ObjectId;
  userId: string;
  partnerId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  status: 'connecting' | 'active' | 'ended' | 'cancelled';
  initiator: string; // userId of who initiated the call
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