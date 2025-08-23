import { Db } from 'mongodb';
declare class Database {
    private client;
    private db;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getDb(): Db;
    createIndexes(): Promise<void>;
}
declare const _default: Database;
export default _default;
//# sourceMappingURL=database.d.ts.map