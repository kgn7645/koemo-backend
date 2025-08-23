declare class MemoryDatabase {
    private collections;
    collection(name: string): {
        insertOne: (doc: any) => Promise<{
            insertedId: string;
        }>;
        findOne: (query: any) => Promise<any>;
        find: (query?: any) => Promise<{
            toArray: () => Promise<any[]>;
        }>;
        updateOne: (query: any, update: any) => Promise<{
            modifiedCount: number;
        }>;
        deleteOne: (query: any) => Promise<{
            deletedCount: number;
        }>;
        createIndex: (_index: any, _options?: any) => Promise<void>;
    };
    private generateId;
    private matchesQuery;
    connect(): Promise<this>;
    disconnect(): Promise<void>;
    getDb(): this;
    createIndexes(): Promise<void>;
}
declare const _default: MemoryDatabase;
export default _default;
//# sourceMappingURL=memoryDatabase.d.ts.map