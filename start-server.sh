#!/bin/bash

# Production server startup script
echo "🚀 Starting SomonScript Management Server"
echo "==========================================="

# Configuration
PORT=${PORT:-8080}
PRODUCTION=${PRODUCTION:-true}
LOG_FORMAT=${LOG_FORMAT:-json}

# Start server with all production features
if [[ "$PRODUCTION" = "true" ]]; then
    echo "📦 Running in PRODUCTION mode"
    echo "📍 Port: $PORT"
    echo "📝 Log format: $LOG_FORMAT"
    echo ""
    
    # Run with structured logging
    if [[ "$LOG_FORMAT" = "json" ]]; then
        node dist/cli.js serve --production --port $PORT --json
    else
        node dist/cli.js serve --production --port $PORT
    fi
else
    echo "🔧 Running in DEVELOPMENT mode"
    node dist/cli.js serve --port $PORT
fi
