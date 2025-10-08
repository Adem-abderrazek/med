#!/bin/bash
# Test script for Docker deployment

echo "🐳 Testing Docker Configuration..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo "✅ Docker is installed"

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  docker-compose not found, trying docker compose..."
    if ! docker compose version &> /dev/null; then
        echo "❌ Neither docker-compose nor 'docker compose' is available"
        exit 1
    else
        echo "✅ Docker Compose (plugin) is available"
        COMPOSE_CMD="docker compose"
    fi
else
    echo "✅ docker-compose is installed"
    COMPOSE_CMD="docker-compose"
fi

# Build the image
echo ""
echo "🔨 Building Docker image..."
$COMPOSE_CMD build

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
else
    echo "❌ Failed to build Docker image"
    exit 1
fi

# Start services
echo ""
echo "🚀 Starting services..."
$COMPOSE_CMD up -d

if [ $? -eq 0 ]; then
    echo "✅ Services started successfully!"
else
    echo "❌ Failed to start services"
    exit 1
fi

# Wait for backend to be healthy
echo ""
echo "⏳ Waiting for backend to be healthy (max 60 seconds)..."
for i in {1..60}; do
    if curl -f http://localhost:5000/ > /dev/null 2>&1; then
        echo "✅ Backend is healthy and responding!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Backend did not become healthy in time"
        echo ""
        echo "📋 Backend logs:"
        $COMPOSE_CMD logs backend
        exit 1
    fi
    sleep 1
    echo -n "."
done

echo ""
echo "📊 Service Status:"
$COMPOSE_CMD ps

echo ""
echo "🎉 All tests passed!"
echo ""
echo "📝 Useful commands:"
echo "  View logs:        $COMPOSE_CMD logs -f backend"
echo "  Stop services:    $COMPOSE_CMD down"
echo "  Restart:          $COMPOSE_CMD restart backend"
echo ""
echo "🌐 Your API is running at: http://localhost:5000"
echo ""

