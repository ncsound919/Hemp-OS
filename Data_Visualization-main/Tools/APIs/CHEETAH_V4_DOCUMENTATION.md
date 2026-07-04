# Cheetah v4 Enhanced API Gateway Documentation

## Overview

The Cheetah v4 Enhanced API Gateway represents a significant upgrade to the Unified Scientific API Gateway, incorporating advanced monitoring, analytics, basketball-biotech integration, and intelligent routing capabilities. This documentation covers the enhanced features, API endpoints, and integration patterns.

## Key Enhancements

### 1. Real-time API Monitoring
- **Prometheus Metrics**: Built-in Prometheus metrics endpoint for monitoring
- **Health Scoring**: Dynamic health scores for all tools (0.0-1.0 scale)
- **Performance Analytics**: Real-time request/response analytics
- **Alert System**: Configurable alerting based on thresholds

### 2. Basketball-Biotech Integration
- **Performance Analysis**: Advanced athlete performance scoring
- **Health Assessment**: Comprehensive health score calculation
- **Fatigue Monitoring**: Multi-factor fatigue level assessment
- **Injury Risk Prediction**: Predictive injury risk modeling
- **Personalized Recommendations**: AI-driven training and recovery recommendations

### 3. Enhanced Tool Execution
- **Intelligent Retry Logic**: Configurable retry mechanisms with exponential backoff
- **Priority-based Routing**: Request prioritization (low/normal/high/critical)
- **Correlation ID Tracking**: End-to-end request tracking
- **Health-aware Routing**: Automatic routing based on tool health scores

### 4. Advanced Error Handling
- **Circuit Breaker Pattern**: Automatic failover for unhealthy services
- **Graceful Degradation**: Fallback mechanisms for service failures
- **Detailed Error Reporting**: Enhanced error context and diagnostics
- **Auto-recovery**: Automatic health check and recovery scheduling

## API Endpoints

### Base URL
```
http://localhost:8000
```

### Core Endpoints

#### Health Check
```http
GET /health
```
Returns gateway health status.

#### Tools Management
```http
GET /api/v1/tools
```
Returns list of all available tools with enhanced health information.

**Response Example:**
```json
{
  "count": 8,
  "tools": [
    {
      "id": "biosim",
      "name": "Biosim",
      "port": 8003,
      "description": "Enhanced MCP service on port 8003",
      "status": "healthy",
      "health_score": 0.92,
      "last_checked": "2026-02-03T10:30:00Z",
      "response_time_ms": 45.2
    }
  ],
  "timestamp": "2026-02-03T10:30:00Z",
  "overall_health_score": 0.85
}
```

#### Tool Execution
```http
POST /api/v1/tools/{tool_id}/execute
```
Execute a tool with enhanced features.

**Request Body:**
```json
{
  "endpoint_path": "/v1/fold",
  "params": {
    "fastas": ["MAKEFASTASEQUENCE"],
    "mode": "cpu"
  },
  "correlation_id": "req_12345",
  "priority": "high",
  "timeout_seconds": 120,
  "retry_config": {
    "max_retries": 3,
    "backoff_factor": 1.0,
    "retry_on_status": [502, 503, 504]
  }
}
```

### Analytics Endpoints

#### API Metrics
```http
GET /api/v1/analytics/metrics
```
Get comprehensive API analytics.

**Query Parameters:**
- `time_range`: 1h, 6h, 24h, 7d, 30d (default: 1h)
- `granularity`: 1m, 5m, 15m, 1h, 1d (default: 5m)

**Response Example:**
```json
{
  "request_count": 1250,
  "error_count": 12,
  "avg_response_time_ms": 245.5,
  "p95_response_time_ms": 512.3,
  "p99_response_time_ms": 890.1,
  "success_rate": 0.9904,
  "active_requests": 8,
  "tool_health_scores": {
    "biosim": 0.92,
    "genmutant": 0.85,
    "pathosphere": 0.78
  }
}
```

#### Prometheus Metrics
```http
GET /metrics
```
Prometheus-formatted metrics for monitoring systems.

### Basketball-Biotech Integration

#### Integration Analysis
```http
POST /api/v1/integrations/basketball-biotech
```
Integrate basketball analytics with biotech data.

**Request Body:**
```json
{
  "player_id": "player_001",
  "biometric_data": {
    "heart_rate_recovery": 120,
    "sleep_quality": 0.8,
    "hydration_level": 0.9
  },
  "performance_metrics": {
    "points_per_game": 25.5,
    "assists_per_game": 7.2,
    "field_goal_percentage": 48.5
  },
  "health_indicators": {
    "heart_rate_variability": 65,
    "cortisol_level": 12.5
  }
}
```

**Response Example:**
```json
{
  "correlation_id": "int_67890",
  "analysis_type": "basketball_biotech_integration",
  "results": {
    "player_id": "player_001",
    "performance_score": 0.82,
    "health_score": 0.76,
    "fatigue_level": "moderate",
    "overall_score": 0.80
  },
  "confidence_score": 0.88,
  "recommendations": [
    "Focus on skill-specific training drills",
    "Increase recovery time by 20%"
  ],
  "generated_at": "2026-02-03T10:30:00Z"
}
```

## Monitoring Service

### Overview
The API Monitoring Service runs alongside the gateway on port 8001, providing real-time monitoring, alerting, and dashboard capabilities.

### Endpoints

#### Health Check
```http
GET http://localhost:8001/health
```

#### Real-time Metrics
```http
GET http://localhost:8001/metrics/realtime
```

#### Alert Management
```http
GET http://localhost:8001/alerts
POST http://localhost:8001/alerts/{alert_id}/resolve
```

#### Dashboard
```http
GET http://localhost:8001/dashboard
```

## Advanced Basketball-Biotech Integration API

### Overview
Advanced integration API running on port 8002 with sophisticated analytics capabilities.

### Endpoints

#### Integration Analysis (v2)
```http
POST http://localhost:8002/api/v2/integrate
```

#### Player History
```http
GET http://localhost:8002/api/v2/player/{player_id}/history?days=30
```

## Configuration

### Environment Variables

```bash
# Gateway Configuration
API_GATEWAY_HOST=0.0.0.0
API_GATEWAY_PORT=8000
LOG_LEVEL=INFO

# Monitoring Configuration
MONITORING_ENABLED=true
MONITORING_PORT=8001
ALERT_THRESHOLD_RESPONSE_TIME_MS=1000
ALERT_THRESHOLD_ERROR_RATE=0.1

# Redis Configuration (for monitoring)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Tool Configuration
The gateway automatically discovers tools based on the `TOOL_PORTS` configuration:

```python
TOOL_PORTS = {
    "pathosphere": 8001,
    "genmutant": 8002,
    "biosim": 8003,
    "opencrispr": 8004,
    "monai": 8005,
    "notebook": 8006,
    "bioware": 8007,
    "qlcce": 8008,
}
```

## Health Scoring Algorithm

### Tool Health Score Calculation
The health score (0.0-1.0) is calculated based on:

1. **Status Factor** (40%):
   - Healthy: 1.0
   - Unhealthy: 0.5
   - Unavailable: 0.0

2. **Response Time Factor** (30%):
   - < 100ms: 1.0
   - 100-500ms: 0.8
   - 500-1000ms: 0.6
   - > 1000ms: 0.4

3. **Recency Factor** (30%):
   - < 1 minute: 1.0
   - 1-5 minutes: 0.8
   - 5-30 minutes: 0.6
   - > 30 minutes: 0.4

### Overall System Health
Calculated as the average of all tool health scores, weighted by usage frequency.

## Error Handling and Retry Logic

### Retry Configuration
```python
retry_config = {
    'max_retries': 3,           # Maximum number of retry attempts
    'backoff_factor': 1.0,      # Base backoff time in seconds
    'retry_on_status': [502, 503, 504],  # HTTP status codes to retry
    'jitter': True              # Add random jitter to prevent thundering herd
}
```

### Circuit Breaker Pattern
The gateway implements a circuit breaker pattern with three states:

1. **Closed**: Normal operation, requests pass through
2. **Open**: Circuit is open, requests fail fast
3. **Half-Open**: Limited requests allowed to test recovery

Thresholds:
- Failure threshold: 50% failure rate over 1 minute
- Recovery threshold: 90% success rate over 30 seconds
- Reset timeout: 60 seconds

## Performance Optimization

### Caching Strategy
- **Response Caching**: 5-minute TTL for successful responses
- **Health Check Caching**: 30-second TTL for tool health status
- **Configuration Caching**: 5-minute TTL for static configurations

### Connection Pooling
- **HTTP Client Pool**: Reusable HTTP client connections
- **Database Connection Pool**: For monitoring data storage
- **Redis Connection Pool**: For distributed caching

### Load Balancing
- **Round-robin**: For evenly distributed load
- **Health-aware**: Prefer healthier instances
- **Latency-based**: Route to lowest latency instances

## Security Features

### Authentication & Authorization
- **API Key Validation**: For external API calls
- **JWT Tokens**: For internal service communication
- **Role-based Access Control**: Fine-grained permission management

### Rate Limiting
- **IP-based Limiting**: 100 requests/minute per IP
- **API Key Limiting**: 1000 requests/minute per key
- **Burst Protection**: Allow short bursts with smoothing

### Data Protection
- **Request/Response Logging**: Sanitized logging (no sensitive data)
- **Encryption**: TLS 1.3 for all external communications
- **Data Masking**: Automatic masking of sensitive fields

## Deployment

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "unified_scientific_api.py"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  api-gateway:
    build: .
    ports:
      - "8000:8000"
    environment:
      - REDIS_HOST=redis
      - LOG_LEVEL=INFO
    depends_on:
      - redis
  
  monitoring:
    build: ./monitoring
    ports:
      - "8001:8001"
    environment:
      - GATEWAY_URL=http://api-gateway:8000
      - REDIS_HOST=redis
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cheetah-v4-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cheetah-v4-gateway
  template:
    metadata:
      labels:
        app: cheetah-v4-gateway
    spec:
      containers:
      - name: gateway
        image: cheetah-v4-gateway:latest
        ports:
        - containerPort: 8000
        env:
        - name: REDIS_HOST
          value: "redis-service"
---
apiVersion: v1
kind: Service
metadata:
  name: cheetah-v4-service
spec:
  selector:
    app: cheetah-v4-gateway
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

## Testing

### Unit Tests
```bash
python -m pytest tests/ -v
```

### Integration Tests
```bash
python test_cheetah_v4_enhancements.py
```

### Load Testing
```bash
# Using locust
locust -f load_test.py --host=http://localhost:8000
```

### Health Check Tests
```bash
# Test all endpoints
./test_health.sh
```

## Monitoring and Alerting

### Prometheus Metrics
The gateway exposes Prometheus metrics at `/metrics`:

- `api_request_total`: Total API requests
- `api_request_duration_seconds`: Request duration histogram
- `api_error_total`: Total API errors
- `api_active_requests`: Active request gauge
- `tool_execution_total`: Tool execution counter
- `tool_execution_duration_seconds`: Tool execution histogram

### Grafana Dashboards
Pre-built Grafana dashboards are available for:
- API Performance Monitoring
- Tool Health Status
- Error Rate Analysis
- Basketball-Biotech Integration Analytics

### Alert Rules
Example Prometheus alert rules:

```yaml
groups:
  - name: api-gateway
    rules:
      - alert: HighErrorRate
        expr: rate(api_error_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
      
      - alert: ToolUnhealthy
        expr: tool_health_score < 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Tool {{ $labels.tool_id }} is unhealthy"
```

## Troubleshooting

### Common Issues

1. **Tool Health Scores Showing 0.0**
   - Check if tool services are running
   - Verify network connectivity
   - Check firewall rules

2. **High Response Times**
   - Monitor system resources (CPU, memory)
   - Check database connection pools
   - Review query performance

3. **Authentication Failures**
   - Verify API keys are valid
   - Check JWT token expiration
   - Validate role permissions

### Debug Mode
Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
python unified_scientific_api.py
```

### Performance Profiling
```python
import cProfile
cProfile.run('main()', 'gateway_profile.prof')
```

## Migration Guide

### From v3 to v4

1. **Update Dependencies**
```bash
pip install -r requirements_v4.txt
```

2. **Configuration Migration**
- Update tool port mappings
- Configure monitoring service
- Set up alert thresholds

3. **API Changes**
- New enhanced endpoints available
- Backward compatibility maintained for core endpoints
- New authentication mechanisms

4. **Data Migration**
- Export existing metrics data
- Import into new monitoring service
- Validate data integrity

## Support and Contact

### Documentation
- [API Reference](https://docs.cheetah-v4.example.com)
- [Developer Guide](https://developers.cheetah-v4.example.com)
- [Troubleshooting Guide](https://support.cheetah-v4.example.com)

### Community
- [GitHub Repository](https://github.com/example/cheetah-v4)
- [Discord Channel](https://discord.gg/cheetah-v4)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/cheetah-v4)

### Enterprise Support
- Email: support@cheetah-v4.example.com
- Phone: +1-800-CHEETAH
- SLA: 24/7 support with 1-hour response time

## License

Cheetah v4 Enhanced API Gateway is licensed under the Apache License 2.0. See the LICENSE file for details.

## Changelog

### v4.0.0 (2026-02-03)
- Initial release of Cheetah v4 Enhanced API Gateway
- Real-time monitoring and analytics
- Basketball-biotech integration
- Advanced error handling and retry logic
- Health scoring and intelligent routing
- Comprehensive documentation

### v4.0.1 (Planned)
- Enhanced caching strategies
- Additional authentication methods
- Improved dashboard visualizations
- Extended basketball analytics models