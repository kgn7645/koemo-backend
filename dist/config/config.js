const config = {
    // Server configuration
    server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development',
        apiVersion: process.env.API_VERSION || 'v1'
    },
    // Database configuration
    database: {
        mongodb: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/koemo_development',
            testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/koemo_test',
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                family: 4
            }
        },
        redis: {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            ttl: parseInt(process.env.REDIS_TTL) || 86400 // 24 hours
        }
    },
    // Authentication configuration
    auth: {
        jwt: {
            secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        },
        refreshToken: {
            secret: process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret',
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
        },
        bcrypt: {
            rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
        }
    },
    // WebRTC configuration (SkyWay)
    webrtc: {
        skyway: {
            apiKey: process.env.SKYWAY_API_KEY,
            secretKey: process.env.SKYWAY_SECRET_KEY,
            appId: process.env.SKYWAY_APP_ID
        }
    },
    // CORS configuration
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
        credentials: true
    },
    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },
    // File upload
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        uploadPath: process.env.UPLOAD_PATH || './uploads'
    },
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        dir: process.env.LOG_DIR || './logs',
        maxSize: process.env.LOG_MAX_SIZE || '20m',
        maxFiles: process.env.LOG_MAX_FILES || '14d'
    },
    // Email configuration
    email: {
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        }
    },
    // Apple In-App Purchase
    apple: {
        appSecret: process.env.APPLE_APP_SECRET
    },
    // Push notifications
    push: {
        apns: {
            keyId: process.env.APNS_KEY_ID,
            teamId: process.env.APNS_TEAM_ID,
            authKeyPath: process.env.APNS_AUTH_KEY_PATH,
            production: process.env.APNS_PRODUCTION === 'true'
        }
    },
    // Feature flags
    features: {
        enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
        enableMatching: process.env.ENABLE_MATCHING !== 'false',
        enableCalls: process.env.ENABLE_CALLS !== 'false',
        enableMessages: process.env.ENABLE_MESSAGES !== 'false',
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true'
    },
    // External services
    external: {
        apiTimeout: parseInt(process.env.EXTERNAL_API_TIMEOUT) || 10000
    },
    // Application-specific settings
    app: {
        // Profile disclosure levels and timing
        profileDisclosure: {
            levels: [
                { level: 0, timeSeconds: 0, reveals: ['nickname'] },
                { level: 1, timeSeconds: 30, reveals: ['nickname', 'age'] },
                { level: 2, timeSeconds: 60, reveals: ['nickname', 'age', 'region'] },
                { level: 3, timeSeconds: 180, reveals: ['nickname', 'age', 'region', 'full'] }
            ]
        },
        // TTL settings
        ttl: {
            callHistory: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
            messages: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
            matchingRequest: 5 * 60 * 1000, // 5 minutes in milliseconds
            systemLogs: 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
        },
        // Matching algorithm settings
        matching: {
            maxWaitTime: 30000, // 30 seconds
            poolCheckInterval: 1000, // 1 second
            maxRetriesPerUser: 5
        },
        // Call settings
        call: {
            maxDuration: 4 * 60 * 60 * 1000, // 4 hours
            connectionTimeout: 30000, // 30 seconds
            qualityCheckInterval: 10000 // 10 seconds
        },
        // Ticket settings
        tickets: {
            freeCallsPerDay: 3,
            packages: [
                { id: 'ticket_5pack', count: 5, price: 480 },
                { id: 'ticket_10pack', count: 10, price: 840 },
                { id: 'ticket_20pack', count: 20, price: 1480 }
            ]
        }
    }
};
module.exports = config;
//# sourceMappingURL=config.js.map