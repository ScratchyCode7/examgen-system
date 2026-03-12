#!/bin/bash
# Pre-deployment checklist and setup script for Databank

echo "🚀 Databank Deployment Setup"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status 0 "Node.js installed: $NODE_VERSION"
else
    print_status 1 "Node.js is not installed"
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_status 0 "npm installed: $NPM_VERSION"
else
    print_status 1 "npm is not installed"
fi

# Check .NET
if command_exists dotnet; then
    DOTNET_VERSION=$(dotnet --version)
    print_status 0 ".NET SDK installed: $DOTNET_VERSION"
else
    print_status 1 ".NET SDK is not installed"
fi

# Check Git
if command_exists git; then
    GIT_VERSION=$(git --version)
    print_status 0 "Git installed: $GIT_VERSION"
else
    print_status 1 "Git is not installed"
fi

# Check PostgreSQL
if command_exists psql; then
    PSQL_VERSION=$(psql --version)
    print_status 0 "PostgreSQL client installed: $PSQL_VERSION"
else
    print_warning "PostgreSQL client not installed (optional for local development)"
fi

echo ""
echo "Checking project files..."
echo ""

# Check if backend exists
if [ -d "src" ]; then
    print_status 0 "Backend directory exists (src/)"
else
    print_status 1 "Backend directory not found (src/)"
fi

# Check if frontend exists
if [ -d "client" ]; then
    print_status 0 "Frontend directory exists (client/)"
else
    print_status 1 "Frontend directory not found (client/)"
fi

# Check if Program.cs exists
if [ -f "src/Program.cs" ]; then
    print_status 0 "Backend entry point exists (Program.cs)"
else
    print_status 1 "Program.cs not found"
fi

# Check if package.json exists in client
if [ -f "client/package.json" ]; then
    print_status 0 "Frontend package.json exists"
else
    print_status 1 "Frontend package.json not found"
fi

echo ""
echo "Checking configuration files..."
echo ""

# Check frontend .env.example
if [ -f "client/.env.example" ]; then
    print_status 0 "Frontend .env.example exists"
else
    print_status 1 "Frontend .env.example not found"
fi

# Check backend appsettings
if [ -f "src/appsettings.json" ]; then
    print_status 0 "Backend appsettings.json exists"
else
    print_status 1 "Backend appsettings.json not found"
fi

# Check DEPLOYMENT.md
if [ -f "DEPLOYMENT.md" ]; then
    print_status 0 "Deployment guide exists"
else
    print_status 1 "DEPLOYMENT.md not found"
fi

echo ""
echo "====================================="
echo "🔐 Generate JWT Signing Key"
echo "====================================="
echo ""
echo "Your JWT signing key (save this securely):"
echo ""

if command_exists openssl; then
    JWT_KEY=$(openssl rand -base64 64 | tr -d '\n')
    echo -e "${GREEN}${JWT_KEY}${NC}"
else
    echo -e "${YELLOW}OpenSSL not found. Generate key manually:${NC}"
    echo "openssl rand -base64 64"
fi

echo ""
echo "====================================="
echo "📋 Deployment Checklist"
echo "====================================="
echo ""
echo "Before deploying, ensure you have:"
echo ""
echo "□ Created accounts on:"
echo "  - Vercel (https://vercel.com)"
echo "  - Render (https://render.com)"
echo "  - Neon (https://neon.tech)"
echo ""
echo "□ Pushed code to GitHub repository"
echo ""
echo "□ Created Neon database and copied connection string"
echo ""
echo "□ Generated JWT signing key (see above)"
echo ""
echo "□ Read DEPLOYMENT.md for complete instructions"
echo ""
echo "====================================="
echo "Next Steps:"
echo "====================================="
echo ""
echo "1. Follow DEPLOYMENT.md for detailed deployment instructions"
echo "2. Start with database setup (Neon)"
echo "3. Deploy backend (Render)"
echo "4. Deploy frontend (Vercel)"
echo "5. Test the complete flow"
echo ""
echo "Good luck! 🚀"
