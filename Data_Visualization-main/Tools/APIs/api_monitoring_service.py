#!/usr/bin/env python3
"""
API Monitoring Service for Cheetah v4 Enhanced Gateway

This service provides real-time monitoring, alerting, and analytics
for the Unified Scientific API Gateway. It runs alongside the gateway
to provide enhanced monitoring capabilities.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import defaultdict
import statistics

import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import redis
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Redis connection (for production, use connection pooling)
try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    redis_client.ping()
    logger.info("Connected to Redis for monitoring data storage")
except:
    logger.warning("Redis not available, using in-memory storage")
    redis_client = None

# In-memory storage fallback
monitoring_data = defaultdict(list)
alerts_store = []


class MonitoringConfig(BaseModel):
    """Configuration for monitoring service."""
    gateway_url: str = "http://localhost:8000"
    check_interval_seconds: int = 30
    alert_thresholds: Dict[str, float] = Field(default={
        "response_time_p95_ms": 1000,
        "error_rate": 0.1,
        "tool_health_score": 0.5,
        "active_requests": 100
    })
    notification_channels: List[str] = Field(default=["log", "api"])


class Alert(BaseModel):
    """Alert model for monitoring system."""
    id: str
    type: str
    severity: str
    message: str
    metric: str
    value: float
    threshold: float
    timestamp: str
    resolved: bool = False
    resolved_at: Optional[str] = None


class RealTimeMetrics(BaseModel):
    """Real-time metrics for API monitoring."""
    timestamp: str
    active_requests: int
    request_rate_per_minute: float
    error_rate: float
    avg_response_time_ms: float
    tool_health_scores: Dict[str, float]
    system_health_score: float


class APIMonitoringService:
    """Main monitoring service class."""
    
    def __init__(self, config: MonitoringConfig):
        self.config = config
        self.running = False
        self.metrics_history = []
        self.alerts = []
        self.http_client = httpx.AsyncClient(timeout=10.0)
        
    async def start(self):
        """Start the monitoring service."""
        self.running = True
        logger.info(f"Starting API Monitoring Service for gateway: {self.config.gateway_url}")
        
        # Start background tasks
        tasks = [
            self.collect_metrics_loop(),
            self.check_alerts_loop(),
            self.cleanup_old_data_loop()
        ]
        
        await asyncio.gather(*tasks)
    
    async def collect_metrics_loop(self):
        """Continuously collect metrics from the gateway."""
        while self.running:
            try:
                await self.collect_metrics()
                await asyncio.sleep(self.config.check_interval_seconds)
            except Exception as e:
                logger.error(f"Error collecting metrics: {e}")
                await asyncio.sleep(5)
    
    async def collect_metrics(self):
        """Collect metrics from the gateway API."""
        timestamp = datetime.now().isoformat()
        
        try:
            # Get API metrics
            metrics_response = await self.http_client.get(
                f"{self.config.gateway_url}/api/v1/analytics/metrics",
                params={"time_range": "1h", "granularity": "5m"}
            )
            
            if metrics_response.status_code == 200:
                metrics_data = metrics_response.json()
                
                # Get tool health status
                tools_response = await self.http_client.get(
                    f"{self.config.gateway_url}/api/v1/tools"
                )
                
                tool_health_scores = {}
                if tools_response.status_code == 200:
                    tools_data = tools_response.json()
                    for tool in tools_data.get("tools", []):
                        tool_health_scores[tool["id"]] = tool.get("health_score", 0.0)
                
                # Calculate request rate (simplified)
                request_rate = await self.calculate_request_rate()
                
                # Create real-time metrics
                realtime_metrics = RealTimeMetrics(
                    timestamp=timestamp,
                    active_requests=metrics_data.get("active_requests", 0),
                    request_rate_per_minute=request_rate,
                    error_rate=metrics_data.get("error_count", 0) / max(metrics_data.get("request_count", 1), 1),
                    avg_response_time_ms=metrics_data.get("avg_response_time_ms", 0),
                    tool_health_scores=tool_health_scores,
                    system_health_score=statistics.mean(tool_health_scores.values()) if tool_health_scores else 0.0
                )
                
                # Store metrics
                self.store_metrics(realtime_metrics)
                
                # Check for alerts
                await self.check_for_alerts(realtime_metrics)
                
                logger.debug(f"Collected metrics at {timestamp}")
                
        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")
    
    async def calculate_request_rate(self) -> float:
        """Calculate current request rate per minute."""
        # Get recent metrics from store
        recent_metrics = self.get_recent_metrics(minutes=5)
        
        if len(recent_metrics) < 2:
            return 0.0
        
        # Calculate rate based on request count changes
        total_requests = sum(m.get("request_count", 0) for m in recent_metrics)
        time_span_minutes = 5  # We're looking at last 5 minutes
        
        return total_requests / time_span_minutes
    
    def store_metrics(self, metrics: RealTimeMetrics):
        """Store metrics in Redis or memory."""
        metrics_dict = metrics.dict()
        
        if redis_client:
            # Store in Redis with expiration
            key = f"metrics:{metrics.timestamp}"
            redis_client.setex(key, 3600, json.dumps(metrics_dict))  # 1 hour TTL
            
            # Also store in sorted set for time-based queries
            redis_client.zadd("metrics:timestamps", {metrics.timestamp: time.time()})
        else:
            # Store in memory
            self.metrics_history.append(metrics_dict)
            
            # Keep only last 1000 metrics
            if len(self.metrics_history) > 1000:
                self.metrics_history.pop(0)
    
    async def check_for_alerts(self, metrics: RealTimeMetrics):
        """Check metrics against thresholds and create alerts if needed."""
        thresholds = self.config.alert_thresholds
        
        # Check response time
        if metrics.avg_response_time_ms > thresholds.get("response_time_p95_ms", 1000):
            await self.create_alert(
                type="performance",
                severity="warning",
                message=f"High response time detected: {metrics.avg_response_time_ms:.0f}ms",
                metric="avg_response_time_ms",
                value=metrics.avg_response_time_ms,
                threshold=thresholds["response_time_p95_ms"]
            )
        
        # Check error rate
        if metrics.error_rate > thresholds.get("error_rate", 0.1):
            await self.create_alert(
                type="error",
                severity="critical",
                message=f"High error rate detected: {metrics.error_rate:.1%}",
                metric="error_rate",
                value=metrics.error_rate,
                threshold=thresholds["error_rate"]
            )
        
        # Check tool health
        for tool_id, health_score in metrics.tool_health_scores.items():
            if health_score < thresholds.get("tool_health_score", 0.5):
                await self.create_alert(
                    type="health",
                    severity="warning",
                    message=f"Low health score for tool {tool_id}: {health_score:.2f}",
                    metric=f"tool_health_{tool_id}",
                    value=health_score,
                    threshold=thresholds["tool_health_score"]
                )
        
        # Check active requests
        if metrics.active_requests > thresholds.get("active_requests", 100):
            await self.create_alert(
                type="capacity",
                severity="warning",
                message=f"High number of active requests: {metrics.active_requests}",
                metric="active_requests",
                value=float(metrics.active_requests),
                threshold=thresholds["active_requests"]
            )
    
    async def create_alert(self, type: str, severity: str, message: str, 
                          metric: str, value: float, threshold: float):
        """Create and store an alert."""
        alert_id = f"alert_{int(time.time())}_{hash(message) % 10000:04d}"
        
        # Check if similar alert already exists
        existing_alert = self.find_similar_alert(type, metric)
        if existing_alert:
            # Update existing alert
            existing_alert["last_occurrence"] = datetime.now().isoformat()
            existing_alert["occurrence_count"] = existing_alert.get("occurrence_count", 0) + 1
            logger.warning(f"Alert updated: {message}")
            return
        
        # Create new alert
        alert = Alert(
            id=alert_id,
            type=type,
            severity=severity,
            message=message,
            metric=metric,
            value=value,
            threshold=threshold,
            timestamp=datetime.now().isoformat()
        )
        
        # Store alert
        if redis_client:
            key = f"alert:{alert_id}"
            redis_client.setex(key, 86400, json.dumps(alert.dict()))  # 24 hour TTL
            redis_client.lpush("alerts:recent", alert_id)
            redis_client.ltrim("alerts:recent", 0, 99)  # Keep only 100 recent alerts
        else:
            self.alerts.append(alert.dict())
        
        # Send notifications
        await self.send_notifications(alert)
        
        logger.warning(f"New alert created: {message}")
    
    def find_similar_alert(self, alert_type: str, metric: str) -> Optional[Dict]:
        """Find similar unresolved alert."""
        recent_alerts = self.get_recent_alerts(hours=1)
        
        for alert in recent_alerts:
            if (alert["type"] == alert_type and 
                alert["metric"] == metric and 
                not alert.get("resolved", False)):
                return alert
        
        return None
    
    async def send_notifications(self, alert: Alert):
        """Send notifications through configured channels."""
        for channel in self.config.notification_channels:
            try:
                if channel == "log":
                    self.send_log_notification(alert)
                elif channel == "api":
                    await self.send_api_notification(alert)
                elif channel == "webhook":
                    await self.send_webhook_notification(alert)
            except Exception as e:
                logger.error(f"Failed to send notification via {channel}: {e}")
    
    def send_log_notification(self, alert: Alert):
        """Send notification via logging."""
        log_message = f"[ALERT {alert.severity.upper()}] {alert.message}"
        
        if alert.severity == "critical":
            logger.critical(log_message)
        elif alert.severity == "warning":
            logger.warning(log_message)
        else:
            logger.info(log_message)
    
    async def send_api_notification(self, alert: Alert):
        """Send notification via API (could be to a notification service)."""
        # This is a placeholder for actual API notification implementation
        # In production, this could call a Slack webhook, PagerDuty, etc.
        pass
    
    async def send_webhook_notification(self, alert: Alert):
        """Send notification via webhook."""
        # Placeholder for webhook implementation
        pass
    
    async def check_alerts_loop(self):
        """Periodically check and resolve alerts."""
        while self.running:
            try:
                await self.check_alert_resolutions()
                await asyncio.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Error checking alerts: {e}")
                await asyncio.sleep(5)
    
    async def check_alert_resolutions(self):
        """Check if alerts have been resolved."""
        unresolved_alerts = self.get_unresolved_alerts()
        
        for alert in unresolved_alerts:
            # Check if the condition still exists
            current_metrics = self.get_latest_metrics()
            
            if current_metrics:
                metric_value = self.get_metric_value(current_metrics, alert["metric"])
                
                if metric_value is not None and metric_value <= alert["threshold"] * 0.8:
                    # Condition resolved
                    await self.resolve_alert(alert["id"])
    
    async def resolve_alert(self, alert_id: str):
        """Mark an alert as resolved."""
        if redis_client:
            key = f"alert:{alert_id}"
            alert_data = redis_client.get(key)
            if alert_data:
                alert = json.loads(alert_data)
                alert["resolved"] = True
                alert["resolved_at"] = datetime.now().isoformat()
                redis_client.setex(key, 86400, json.dumps(alert))  # Update with new TTL
        else:
            for alert in self.alerts:
                if alert["id"] == alert_id:
                    alert["resolved"] = True
                    alert["resolved_at"] = datetime.now().isoformat()
                    break
        
        logger.info(f"Alert {alert_id} resolved")
    
    async def cleanup_old_data_loop(self):
        """Clean up old data periodically."""
        while self.running:
            try:
                self.cleanup_old_data()
                await asyncio.sleep(3600)  # Clean up every hour
            except Exception as e:
                logger.error(f"Error cleaning up old data: {e}")
                await asyncio.sleep(300)
    
    def cleanup_old_data(self):
        """Clean up old metrics and alerts."""
        cutoff_time = datetime.now() - timedelta(days=7)
        
        if redis_client:
            # Clean up old metrics from sorted set
            old_metrics = redis_client.zrangebyscore(
                "metrics:timestamps", 0, cutoff_time.timestamp()
            )
            for timestamp in old_metrics:
                redis_client.delete(f"metrics:{timestamp}")
            redis_client.zremrangebyscore("metrics:timestamps", 0, cutoff_time.timestamp())
        else:
            # Clean up in-memory data
            self.metrics_history = [
                m for m in self.metrics_history
                if datetime.fromisoformat(m["timestamp"].replace('Z', '+00:00')) > cutoff_time
            ]
            
            # Keep only recent alerts
            self.alerts = [
                a for a in self.alerts
                if datetime.fromisoformat(a["timestamp"].replace('Z', '+00:00')) > cutoff_time
            ]
    
    def get_recent_metrics(self, minutes: int = 5) -> List[Dict]:
        """Get metrics from the last N minutes."""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        
        if redis_client:
            # Get timestamps from sorted set
            timestamps = redis_client.zrangebyscore(
                "metrics:timestamps", 
                cutoff_time.timestamp(), 
                float('inf')
            )
            
            metrics = []
            for timestamp in timestamps:
                metric_data = redis_client.get(f"metrics:{timestamp}")
                if metric_data:
                    metrics.append(json.loads(metric_data))
            
            return metrics
        else:
            return [
                m for m in self.metrics_history
                if datetime.fromisoformat(m["timestamp"].replace('Z', '+00:00')) > cutoff_time
            ]
    
    def get_latest_metrics(self) -> Optional[Dict]:
        """Get the latest metrics."""
        recent_metrics = self.get_recent_metrics(minutes=1)
        return recent_metrics[-1] if recent_metrics else None
    
    def get_recent_alerts(self, hours: int = 24) -> List[Dict]:
        """Get alerts from the last N hours."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        if redis_client:
            alert_ids = redis_client.lrange("alerts:recent", 0, -1)
            alerts = []
            
            for alert_id in alert_ids:
                alert_data = redis_client.get(f"alert:{alert_id}")
                if alert_data:
                    alert = json.loads(alert_data)
                    if datetime.fromisoformat(alert["timestamp"].replace('Z', '+00:00')) > cutoff_time:
                        alerts.append(alert)
            
            return alerts
        else:
            return [
                a for a in self.alerts
                if datetime.fromisoformat(a["timestamp"].replace('Z', '+00:00')) > cutoff_time
            ]
    
    def get_unresolved_alerts(self) -> List[Dict]:
        """Get all unresolved alerts."""
        recent_alerts = self.get_recent_alerts(hours=24)
        return [a for a in recent_alerts if not a.get("resolved", False)]
    
    def get_metric_value(self, metrics: Dict, metric_name: str) -> Optional[float]:
        """Extract metric value from metrics dictionary."""
        if metric_name.startswith("tool_health_"):
            tool_id = metric_name.replace("tool_health_", "")
            return metrics.get("tool_health_scores", {}).get(tool_id)
        
        return metrics.get(metric_name)


# FastAPI app for monitoring service API
app = FastAPI(
    title="API Monitoring Service",
    version="1.0.0",
    description="Real-time monitoring and alerting for Cheetah v4 API Gateway"
)

# Global monitoring service instance
monitoring_service = None


@app.on_event("startup")
async def startup_event():
    """Start the monitoring service on startup."""
    global monitoring_service
    
    config = MonitoringConfig()
    monitoring_service = APIMonitoringService(config)
    
    # Start monitoring in background
    import asyncio
    asyncio.create_task(monitoring_service.start())


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "API Monitoring Service",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/metrics/realtime")
async def get_realtime_metrics():
    """Get real-time metrics."""
    if not monitoring_service:
        raise HTTPException(status_code=503, detail="Monitoring service not initialized")
    
    latest_metrics = monitoring_service.get_latest_metrics()
    
    if not latest_metrics:
        raise HTTPException(status_code=404, detail="No metrics available")
    
    return latest_metrics


@app.get("/metrics/history")
async def get_metrics_history(minutes: int = 60):
    """Get metrics history."""
    if not monitoring_service:
        raise HTTPException(status_code=503, detail="Monitoring service not initialized")
    
    metrics = monitoring_service.get_recent_metrics(minutes=min(minutes, 1440))  # Max 24 hours
    
    return {
        "count": len(metrics),
        "metrics": metrics,
        "time_range_minutes": minutes
    }


@app.get("/alerts")
async def get_alerts(resolved: bool = False, hours: int = 24):
    """Get alerts."""
    if not monitoring_service:
        raise HTTPException(status_code=503, detail="Monitoring service not initialized")
    
    alerts = monitoring_service.get_recent_alerts(hours=min(hours, 168))  # Max 7 days
    
    if not resolved:
        alerts = [a for a in alerts if not a.get("resolved", False)]
    
    return {
        "count": len(alerts),
        "alerts": alerts,
        "time_range_hours": hours,
        "include_resolved": resolved
    }


@app.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    """Manually resolve an alert."""
    if not monitoring_service:
        raise HTTPException(status_code=503, detail="Monitoring service not initialized")
    
    await monitoring_service.resolve_alert(alert_id)
    
    return {
        "status": "resolved",
        "alert_id": alert_id,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/dashboard")
async def get_monitoring_dashboard():
    """Get comprehensive monitoring dashboard data."""
    if not monitoring_service:
        raise HTTPException(status_code=503, detail="Monitoring service not initialized")
    
    # Get various data points
    latest_metrics = monitoring_service.get_latest_metrics() or {}
    recent_alerts = monitoring_service.get_recent_alerts(hours=1)
    unresolved_alerts = [a for a in recent_alerts if not a.get("resolved", False)]
    
    # Calculate system health
    system_health = latest_metrics.get("system_health_score", 0.0)
    
    # Determine overall status
    if system_health >= 0.8:
        overall_status = "healthy"
    elif system_health >= 0.5:
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"
    
    return {
        "overall_status": overall_status,
        "system_health_score": system_health,
        "timestamp": datetime.now().isoformat(),
        "metrics": {
            "active_requests": latest_metrics.get("active_requests", 0),
            "request_rate_per_minute": latest_metrics.get("request_rate_per_minute", 0),
            "error_rate": latest_metrics.get("error_rate", 0),
            "avg_response_time_ms": latest_metrics.get("avg_response_time_ms", 0)
        },
        "alerts": {
            "total_recent": len(recent_alerts),
            "unresolved": len(unresolved_alerts),
            "by_severity": {
                "critical": sum(1 for a in unresolved_alerts if a.get("severity") == "critical"),
                "warning": sum(1 for a in unresolved_alerts if a.get("severity") == "warning")
            }
        },
        "tool_health": latest_metrics.get("tool_health_scores", {})
    }


if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "=" * 80)
    print("  API MONITORING SERVICE - CHEETAH v4")
    print("=" * 80)
    print("\n  Starting monitoring service on http://localhost:8001")
    print("\n  Endpoints:")
    print("    - Health Check:      http://localhost:8001/health")
    print("    - Real-time Metrics: http://localhost:8001/metrics/realtime")
    print("    - Metrics History:   http://localhost:8001/metrics/history")
    print("    - Alerts:            http://localhost:8001/alerts")
    print("    - Dashboard:         http://localhost:8001/dashboard")
    print("\n  Monitoring gateway at: http://localhost:8000")
    print("\n" + "=" * 80 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")