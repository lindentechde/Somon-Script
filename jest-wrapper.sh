#!/bin/bash

# Node.js version detection
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_VERSION" -ge 23 ]; then
    echo "Node.js 23+ detected, using compatibility flags..."
    export NODE_OPTIONS="--no-experimental-require-module --no-experimental-detect-module --no-warnings"
fi

# Run Jest with all passed arguments
exec npx jest "$@"