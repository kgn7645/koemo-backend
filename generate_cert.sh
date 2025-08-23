#!/bin/bash

# Generate self-signed certificate for localhost
echo "🔐 Generating self-signed certificate for localhost..."

# Generate private key
openssl genrsa -out localhost-key.pem 2048

# Generate certificate
openssl req -new -x509 -key localhost-key.pem -out localhost.pem -days 365 \
  -subj "/C=JP/ST=Tokyo/L=Tokyo/O=KOEMO/OU=Development/CN=localhost"

echo "✅ Certificate generated successfully!"
echo "📁 Files created:"
echo "   - localhost-key.pem (private key)"
echo "   - localhost.pem (certificate)"
echo ""
echo "🚀 You can now run: node start_https_server.js"