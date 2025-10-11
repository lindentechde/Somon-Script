# SomonScript Production Deployment Guide

This guide covers deploying SomonScript in production environments with best
practices for monitoring, security, and performance.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Health Monitoring](#health-monitoring)
- [Metrics & Observability](#metrics--observability)
- [Security Best Practices](#security-best-practices)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)

## Prerequisites

- Node.js 20.x, 22.x, 23.x, or 24.x
- npm or yarn
- 1GB+ available memory
- Linux, macOS, or Windows Server

## Installation

### From npm Registry

```bash
npm install -g @lindentech/somon-script
```

### From Source

```bash
git clone https://github.com/lindentechde/Somon-Script.git
cd Somon-Script
npm install
npm run build
npm link
```

## Configuration

### Production Configuration File

Create `somon.config.json` in your project root:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "sourceMap": true,
    "strict": true,
    "noTypeCheck": false,
    "minify": true,
    "timeout": 120000,
    "inlineSourceMap": false,
    "preserveSymlinks": false
  },
  "moduleSystem": {
    "resolution": {
      "baseUrl": ".",
      "extensions": [".som", ".js"],
      "paths": {},
      "preserveSymlinks": false
    },
    "loading": {
      "circularDependencyStrategy": "error",
      "externals": [],
      "maxCacheSize": 100,
      "parallelLoading": true,
      "preloadModules": []
    },
    "metrics": true,
    "circuitBreakers": true,
    "logger": true,
    "managementServer": true,
    "managementPort": 8080,
    "resourceLimits": {
      "maxMemory": 1024,
      "maxModules": 1000,
      "maxCacheSize": 100,
      "compilationTimeout": 5000,
      "maxMemoryBytes": 1073741824,
      "maxFileHandles": 1000,
      "maxCachedModules": 10000
    }
  },
  "bundle": {
    "format": "commonjs",
    "minify": true,
    "sourceMaps": true,
    "externals": [],
    "outputPath": "./dist",
    "inlineSources": false
  },
  "production": {
    "enableAllSafetyFeatures": true,
    "strictMode": true,
    "errorRecovery": true,
    "telemetry": false
  }
}
```

### Environment Variables

```bash
# Node environment
export NODE_ENV=production

# Logging
export LOG_FORMAT=json
export LOG_LEVEL=info
export SOMON_LOG_FILE=/var/log/somon/app.log
export SOMON_LOG_MAX_SIZE=10485760
export SOMON_LOG_MAX_FILES=5

# Memory limits
export NODE_OPTIONS="--max-old-space-size=1024"

# Management server
export SOMON_MANAGEMENT_PORT=8080
export SOMON_METRICS_ENABLED=true
export SOMON_CIRCUIT_BREAKERS_ENABLED=true
export SOMON_RESOURCE_LIMITER_ENABLED=true

# Performance tuning
export UV_THREADPOOL_SIZE=8
export SOMON_PARALLEL_COMPILATION=true
export SOMON_MODULE_CACHE_SIZE=1000

# Security
export SOMON_STRICT_MODE=true
export SOMON_VALIDATE_INPUTS=true
export SOMON_MAX_AST_DEPTH=100
```

## Health Monitoring

### Starting the Management Server

```bash
# Start management server on port 8080
somon serve --production --port 8080 --json

# Or as part of your application
somon run app.som --production
```

### Health Check Endpoints

#### Basic Health Check

```bash
curl http://localhost:8080/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-11T12:00:00Z",
  "uptime": 3600,
  "version": "0.3.36",
  "checks": [
    {
      "name": "memory",
      "status": "healthy",
      "message": "Memory usage within limits",
      "duration": 1
    },
    {
      "name": "moduleSystem",
      "status": "healthy",
      "message": "Module system operational",
      "duration": 2
    }
  ]
}
```

#### Readiness Check

```bash
curl http://localhost:8080/health/ready
```

Response:

```json
{
  "ready": true,
  "timestamp": "2025-01-11T12:00:00Z",
  "circuitBreakers": {
    "total": 5,
    "healthy": 5,
    "open": 0
  }
}
```

### Load Balancer Configuration

Example HAProxy configuration:

```
backend somon_backend
  option httpchk GET /health/ready
  http-check expect status 200
  server somon1 10.0.1.10:8080 check
  server somon2 10.0.1.11:8080 check
```

## Metrics & Observability

### Prometheus Metrics

Access Prometheus-formatted metrics:

```bash
curl http://localhost:8080/metrics/prometheus
```

Key metrics exposed:

- `somon_script_compilations_total` - Total compilations
- `somon_script_compilations_failed` - Failed compilations
- `somon_script_compilation_time_seconds` - Average compilation time
- `somon_script_modules_total` - Loaded modules
- `somon_script_memory_used_bytes` - Memory usage
- `somon_script_circuit_breaker_state` - Circuit breaker states
- `somon_script_errors_total` - Errors by type

### Prometheus Configuration

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'somon-script'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics/prometheus'
    scrape_interval: 15s
```

### Grafana Dashboard

Import the included Grafana dashboard for visualization:

```json
{
  "dashboard": {
    "title": "SomonScript Metrics",
    "panels": [
      {
        "title": "Compilation Rate",
        "targets": [
          {
            "expr": "rate(somon_script_compilations_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(somon_script_errors_total[5m])"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "somon_script_memory_used_bytes / somon_script_memory_limit_bytes * 100"
          }
        ]
      }
    ]
  }
}
```

### Structured Logging

Enable JSON logging for production:

```bash
somon serve --json
```

Example log entry:

```json
{
  "timestamp": "2025-01-11T12:00:00.000Z",
  "level": "info",
  "message": "Compilation completed",
  "component": "compiler",
  "correlationId": "a1b2c3d4e5f6",
  "context": {
    "file": "app.som",
    "duration": 125,
    "modules": 5
  }
}
```

### Log Aggregation

Configure Filebeat for ELK stack:

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/somon-script/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ['elasticsearch:9200']
  index: 'somon-script-%{+yyyy.MM.dd}'
```

## Security Best Practices

### 1. Use Production Mode

Always run with the `--production` flag:

```bash
somon compile app.som --production
somon serve --production
```

This enables:

- All safety features
- Circuit breakers
- Resource limits
- Strict validation

### 2. Resource Limits

Configure appropriate limits in `somon.config.json`:

```json
{
  "moduleSystem": {
    "resourceLimits": {
      "maxMemoryBytes": 1073741824,
      "maxFileHandles": 1000,
      "maxCachedModules": 10000
    }
  }
}
```

### 3. Input Validation

- Validate all user inputs before compilation
- Set compilation timeouts
- Limit AST depth (future feature)

### 4. Network Security

- Run management server on internal network only
- Use TLS/SSL for production endpoints
- Implement authentication for admin endpoints

Example nginx SSL configuration:

```nginx
server {
  listen 443 ssl;
  server_name somon.example.com;

  ssl_certificate /etc/ssl/certs/somon.crt;
  ssl_certificate_key /etc/ssl/private/somon.key;

  location /health {
    proxy_pass http://localhost:8080/health;
  }

  location /metrics {
    auth_basic "Metrics";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:8080/metrics;
  }
}
```

### 5. File System Permissions

```bash
# Set appropriate ownership
chown -R somon:somon /opt/somon-script

# Restrict permissions
chmod 750 /opt/somon-script
chmod 640 /opt/somon-script/somon.config.json
```

## Systemd Service

### Service Configuration

Create `/etc/systemd/system/somon-script.service`:

```ini
[Unit]
Description=SomonScript Compiler Service
Documentation=https://github.com/lindentechde/Somon-Script
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=somon
Group=somon
WorkingDirectory=/opt/somon-script

# Environment
Environment="NODE_ENV=production"
Environment="NODE_OPTIONS=--max-old-space-size=1024"
Environment="LOG_FORMAT=json"
Environment="LOG_LEVEL=info"

# Start command
ExecStart=/usr/bin/node /opt/somon-script/dist/cli/program.js serve --production --json --port 8080

# Restart policy
Restart=always
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

# Resource limits
LimitNOFILE=65536
LimitNPROC=512
MemoryHigh=1G
MemoryMax=1536M
CPUQuota=80%

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/somon

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=somon-script

[Install]
WantedBy=multi-user.target
```

### Managing the Service

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Start the service
sudo systemctl start somon-script

# Enable auto-start on boot
sudo systemctl enable somon-script

# Check status
sudo systemctl status somon-script

# View logs
sudo journalctl -u somon-script -f

# Restart service
sudo systemctl restart somon-script

# Stop service
sudo systemctl stop somon-script
```

### Log Rotation

Create `/etc/logrotate.d/somon-script`:

```
/var/log/somon/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 somon somon
    sharedscripts
    postrotate
        systemctl reload somon-script > /dev/null 2>&1 || true
    endscript
}
```

## Performance Tuning

### 1. Memory Configuration

```bash
# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=2048"

# Configure in systemd
[Service]
Environment="NODE_OPTIONS=--max-old-space-size=2048"
```

### 2. Module Caching

```json
{
  "moduleSystem": {
    "loading": {
      "maxCacheSize": 1000,
      "maxCacheMemory": 536870912
    }
  }
}
```

### 3. Compilation Optimization

```json
{
  "compilerOptions": {
    "target": "esnext",
    "noTypeCheck": false,
    "minify": true,
    "timeout": 60000
  }
}
```

### 4. Clustering

Use PM2 for process management:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'somon-server',
      script: 'somon',
      args: 'serve --production --json',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        LOG_FORMAT: 'json',
      },
    },
  ],
};
```

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Troubleshooting

### Common Issues

#### High Memory Usage

1. Check for memory leaks:

```bash
curl http://localhost:8080/metrics | grep memory
```

2. Clear module cache:

```bash
curl -X POST http://localhost:8080/admin/reset
```

3. Reduce cache limits:

```json
{
  "resourceLimits": {
    "maxCachedModules": 500
  }
}
```

#### Compilation Timeouts

1. Increase timeout:

```json
{
  "compilerOptions": {
    "timeout": 180000
  }
}
```

2. Check for infinite loops or complex type checking

#### Circuit Breaker Open

1. Check circuit breaker status:

```bash
curl http://localhost:8080/circuit-breakers
```

2. Reset if needed:

```bash
curl -X POST http://localhost:8080/admin/reset
```

### Debug Logging

Enable debug logging:

```bash
export LOG_LEVEL=debug
somon serve --json
```

### Performance Profiling

```bash
# CPU profiling
node --cpu-prof somon compile large-app.som

# Heap snapshot
node --heap-prof somon compile large-app.som
```

## Docker Deployment

### Multi-stage Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /build

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build && \
    npm run test:ci && \
    npm prune --production

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /build/package*.json ./
COPY --chown=nodejs:nodejs somon.config.json ./

# Create log directory
RUN mkdir -p /var/log/somon && \
    chown -R nodejs:nodejs /var/log/somon

USER nodejs

# Expose management server port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/cli/program.js", "serve", "--production", "--json", "--port", "8080"]
```

### Docker Build and Run

```bash
# Build the image
docker build -t somon-script:latest .

# Run with resource limits
docker run -d \
  --name somon \
  -p 8080:8080 \
  --memory="1g" \
  --memory-swap="1g" \
  --cpu-shares=1024 \
  --restart=unless-stopped \
  -v $(pwd)/logs:/var/log/somon \
  -v $(pwd)/app:/app/src:ro \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  somon-script:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  somon:
    build: .
    ports:
      - '8080:8080'
    environment:
      NODE_ENV: production
      LOG_FORMAT: json
      LOG_LEVEL: info
    volumes:
      - ./app:/app/src
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - somon-network

  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - '9090:9090'
    networks:
      - somon-network

networks:
  somon-network:
    driver: bridge
```

## Kubernetes Deployment

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: somon-script
  labels:
    app: somon-script
spec:
  replicas: 3
  selector:
    matchLabels:
      app: somon-script
  template:
    metadata:
      labels:
        app: somon-script
    spec:
      containers:
        - name: somon
          image: somon-script:latest
          ports:
            - containerPort: 8080
          env:
            - name: NODE_ENV
              value: 'production'
            - name: LOG_FORMAT
              value: 'json'
          resources:
            requests:
              memory: '512Mi'
              cpu: '250m'
            limits:
              memory: '1Gi'
              cpu: '1'
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: somon-script-service
spec:
  selector:
    app: somon-script
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: somon-config
data:
  somon.config.json: |
    {
      "compilerOptions": {
        "target": "es2020",
        "sourceMap": true,
        "minify": true
      },
      "moduleSystem": {
        "metrics": true,
        "circuitBreakers": true,
        "managementServer": true
      }
    }
```

### HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: somon-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: somon-script
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Monitoring Checklist

- [ ] Health endpoints accessible
- [ ] Prometheus metrics scraping
- [ ] Logs aggregating to central system
- [ ] Alerts configured for:
  - High error rate
  - Circuit breakers open
  - Memory > 80%
  - Compilation failures > 10/min
- [ ] Dashboard showing key metrics
- [ ] Runbook for common issues

## Support

For production support and issues:

- GitHub Issues: https://github.com/lindentechde/Somon-Script/issues
- Documentation: https://github.com/lindentechde/Somon-Script/wiki
- Email: info@lindentech.de
