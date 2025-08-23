const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// In-memory storage for testing
const users = [];

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    users: users.length
  });
});

// User registration
app.post('/api/register', (req, res) => {
  console.log('📝 Registration request:', req.body);
  
  const { deviceId, nickname, gender, age, region } = req.body;
  
  if (!deviceId || !nickname || !gender) {
    console.log('❌ Missing required fields');
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Device ID, nickname, and gender are required'
      }
    });
  }
  
  // Check if user already exists
  const existingUser = users.find(u => u.deviceId === deviceId);
  if (existingUser) {
    console.log('⚠️ User already exists:', deviceId);
    return res.status(409).json({
      success: false,
      error: {
        code: 'USER_EXISTS',
        message: 'User with this device ID already exists'
      }
    });
  }
  
  // Create new user
  const userId = uuidv4();
  const user = {
    _id: userId,
    deviceId,
    profile: {
      nickname: nickname.trim(),
      gender,
      age: age ? parseInt(age) : undefined,
      region: region?.trim()
    },
    status: {
      current: 'online',
      lastActiveAt: new Date()
    },
    tickets: {
      balance: 0,
      freeCallsToday: 3
    },
    isBlocked: false,
    blockedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  users.push(user);
  console.log('✅ User created:', { userId, nickname, deviceId });
  
  // Generate fake tokens
  const accessToken = 'fake_access_token_' + Date.now();
  const refreshToken = 'fake_refresh_token_' + Date.now();
  
  res.status(201).json({
    success: true,
    data: {
      userId,
      accessToken,
      refreshToken,
      profile: user.profile
    }
  });
});

// Debug endpoint to see all users
app.get('/api/debug/users', (req, res) => {
  res.json({
    success: true,
    data: {
      count: users.length,
      users: users.map(user => ({
        _id: user._id,
        deviceId: user.deviceId,
        profile: user.profile,
        status: user.status,
        createdAt: user.createdAt
      }))
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❓ Unknown endpoint:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

app.listen(PORT, () => {
  console.log('🚀 Simple KOEMO Backend Server running on port', PORT);
  console.log('📖 Health check: http://localhost:' + PORT + '/health');
  console.log('🐛 Debug users: http://localhost:' + PORT + '/api/debug/users');
});