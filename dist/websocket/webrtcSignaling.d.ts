export = WebRTCSignalingManager;
declare class WebRTCSignalingManager {
    rooms: Map<any, any>;
    userRooms: Map<any, any>;
    connections: Map<any, any>;
    handleConnection(ws: any, userId: any): void;
    handleMessage(ws: any, message: any): void;
    handleJoinRoom(ws: any, userId: any, roomId: any): void;
    handleOffer(ws: any, userId: any, message: any): void;
    handleAnswer(ws: any, userId: any, message: any): void;
    handleIceCandidate(ws: any, userId: any, message: any): void;
    handleLeaveRoom(ws: any, userId: any): void;
    handleDisconnection(ws: any): void;
    sendMessage(ws: any, message: any): void;
    sendError(ws: any, error: any): void;
    broadcastToRoom(roomId: any, message: any, excludeUsers?: any[]): void;
    getRoomStats(roomId: any): {
        roomId: any;
        participantCount: any;
        participants: any[];
        hasOffers: boolean;
        hasAnswers: boolean;
        iceCandidatesCount: any;
    } | null;
    getAllRoomStats(): ({
        roomId: any;
        participantCount: any;
        participants: any[];
        hasOffers: boolean;
        hasAnswers: boolean;
        iceCandidatesCount: any;
    } | null)[];
}
//# sourceMappingURL=webrtcSignaling.d.ts.map