#!/bin/bash

set -e  # Exit on any error

# Parse arguments
MODE="${1:-production}"

echo "🏗️  Starting build process..."
echo "📝 Using .env.$MODE for environment variables"

# Define paths
CURRENT_DIR="$(pwd)"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CLIENT_DIR="$ROOT_DIR/client"
CLIENT_BUILD_DIR="$CLIENT_DIR/dist"

SERVER_DIR="$ROOT_DIR/server"
SERVER_BUILD_DIR="$SERVER_DIR/dist"
FUNCTION_BUILD_DIR="$SERVER_BUILD_DIR/packages/default/vote"

# Load environment variables from .env file
if [ -f "$ROOT_DIR/.env.$MODE" ]; then
    echo "📦 Loading environment variables from .env.$MODE..."
    set -a
    source "$ROOT_DIR/.env.$MODE"
    set +a
else
    echo "⚠️  Warning: .env.$MODE not found, continuing without it..."
fi

# Clean up previous build
echo "🧹 Cleaning up previous build..."
rm -rf "$CLIENT_BUILD_DIR"
rm -rf "$SERVER_BUILD_DIR"

# Create build directory structure
echo "📁 Creating server build directory structure..."
mkdir -p "$FUNCTION_BUILD_DIR"

# Copy server files
echo "📦 Copying server files..."
cp -r "$SERVER_DIR/src/"* "$FUNCTION_BUILD_DIR/"

# Copy project configuration files
echo "📋 Copying project configuration..."
cp "$SERVER_DIR/project.yml" "$SERVER_BUILD_DIR/"
cp "$SERVER_DIR/.python-version" "$SERVER_BUILD_DIR/"

echo "🚀 Deploying API to DigitalOcean Functions..."
cd $SERVER_BUILD_DIR && doctl serverless deploy . --env "$ROOT_DIR/.env.$MODE" --build-env "$ROOT_DIR/.env.$MODE"

# Build the Vite app
echo "⚛️  Building Vite app..."
cd "$CLIENT_DIR"
pnpm run build --mode $MODE

# Upload frontend to FTP
echo "📤 Uploading frontend via FTP..."
if [ -z "$FTP_HOST" ] || [ -z "$FTP_USER" ] || [ -z "$FTP_PASSWORD" ] || [ -z "$FTP_DIR" ]; then
    echo "⚠️  FTP credentials not set. Skipping FTP upload."
    echo "   Set FTP_HOST, FTP_USER, FTP_PASSWORD, and FTP_DIR in your environment."
else
    lftp -c "
    set ftp:ssl-force yes;
    set ftp:ssl-protect-data yes;
    set ssl:verify-certificate no;
    open -u $FTP_USER,$FTP_PASSWORD $FTP_HOST;
    mirror --reverse --delete --verbose $CLIENT_BUILD_DIR/ $FTP_DIR;
    bye
    "
    echo "✅ Frontend uploaded to FTP"
fi

# Clean up build directories
echo "🧹 Cleaning up build directories..."
rm -rf "$CLIENT_BUILD_DIR"
rm -rf "$SERVER_BUILD_DIR"

echo "🎉 Build and deployment process completed successfully!"

# Return to the original directory
cd "$CURRENT_DIR"