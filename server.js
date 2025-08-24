// Direct server entry point for Render
const path = require('path');

// Check if dist folder exists
try {
  require('./dist/index.js');
} catch (error) {
  console.error('dist folder not found, running typescript directly');
  // Fallback to typescript if dist doesn't exist
  require('ts-node/register');
  require('./src/index.ts');
}