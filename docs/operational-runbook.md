# SomonScript Module System - Operational Runbook

## Emergency Response Procedures

### Critical Issues (P1)

#### System Down - Module Loading Completely Failing

**Symptoms:**
- All module load operations returning errors
- Health endpoint returning 500 status
- Application unable to start

**Immediate Response:**
1. Check system health: `curl http://localhost:8080/health`
2. Check logs: `docker logs container_name | tail -100`
3. Restart service if corrupted state detected
4. Escalate if restart doesn't resolve

**Root Cause Analysis:**
```bash
# Check recent error patterns
curl http://localhost:8080/metrics | jq '.loadErrors'

# Review structured logs for error correlation
grep "ERROR" /var/log/somon/module-system.log | tail -20

# Check for memory/resource issues
curl http://localhost:8080/health | jq '.checks[] | select(.name=="memory")'
```

#### Memory Leak - Continuous Memory Growth

**Symptoms:**
- Memory usage continuously increasing
- Cache memory usage above limits
- System becoming unresponsive

**Immediate Response:**
1. Check current memory usage: `curl http://localhost:8080/metrics | jq '.cacheMemoryUsage'`
2. Clear cache if safe: `curl -X POST http://localhost:8080/cache/clear`
3. Reduce cache size: `curl -X POST http://localhost:8080/config -d '{"maxCacheSize": 100}'`
4. Restart if memory usage critical (>95%)

### High Impact Issues (P2)

#### High Latency - P99 > 500ms

**Investigation Steps:**
```bash
# Check latency metrics
curl http://localhost:8080/metrics | jq '.loadLatency'

# Identify slow external dependencies
curl http://localhost:8080/metrics | jq '.circuitBreakers'

# Check cache hit rate
curl http://localhost:8080/metrics | jq '.cacheHitRate'
```

**Mitigation:**
1. If cache hit rate < 70%: Increase cache size
2. If external deps slow: Check circuit breaker status
3. If system overloaded: Scale horizontally

#### Circuit Breakers Open

**Investigation:**
```bash
# Check which circuit breakers are open
curl http://localhost:8080/circuit-breakers/status

# Check failure patterns
grep "CircuitBreaker" /var/log/somon/module-system.log | tail -10
```

**Resolution:**
1. Verify external dependency health
2. Wait for automatic recovery (30s default)
3. Manual reset if dependency confirmed healthy:
   ```bash
   curl -X POST http://localhost:8080/circuit-breakers/reset/dependency-name
   ```

## Performance Monitoring

### Key Metrics Dashboard

Create monitoring dashboards with these critical metrics:

```json
{
  "dashboard": "SomonScript Module System",
  "metrics": [
    {
      "name": "Load Latency P99",
      "query": "somon_load_latency_p99",
      "threshold": 100,
      "unit": "ms"
    },
    {
      "name": "Cache Hit Rate",
      "query": "somon_cache_hit_rate",
      "threshold": 0.8,
      "unit": "ratio"
    },
    {
      "name": "Error Rate",
      "query": "somon_load_errors_rate",
      "threshold": 0.05,
      "unit": "ratio"
    },
    {
      "name": "Memory Usage",
      "query": "somon_memory_usage_percent",
      "threshold": 85,
      "unit": "percent"
    },
    {
      "name": "CPU Usage",
      "query": "somon_cpu_usage_percent",
      "threshold": 80,
      "unit": "percent"
    }
  ]
}
```

### Alert Thresholds

#### Critical Alerts (Immediate Response)
- Load latency P99 > 1000ms for 2 minutes
- Error rate > 10% for 1 minute
- Memory usage > 95% for 30 seconds
- System health status = "unhealthy"

#### Warning Alerts (Investigation Required)
- Load latency P99 > 500ms for 5 minutes
- Error rate > 5% for 2 minutes
- Memory usage > 85% for 2 minutes
- CPU usage > 80% for 5 minutes
- Cache hit rate < 70% for 10 minutes

### Performance Baselines

#### Healthy System Characteristics
```yaml
metrics_baselines:
  load_latency_p50: 5ms
  load_latency_p99: 50ms
  cache_hit_rate: 85%
  error_rate: 0.1%
  memory_usage: 60%
  cpu_usage: 20%
  cache_efficiency: 90%
```

## Capacity Planning

### Scaling Triggers

#### Horizontal Scaling (Add Instances)
- CPU usage > 70% sustained for 10 minutes
- Memory usage > 80% sustained for 5 minutes
- Load latency P99 > 200ms sustained for 5 minutes
- Request rate > 1000 RPS per instance

#### Vertical Scaling (Increase Resources)
- Frequent cache evictions (hit rate dropping)
- Memory pressure warnings in health checks
- GC pressure (monitor Node.js GC metrics)

### Resource Estimation

```javascript
// Calculate resource requirements
function estimateResources(moduleCount, requestsPerSecond) {
  const baseMemoryMB = 50;
  const memoryPerModuleMB = 0.05;
  const memoryOverheadFactor = 1.5;
  
  const estimatedMemoryMB = 
    (baseMemoryMB + (moduleCount * memoryPerModuleMB)) * 
    memoryOverheadFactor;
  
  const cpuCores = Math.ceil(requestsPerSecond / 1000);
  
  return {
    memory: `${Math.ceil(estimatedMemoryMB)}Mi`,
    cpu: `${cpuCores * 100}m`,
    instances: Math.ceil(requestsPerSecond / 1000)
  };
}

// Examples:
// 1000 modules, 500 RPS: 128Mi memory, 100m CPU, 1 instance
// 5000 modules, 2000 RPS: 384Mi memory, 200m CPU, 2 instances
```

## Maintenance Procedures

### Rolling Updates

```bash
#!/bin/bash
# Rolling update script for Kubernetes

set -e

DEPLOYMENT_NAME="somon-module-system"
NEW_IMAGE="somon-module-system:${VERSION}"

echo "Starting rolling update to ${NEW_IMAGE}"

# Update image
kubectl set image deployment/${DEPLOYMENT_NAME} \
  somon=${NEW_IMAGE}

# Wait for rollout
kubectl rollout status deployment/${DEPLOYMENT_NAME} \
  --timeout=300s

# Verify health
for i in {1..5}; do
  if kubectl get pods -l app=${DEPLOYMENT_NAME} \
     -o jsonpath='{.items[*].status.phase}' | \
     grep -q "Running"; then
    echo "Rolling update successful"
    exit 0
  fi
  sleep 10
done

echo "Rolling update failed - initiating rollback"
kubectl rollout undo deployment/${DEPLOYMENT_NAME}
exit 1
```

### Cache Management

#### Cache Warming
```bash
# Pre-populate cache with common modules
curl -X POST http://localhost:8080/cache/warm \
  -H "Content-Type: application/json" \
  -d '{
    "modules": [
      "./common/utils.som",
      "./common/types.som", 
      "./common/helpers.som"
    ]
  }'
```

#### Cache Analysis
```bash
# Analyze cache effectiveness
curl http://localhost:8080/cache/stats | jq '{
  hitRate: .hitRate,
  size: .size,
  memoryUsage: .memoryUsage,
  topModules: .mostAccessed[0:10]
}'
```

#### Cache Cleanup
```bash
# Remove stale cache entries
curl -X POST http://localhost:8080/cache/cleanup

# Full cache clear (use carefully)
curl -X POST http://localhost:8080/cache/clear
```

### Configuration Management

#### Backup Configuration
```bash
# Backup current configuration
curl http://localhost:8080/config > config-backup-$(date +%Y%m%d-%H%M%S).json
```

#### Apply Configuration Changes
```bash
# Load test configuration
curl -X POST http://localhost:8080/config \
  -H "Content-Type: application/json" \
  -d @new-config.json

# Verify configuration applied
curl http://localhost:8080/config | jq .
```

## Disaster Recovery

### Backup Procedures

#### Configuration Backup
```bash
#!/bin/bash
# Daily configuration backup

BACKUP_DIR="/backup/somon-config"
DATE=$(date +%Y%m%d)

mkdir -p ${BACKUP_DIR}/${DATE}

# Backup configuration
curl http://localhost:8080/config > \
  ${BACKUP_DIR}/${DATE}/config.json

# Backup metrics history (if persisted)
curl http://localhost:8080/metrics/export > \
  ${BACKUP_DIR}/${DATE}/metrics.json

# Cleanup old backups (keep 30 days)
find ${BACKUP_DIR} -type d -mtime +30 -exec rm -rf {} \;
```

### Recovery Procedures

#### Service Recovery After Failure
```bash
#!/bin/bash
# Service recovery script

set -e

SERVICE_NAME="somon-module-system"
BACKUP_CONFIG="/backup/somon-config/latest/config.json"

echo "Starting service recovery for ${SERVICE_NAME}"

# Restart service
systemctl restart ${SERVICE_NAME}

# Wait for service to be ready
for i in {1..30}; do
  if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "Service is healthy"
    break
  fi
  sleep 5
done

# Restore configuration if available
if [ -f "${BACKUP_CONFIG}" ]; then
  echo "Restoring configuration"
  curl -X POST http://localhost:8080/config \
    -H "Content-Type: application/json" \
    -d @${BACKUP_CONFIG}
fi

echo "Service recovery completed"
```

#### Data Loss Recovery
```bash
# Clear corrupted cache and restart fresh
systemctl stop somon-module-system
rm -rf /var/cache/somon/*
systemctl start somon-module-system

# Verify recovery
sleep 10
curl http://localhost:8080/health
```

## Security Incident Response

### Unauthorized Access Detection
```bash
# Check for unusual activity patterns
grep "WARN\|ERROR" /var/log/somon/access.log | \
  grep -E "(40[0-9]|50[0-9])" | \
  tail -20

# Check for configuration changes
grep "config" /var/log/somon/module-system.log | \
  grep -v "GET" | \
  tail -10
```

### Security Lockdown
```bash
# Disable management endpoints temporarily
curl -X POST http://localhost:8080/config \
  -d '{"managementApiEnabled": false}'

# Enable authentication requirement
curl -X POST http://localhost:8080/config \
  -d '{"requireAuth": true}'
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: "Module not found" errors increasing
**Investigation:**
- Check external dependency availability
- Verify network connectivity
- Review circuit breaker status

**Resolution:**
- Add missing dependencies to externals list
- Fix network configuration
- Reset circuit breakers if dependencies recovered

#### Issue: Slow startup times
**Investigation:**
- Check cold start metrics
- Review module dependency graph
- Analyze cache warming effectiveness

**Resolution:**
- Implement cache pre-warming
- Optimize module dependency structure
- Consider dependency bundling

#### Issue: Memory usage growing over time
**Investigation:**
- Monitor for cache size growth
- Check for memory leaks in user code
- Review GC patterns

**Resolution:**
- Adjust cache size limits
- Implement periodic cache cleanup
- Update to latest Node.js version

### Diagnostic Commands

```bash
# System health overview
curl -s http://localhost:8080/health | jq '.'

# Performance metrics summary
curl -s http://localhost:8080/metrics | jq '{
  loadLatency: .loadLatency.p99,
  errorRate: .loadErrors / .totalLoads,
  cacheHitRate: .cacheHitRate,
  memoryUsage: .systemMetrics.memoryUsage
}'

# Circuit breaker status
curl -s http://localhost:8080/circuit-breakers/status | jq '.'

# Configuration dump
curl -s http://localhost:8080/config | jq '.'
```

## Contact Information

### Escalation Path
1. **L1 Support**: Basic health checks and restarts
2. **L2 Support**: Performance analysis and configuration changes  
3. **L3 Support**: Code-level debugging and architectural changes
4. **Engineering**: Critical system issues and feature development

### Emergency Contacts
- **On-Call Engineer**: +1-555-0123
- **DevOps Team**: devops@company.com
- **Platform Team**: platform@company.com

This runbook provides comprehensive operational guidance for maintaining a production SomonScript module system with 99.9% availability and enterprise-grade reliability.
