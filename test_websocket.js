const WebSocket = require('ws');

// Test WebSocket connection with JWT token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ2dmU4d3RqbjMiLCJkZXZpY2VJZCI6InRlc3QtZGV2aWNlLTEyMyIsImlhdCI6MTc1NTU3OTUwMSwiZXhwIjoxNzU4MTcxNTAxfQ.Z22Y90MB5Zbp-qtU2XHy2t1ghMRCIEmV4PcKLdSuiqU';

const ws = new WebSocket(`ws://localhost:3001?token=${token}`);

ws.on('open', function open() {
  console.log('✅ WebSocket connected');
  
  // Test joining matching queue
  setTimeout(() => {
    console.log('📢 Joining matching queue...');
    ws.send(JSON.stringify({
      type: 'join_matching'
    }));
  }, 1000);
});

ws.on('message', function message(data) {
  const parsed = JSON.parse(data.toString());
  console.log('📨 Received:', parsed);
  
  if (parsed.type === 'matching_started') {
    console.log('🔍 Started matching, queue size:', parsed.data.queueSize);
  }
  
  if (parsed.type === 'match_found') {
    console.log('🎉 Match found!', parsed.data);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket disconnected');
});

// Keep process alive for testing
setTimeout(() => {
  console.log('🛑 Closing connection...');
  ws.close();
  process.exit(0);
}, 10000);