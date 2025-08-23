export namespace server {
    let port: string | number;
    let environment: string;
    let apiVersion: string;
}
export namespace database {
    namespace mongodb {
        let uri: string;
        let testUri: string;
        namespace options {
            let useNewUrlParser: boolean;
            let useUnifiedTopology: boolean;
            let maxPoolSize: number;
            let serverSelectionTimeoutMS: number;
            let socketTimeoutMS: number;
            let family: number;
        }
    }
    namespace redis {
        let url: string;
        let ttl: number;
    }
}
export namespace auth {
    namespace jwt {
        let secret: string;
        let expiresIn: string;
    }
    namespace refreshToken {
        let secret_1: string;
        export { secret_1 as secret };
        let expiresIn_1: string;
        export { expiresIn_1 as expiresIn };
    }
    namespace bcrypt {
        let rounds: number;
    }
}
export namespace webrtc {
    namespace skyway {
        let apiKey: string | undefined;
        let secretKey: string | undefined;
        let appId: string | undefined;
    }
}
export namespace cors {
    let origin: string[];
    let credentials: boolean;
}
export namespace rateLimit {
    let windowMs: number;
    let maxRequests: number;
}
export namespace upload {
    let maxFileSize: number;
    let uploadPath: string;
}
export namespace logging {
    let level: string;
    let dir: string;
    let maxSize: string;
    let maxFiles: string;
}
export namespace email {
    namespace smtp {
        export let host: string | undefined;
        let port_1: number;
        export { port_1 as port };
        export let secure: boolean;
        export namespace auth_1 {
            let user: string | undefined;
            let pass: string | undefined;
        }
        export { auth_1 as auth };
    }
}
export namespace apple {
    let appSecret: string | undefined;
}
export namespace push {
    namespace apns {
        let keyId: string | undefined;
        let teamId: string | undefined;
        let authKeyPath: string | undefined;
        let production: boolean;
    }
}
export namespace features {
    let enableRegistration: boolean;
    let enableMatching: boolean;
    let enableCalls: boolean;
    let enableMessages: boolean;
    let maintenanceMode: boolean;
}
export namespace external {
    let apiTimeout: number;
}
export namespace app {
    export namespace profileDisclosure {
        let levels: {
            level: number;
            timeSeconds: number;
            reveals: string[];
        }[];
    }
    export namespace ttl_1 {
        let callHistory: number;
        let messages: number;
        let matchingRequest: number;
        let systemLogs: number;
    }
    export { ttl_1 as ttl };
    export namespace matching {
        let maxWaitTime: number;
        let poolCheckInterval: number;
        let maxRetriesPerUser: number;
    }
    export namespace call {
        let maxDuration: number;
        let connectionTimeout: number;
        let qualityCheckInterval: number;
    }
    export namespace tickets {
        let freeCallsPerDay: number;
        let packages: {
            id: string;
            count: number;
            price: number;
        }[];
    }
}
//# sourceMappingURL=config.d.ts.map