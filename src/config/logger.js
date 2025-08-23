const winston = require('winston');
const path = require('path');
const config = require('./config');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = config.logging.dir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

// Define transports
const transports = [];

// Console transport for development
if (config.server.environment !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: config.logging.level,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} ${level}: ${message} ${metaStr}`;
        })
      )
    })
  );
}

// File transports
transports.push(
  // Error log file
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: logFormat,
    maxsize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles
  }),
  
  // Application events log
  new winston.transports.File({
    filename: path.join(logDir, 'app.log'),
    level: 'info',
    format: logFormat,
    maxsize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: 'koemo-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.server.environment
  },
  transports,
  exitOnError: false
});

// Add request ID and user context to logs
logger.addRequestContext = (req) => {
  return {
    requestId: req.id || req.headers['x-request-id'],
    userId: req.user?.id,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  };
};

// Security logging methods
logger.security = (message, meta = {}) => {
  logger.warn(`[SECURITY] ${message}`, { 
    ...meta, 
    category: 'security',
    timestamp: new Date().toISOString()
  });
};

// Performance logging methods
logger.performance = (message, meta = {}) => {
  logger.info(`[PERFORMANCE] ${message}`, { 
    ...meta, 
    category: 'performance',
    timestamp: new Date().toISOString()
  });
};

// Business logic logging methods
logger.business = (message, meta = {}) => {
  logger.info(`[BUSINESS] ${message}`, { 
    ...meta, 
    category: 'business',
    timestamp: new Date().toISOString()
  });
};

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logDir, 'exceptions.log'),
    format: logFormat
  })
);

logger.rejections.handle(
  new winston.transports.File({ 
    filename: path.join(logDir, 'rejections.log'),
    format: logFormat
  })
);

module.exports = logger;