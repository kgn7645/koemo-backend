const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();

// Serve static files
app.use(express.static(__dirname));

// Create self-signed certificate for local development
const options = {
  key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost.pem'))
};

// Create HTTPS server
https.createServer(options, app).listen(8443, () => {
  console.log('🔒 HTTPS Server running on https://localhost:8443');
  console.log('📄 Access test page at: https://localhost:8443/test_matching.html');
  console.log('⚠️  Note: You may need to accept the self-signed certificate warning in your browser');
});