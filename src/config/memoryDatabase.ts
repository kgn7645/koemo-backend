// Temporary in-memory database for development when MongoDB is not available
interface MemoryCollection {
  [key: string]: any[];
}

class MemoryDatabase {
  private collections: MemoryCollection = {
    users: [],
    calls: [],
    messages: [],
    reports: []
  };

  collection(name: string) {
    if (!this.collections[name]) {
      this.collections[name] = [];
    }

    return {
      insertOne: async (doc: any) => {
        const id = this.generateId();
        const newDoc = { ...doc, _id: id };
        this.collections[name].push(newDoc);
        return { insertedId: id };
      },

      findOne: async (query: any) => {
        return this.collections[name].find(doc => this.matchesQuery(doc, query)) || null;
      },

      find: async (query: any = {}) => {
        return {
          toArray: async () => this.collections[name].filter(doc => this.matchesQuery(doc, query))
        };
      },

      updateOne: async (query: any, update: any) => {
        const index = this.collections[name].findIndex(doc => this.matchesQuery(doc, query));
        if (index !== -1) {
          if (update.$set) {
            this.collections[name][index] = { ...this.collections[name][index], ...update.$set };
          }
          return { modifiedCount: 1 };
        }
        return { modifiedCount: 0 };
      },

      deleteOne: async (query: any) => {
        const index = this.collections[name].findIndex(doc => this.matchesQuery(doc, query));
        if (index !== -1) {
          this.collections[name].splice(index, 1);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      },

      createIndex: async (_index: any, _options?: any) => {
        // No-op for memory database
        return Promise.resolve();
      }
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private matchesQuery(doc: any, query: any): boolean {
    if (Object.keys(query).length === 0) return true;

    for (const [key, value] of Object.entries(query)) {
      if (key.includes('.')) {
        // Handle nested properties like 'status.current'
        const keys = key.split('.');
        let current = doc;
        for (const k of keys) {
          if (current && typeof current === 'object') {
            current = current[k];
          } else {
            current = undefined;
            break;
          }
        }
        if (current !== value) return false;
      } else {
        if (doc[key] !== value) return false;
      }
    }
    return true;
  }

  async connect() {
    console.log('✅ Using in-memory database (MongoDB not available)');
    return this;
  }

  async disconnect() {
    console.log('Disconnected from in-memory database');
  }

  getDb() {
    return this;
  }

  async createIndexes() {
    console.log('Indexes created (in-memory)');
  }
}

export default new MemoryDatabase();