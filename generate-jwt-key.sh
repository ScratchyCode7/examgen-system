#!/bin/bash
# Generate secure JWT signing key for production

echo "🔐 JWT Signing Key Generator"
echo "============================"
echo ""

if command -v openssl >/dev/null 2>&1; then
    echo "Generating secure JWT signing key..."
    echo ""
    JWT_KEY=$(openssl rand -base64 64 | tr -d '\n')
    echo "Your JWT Signing Key:"
    echo "---------------------"
    echo "$JWT_KEY"
    echo ""
    echo "⚠️  IMPORTANT: Save this key securely!"
    echo "Add it to Render environment variables as: Jwt__SigningKey"
    echo ""
    
    # Calculate key length
    KEY_LENGTH=${#JWT_KEY}
    if [ $KEY_LENGTH -ge 32 ]; then
        echo "✓ Key length: $KEY_LENGTH characters (secure)"
    else
        echo "⚠ Warning: Key length is $KEY_LENGTH characters (should be at least 32)"
    fi
else
    echo "❌ Error: OpenSSL not found"
    echo ""
    echo "Please install OpenSSL to generate a secure key:"
    echo "  - macOS: brew install openssl"
    echo "  - Ubuntu/Debian: apt-get install openssl"
    echo "  - Windows: Use Git Bash or WSL"
    echo ""
    echo "Alternatively, use online generator: https://generate-secret.vercel.app/64"
fi

echo ""
