declare class MatchingService {
    private matchingQueue;
    private userSockets;
    joinMatchingQueue(userId: string, socket: any): Promise<void>;
    leaveMatchingQueue(userId: string): Promise<void>;
    private tryToMatch;
    private createMatch;
    acceptMatch(_userId: string, callId: string): Promise<boolean>;
    cancelMatch(_userId: string, callId: string): Promise<boolean>;
    getQueueSize(): number;
}
declare const _default: MatchingService;
export default _default;
//# sourceMappingURL=MatchingService.d.ts.map