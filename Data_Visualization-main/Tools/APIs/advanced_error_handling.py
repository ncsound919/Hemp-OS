#!/usr/bin/env python3
"""
Advanced Error Handling and Retry Mechanisms for Cheetah v4

This module provides sophisticated error handling, retry logic,
circuit breaker patterns, and graceful degradation for the
Cheetah v4 Enhanced API Gateway.
"""

import asyncio
import logging
import time
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable, TypeVar, Generic
from enum import Enum
from dataclasses import dataclass, field
from functools import wraps
import statistics

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

T = TypeVar('T')


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Circuit is open, fail fast
    HALF_OPEN = "half_open"  # Testing recovery


class ErrorType(Enum):
    """Types of errors for classification."""
    NETWORK = "network"
    TIMEOUT = "timeout"
    SERVER_ERROR = "server_error"
    CLIENT_ERROR = "client_error"
    VALIDATION = "validation"
    AUTHORIZATION = "authorization"
    RESOURCE_EXHAUSTED = "resource_exhausted"
    UNKNOWN = "unknown"


class RetryStrategy(Enum):
    """Retry strategies."""
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    FIXED_INTERVAL = "fixed_interval"
    LINEAR_BACKOFF = "linear_backoff"
    RANDOMIZED_BACKOFF = "randomized_backoff"


@dataclass
class RetryConfig:
    """Configuration for retry logic."""
    max_retries: int = 3
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    base_delay: float = 1.0  # seconds
    max_delay: float = 30.0  # seconds
    jitter: bool = True
    jitter_factor: float = 0.1
    retry_on_status: List[int] = field(default_factory=lambda: [502, 503, 504, 429])
    retry_on_exceptions: List[str] = field(default_factory=lambda: [
        "ConnectionError", "TimeoutError", "ServerError"
    ])


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5
    failure_window_seconds: int = 60
    success_threshold: int = 3
    success_window_seconds: int = 30
    reset_timeout_seconds: int = 60
    half_open_max_requests: int = 3


@dataclass
class ErrorMetrics:
    """Metrics for error tracking."""
    total_errors: int = 0
    error_counts: Dict[ErrorType, int] = field(default_factory=lambda: {et: 0 for et in ErrorType})
    last_error_time: Optional[datetime] = None
    error_rate_last_minute: float = 0.0
    recovery_attempts: int = 0
    successful_recoveries: int = 0


@dataclass
class ServiceHealth:
    """Health status of a service."""
    service_id: str
    circuit_state: CircuitState = CircuitState.CLOSED
    error_metrics: ErrorMetrics = field(default_factory=ErrorMetrics)
    last_success_time: Optional[datetime] = None
    last_failure_time: Optional[datetime] = None
    consecutive_successes: int = 0
    consecutive_failures: int = 0
    health_score: float = 1.0
    is_healthy: bool = True


class AdvancedErrorHandler:
    """Advanced error handling with retry logic and circuit breakers."""
    
    def __init__(self):
        self.service_health: Dict[str, ServiceHealth] = {}
        self.circuit_config = CircuitBreakerConfig()
        self.retry_config = RetryConfig()
        self.error_handlers: Dict[ErrorType, Callable] = {}
        self.fallback_handlers: Dict[str, Callable] = {}
        
        # Initialize default error handlers
        self._initialize_default_handlers()
    
    def _initialize_default_handlers(self):
        """Initialize default error handlers."""
        self.error_handlers[ErrorType.NETWORK] = self._handle_network_error
        self.error_handlers[ErrorType.TIMEOUT] = self._handle_timeout_error
        self.error_handlers[ErrorType.SERVER_ERROR] = self._handle_server_error
        self.error_handlers[ErrorType.CLIENT_ERROR] = self._handle_client_error
        self.error_handlers[ErrorType.AUTHORIZATION] = self._handle_authorization_error
        self.error_handlers[ErrorType.RESOURCE_EXHAUSTED] = self._handle_resource_exhausted_error
    
    def register_service(self, service_id: str):
        """Register a service for error tracking."""
        if service_id not in self.service_health:
            self.service_health[service_id] = ServiceHealth(service_id=service_id)
            logger.info(f"Registered service: {service_id}")
    
    def register_fallback(self, service_id: str, fallback_handler: Callable):
        """Register a fallback handler for a service."""
        self.fallback_handlers[service_id] = fallback_handler
        logger.info(f"Registered fallback for service: {service_id}")
    
    def classify_error(self, error: Exception, status_code: Optional[int] = None) -> ErrorType:
        """Classify an error for appropriate handling."""
        error_str = str(error).lower()
        
        # Network errors
        network_keywords = ['connection', 'network', 'socket', 'refused', 'reset']
        if any(keyword in error_str for keyword in network_keywords):
            return ErrorType.NETWORK
        
        # Timeout errors
        timeout_keywords = ['timeout', 'timed out', 'deadline exceeded']
        if any(keyword in error_str for keyword in timeout_keywords):
            return ErrorType.TIMEOUT
        
        # Server errors (5xx)
        if status_code and 500 <= status_code < 600:
            if status_code == 503:
                return ErrorType.RESOURCE_EXHAUSTED
            return ErrorType.SERVER_ERROR
        
        # Client errors (4xx)
        if status_code and 400 <= status_code < 500:
            if status_code == 401 or status_code == 403:
                return ErrorType.AUTHORIZATION
            return ErrorType.CLIENT_ERROR
        
        # Default classification
        return ErrorType.UNKNOWN
    
    async def execute_with_retry(
        self,
        service_id: str,
        operation: Callable,
        operation_args: List[Any] = None,
        operation_kwargs: Dict[str, Any] = None,
        retry_config: Optional[RetryConfig] = None,
        fallback_enabled: bool = True
    ) -> Any:
        """Execute an operation with retry logic and circuit breaker."""
        # Ensure service is registered
        self.register_service(service_id)
        
        # Use provided config or default
        config = retry_config or self.retry_config
        
        # Check circuit breaker
        if not self._check_circuit(service_id):
            logger.warning(f"Circuit is OPEN for service {service_id}, using fallback")
            if fallback_enabled and service_id in self.fallback_handlers:
                return await self._execute_fallback(service_id, operation_args, operation_kwargs)
            raise CircuitOpenError(f"Circuit is OPEN for service {service_id}")
        
        # Execute with retry logic
        last_exception = None
        operation_args = operation_args or []
        operation_kwargs = operation_kwargs or {}
        
        for attempt in range(config.max_retries + 1):
            try:
                # Execute operation
                result = await operation(*operation_args, **operation_kwargs)
                
                # Record success
                self._record_success(service_id)
                return result
                
            except Exception as e:
                last_exception = e
                
                # Classify error
                error_type = self.classify_error(e)
                
                # Record failure
                self._record_failure(service_id, error_type)
                
                # Check if we should retry
                if attempt < config.max_retries and self._should_retry(error_type, config):
                    # Calculate delay
                    delay = self._calculate_delay(attempt, config)
                    
                    logger.warning(
                        f"Retry attempt {attempt + 1}/{config.max_retries} for {service_id} "
                        f"after error: {error_type.value}. Waiting {delay:.2f}s"
                    )
                    
                    await asyncio.sleep(delay)
                else:
                    # Max retries reached or shouldn't retry
                    break
        
        # All retries failed
        logger.error(f"All retries failed for service {service_id}: {last_exception}")
        
        # Try fallback if enabled
        if fallback_enabled and service_id in self.fallback_handlers:
            logger.info(f"Attempting fallback for service {service_id}")
            try:
                return await self._execute_fallback(service_id, operation_args, operation_kwargs)
            except Exception as fallback_error:
                logger.error(f"Fallback also failed for {service_id}: {fallback_error}")
        
        # Re-raise the last exception
        raise last_exception
    
    def _check_circuit(self, service_id: str) -> bool:
        """Check if circuit is closed or half-open."""
        health = self.service_health[service_id]
        
        if health.circuit_state == CircuitState.CLOSED:
            return True
        
        elif health.circuit_state == CircuitState.HALF_OPEN:
            # Allow limited number of requests
            if health.consecutive_successes < self.circuit_config.half_open_max_requests:
                return True
            else:
                # Too many requests in half-open state
                return False
        
        else:  # OPEN state
            # Check if reset timeout has passed
            if health.last_failure_time:
                reset_time = health.last_failure_time + timedelta(
                    seconds=self.circuit_config.reset_timeout_seconds
                )
                if datetime.now() > reset_time:
                    # Transition to HALF_OPEN
                    health.circuit_state = CircuitState.HALF_OPEN
                    health.consecutive_successes = 0
                    logger.info(f"Circuit for {service_id} transitioned to HALF_OPEN")
                    return True
            
            return False
    
    def _record_success(self, service_id: str):
        """Record a successful operation."""
        health = self.service_health[service_id]
        
        # Update metrics
        health.last_success_time = datetime.now()
        health.consecutive_successes += 1
        health.consecutive_failures = 0
        
        # Update circuit state
        if health.circuit_state == CircuitState.HALF_OPEN:
            if health.consecutive_successes >= self.circuit_config.success_threshold:
                health.circuit_state = CircuitState.CLOSED
                logger.info(f"Circuit for {service_id} transitioned to CLOSED")
        
        # Update health score
        self._update_health_score(service_id)
    
    def _record_failure(self, service_id: str, error_type: ErrorType):
        """Record a failed operation."""
        health = self.service_health[service_id]
        
        # Update metrics
        health.last_failure_time = datetime.now()
        health.consecutive_failures += 1
        health.consecutive_successes = 0
        health.error_metrics.total_errors += 1
        health.error_metrics.error_counts[error_type] += 1
        
        # Check if we should open the circuit
        if (health.consecutive_failures >= self.circuit_config.failure_threshold and
            health.circuit_state == CircuitState.CLOSED):
            health.circuit_state = CircuitState.OPEN
            logger.warning(f"Circuit for {service_id} transitioned to OPEN")
        
        # Update health score
        self._update_health_score(service_id)
        
        # Call error handler if registered
        if error_type in self.error_handlers:
            try:
                self.error_handlers[error_type](service_id, error_type)
            except Exception as e:
                logger.error(f"Error handler failed: {e}")
    
    def _should_retry(self, error_type: ErrorType, config: RetryConfig) -> bool:
        """Determine if we should retry based on error type."""
        # Don't retry client errors (except 429)
        if error_type == ErrorType.CLIENT_ERROR:
            return False
        
        # Don't retry authorization errors
        if error_type == ErrorType.AUTHORIZATION:
            return False
        
        # Retry network, timeout, and server errors
        return True
    
    def _calculate_delay(self, attempt: int, config: RetryConfig) -> float:
        """Calculate delay for retry attempt."""
        if config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = config.base_delay * (2 ** attempt)
        elif config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = config.base_delay * (attempt + 1)
        elif config.strategy == RetryStrategy.FIXED_INTERVAL:
            delay = config.base_delay
        elif config.strategy == RetryStrategy.RANDOMIZED_BACKOFF:
            base_delay = config.base_delay * (2 ** attempt)
            delay = base_delay * (1 + random.uniform(-config.jitter_factor, config.jitter_factor))
        else:
            delay = config.base_delay
        
        # Apply jitter if enabled
        if config.jitter and config.strategy != RetryStrategy.RANDOMIZED_BACKOFF:
            jitter = delay * random.uniform(-config.jitter_factor, config.jitter_factor)
            delay += jitter
        
        # Cap at max delay
        return min(delay, config.max_delay)
    
    async def _execute_fallback(self, service_id: str, args: List[Any], kwargs: Dict[str, Any]) -> Any:
        """Execute fallback handler."""
        fallback = self.fallback_handlers[service_id]
        
        # Check if fallback is async
        if asyncio.iscoroutinefunction(fallback):
            return await fallback(*args, **kwargs)
        else:
            # Run synchronous fallback in thread pool
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, lambda: fallback(*args, **kwargs))
    
    def _update_health_score(self, service_id: str):
        """Update health score for a service."""
        health = self.service_health[service_id]
        
        # Base score from circuit state
        if health.circuit_state == CircuitState.CLOSED:
            state_score = 1.0
        elif health.circuit_state == CircuitState.HALF_OPEN:
            state_score = 0.5
        else:
            state_score = 0.0
        
        # Adjust based on error rate
        error_rate = self._calculate_error_rate(service_id)
        error_factor = 1.0 - min(error_rate, 0.5)  # Cap at 50% reduction
        
        # Adjust based on recency of success
        recency_factor = 1.0
        if health.last_success_time:
            seconds_since_success = (datetime.now() - health.last_success_time).total_seconds()
            if seconds_since_success > 300:  # 5 minutes
                recency_factor = 0.8
            elif seconds_since_success > 1800:  # 30 minutes
                recency_factor = 0.6
            elif seconds_since_success > 3600:  # 1 hour
                recency_factor = 0.4
        
        # Calculate final score
        health.health_score = round(state_score * error_factor * recency_factor, 3)
        health.is_healthy = health.health_score >= 0.5
    
    def _calculate_error_rate(self, service_id: str) -> float:
        """Calculate error rate for the last minute."""
        health = self.service_health[service_id]
        
        # Simple implementation - in production, use time-windowed tracking
        total_errors = health.error_metrics.total_errors
        if total_errors == 0:
            return 0.0
        
        # Estimate based on recent failures
        if health.consecutive_failures > 0:
            return min(health.consecutive_failures / 10, 1.0)
        
        return 0.1  # Default low error rate
    
    # Error handler implementations
    def _handle_network_error(self, service_id: str, error_type: ErrorType):
        """Handle network errors."""
        logger.warning(f"Network error for {service_id}. Checking connectivity...")
        # Could implement network diagnostics here
    
    def _handle_timeout_error(self, service_id: str, error_type: ErrorType):
        """Handle timeout errors."""
        logger.warning(f"Timeout error for {service_id}. Service may be overloaded.")
        # Could implement load shedding or priority adjustment
    
    def _handle_server_error(self, service_id: str, error_type: ErrorType):
        """Handle server errors."""
        logger.error(f"Server error for {service_id}. Service may be malfunctioning.")
        # Could implement automatic failover or alerting
    
    def _handle_client_error(self, service_id: str, error_type: ErrorType):
        """Handle client errors."""
        logger.warning(f"Client error for {service_id}. Check request parameters.")
        # Could implement request validation or parameter adjustment
    
    def _handle_authorization_error(self, service_id: str, error_type: ErrorType):
        """Handle authorization errors."""
        logger.error(f"Authorization error for {service_id}. Check credentials.")
        # Could implement token refresh or re-authentication
    
    def _handle_resource_exhausted_error(self, service_id: str, error_type: ErrorType):
        """Handle resource exhausted errors."""
        logger.warning(f"Resource exhausted for {service_id}. Implementing backoff.")
        # Could implement rate limiting or resource allocation
    
    def get_service_health(self, service_id: str) -> Optional[ServiceHealth]:
        """Get health status for a service."""
        return self.service_health.get(service_id)
    
    def get_all_service_health(self) -> Dict[str, ServiceHealth]:
        """Get health status for all services."""
        return self.service_health.copy()
    
    def reset_service(self, service_id: str):
        """Reset a service's error tracking and circuit breaker."""
        if service_id in self.service_health:
            self.service_health[service_id] = ServiceHealth(service_id=service_id)
            logger.info(f"Reset service: {service_id}")


class CircuitOpenError(Exception):
    """Exception raised when circuit is open."""
    pass


# Decorator for easy integration
def with_error_handling(
    service_id: str,
    retry_config: Optional[RetryConfig] = None,
    fallback_enabled: bool = True
):
    """Decorator to add error handling to async functions."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            handler = AdvancedErrorHandler()
            return await handler.execute_with_retry(
                service_id=service_id,
                operation=func,
                operation_args=list(args),
                operation_kwargs=kwargs,
                retry_config=retry_config,
                fallback_enabled=fallback_enabled
            )
        return wrapper
    return decorator


# Example usage and integration with the API gateway
class EnhancedAPIGatewayWithErrorHandling:
    """Example of integrating advanced error handling with API gateway."""
    
    def __init__(self):
        self.error_handler = AdvancedErrorHandler()
        
        # Register services
        self.services = ["biosim", "genmutant", "pathosphere", "monai"]
        for service in self.services:
            self.error_handler.register_service(service)
            
            # Register fallback handlers
            self.error_handler.register_fallback(service, self._create_fallback_handler(service))
    
    def _create_fallback_handler(self, service_id: str) -> Callable:
        """Create a fallback handler for a service."""
        def fallback_handler(*args, **kwargs):
            logger.info(f"Using fallback for {service_id}")
            # Return cached response or simplified result
            return {
                "status": "fallback",
                "service": service_id,
                "data": None,
                "message": "Service unavailable, using fallback response",
                "timestamp": datetime.now().isoformat()
            }
        return fallback_handler
    
    async def call_service_with_enhanced_error_handling(
        self,
        service_id: str,
        endpoint: str,
        method: str = "GET",
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Call a service with enhanced error handling."""
        
        async def call_service():
            # This would be the actual HTTP call
            # For example, using httpx:
            # async with httpx.AsyncClient() as client:
            #     response = await client.request(method, endpoint, json=data, headers=headers)
            #     response.raise_for_status()
            #     return response.json()
            
            # Simulated implementation
            await asyncio.sleep(0.1)
            
            # Simulate occasional failures
            if random.random() < 0.2:  # 20% failure rate for testing
                raise ConnectionError("Simulated network error")
            
            return {
                "status": "success",
                "service": service_id,
                "data": {"result": "simulated_response"},
                "timestamp": datetime.now().isoformat()
            }
        
        # Use the error handler
        try:
            result = await self.error_handler.execute_with_retry(
                service_id=service_id,
                operation=call_service,
                retry_config=RetryConfig(max_retries=2, base_delay=0.5)
            )
            return result
        except Exception as e:
            logger.error(f"All attempts failed for {service_id}: {e}")
            raise
    
    def get_service_health_dashboard(self) -> Dict[str, Any]:
        """Get health dashboard for all services."""
        health_data = {}
        
        for service_id in self.services:
            health = self.error_handler.get_service_health(service_id)
            if health:
                health_data[service_id] = {
                    "circuit_state": health.circuit_state.value,
                    "health_score": health.health_score,
                    "is_healthy": health.is_healthy,
                    "consecutive_failures": health.consecutive_failures,
                    "consecutive_successes": health.consecutive_successes,
                    "last_success": health.last_success_time.isoformat() if health.last_success_time else None,
                    "last_failure": health.last_failure_time.isoformat() if health.last_failure_time else None,
                    "total_errors": health.error_metrics.total_errors
                }
        
        # Calculate overall health
        health_scores = [data["health_score"] for data in health_data.values()]
        overall_health = statistics.mean(health_scores) if health_scores else 0.0
        
        return {
            "timestamp": datetime.now().isoformat(),
            "overall_health_score": round(overall_health, 3),
            "services": health_data,
            "unhealthy_services": [
                sid for sid, data in health_data.items() 
                if not data["is_healthy"]
            ]
        }


# FastAPI integration example
from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI(title="Enhanced API Gateway with Error Handling")

# Initialize error handling
error_handler = AdvancedErrorHandler()
gateway = EnhancedAPIGatewayWithErrorHandling()


@app.get("/health")
async def health_check():
    """Health check endpoint with error handling."""
    return {
        "status": "healthy",
        "service": "Enhanced API Gateway",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/v1/services/{service_id}/call")
async def call_service(
    service_id: str,
    endpoint: str,
    method: str = "GET"
):
    """Call a service with enhanced error handling."""
    try:
        result = await gateway.call_service_with_enhanced_error_handling(
            service_id=service_id,
            endpoint=endpoint,
            method=method
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/services/health")
async def get_services_health():
    """Get health status of all services."""
    return gateway.get_service_health_dashboard()


@app.post("/api/v1/services/{service_id}/reset")
async def reset_service(service_id: str):
    """Reset a service's error tracking."""
    error_handler.reset_service(service_id)
    return {
        "status": "reset",
        "service_id": service_id,
        "timestamp": datetime.now().isoformat()
    }


# Example of using the decorator
@app.get("/api/v1/example/decorated")
@with_error_handling(
    service_id="example_service",
    retry_config=RetryConfig(max_retries=3, base_delay=1.0),
    fallback_enabled=True
)
async def example_decorated_endpoint():
    """Example endpoint using the error handling decorator."""
    # This function automatically gets retry logic and circuit breaker
    await asyncio.sleep(0.1)
    return {"message": "Success from decorated endpoint"}


if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "=" * 80)
    print("  ENHANCED API GATEWAY WITH ADVANCED ERROR HANDLING")
    print("=" * 80)
    print("\n  Starting server on http://localhost:8003")
    print("\n  Endpoints:")
    print("    - Health Check:           http://localhost:8003/health")
    print("    - Call Service:           http://localhost:8003/api/v1/services/{service_id}/call")
    print("    - Services Health:        http://localhost:8003/api/v1/services/health")
    print("    - Reset Service:          http://localhost:8003/api/v1/services/{service_id}/reset")
    print("    - Decorated Example:      http://localhost:8003/api/v1/example/decorated")
    print("\n  Features:")
    print("    - Circuit breaker pattern")
    print("    - Configurable retry strategies")
    print("    - Error classification and handling")
    print("    - Graceful fallback mechanisms")
    print("    - Health scoring and monitoring")
    print("\n" + "=" * 80 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8003, log_level="info")