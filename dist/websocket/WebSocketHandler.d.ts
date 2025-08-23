export declare class WebSocketHandler {
    private wss;
    private webrtcSignaling;
    constructor(port: number);
    private verifyClient;
    private handleConnection;
    private handleMessage;
    private handleJoinMatching;
    private handleLeaveMatching;
    private handleAcceptMatch;
    private handleCancelMatch;
    private handleEndCall;
    private handleWebRTCSignal;
    private handleSendMessage;
    private handleDisconnection;
    private updateUserStatus;
    private findUserSocket;
    private setupHeartbeat;
    getConnectedUsersCount(): number;
}
//# sourceMappingURL=WebSocketHandler.d.ts.map