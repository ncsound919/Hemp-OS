import builtins
import logging
import os
import time
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID, uuid4
from collections import defaultdict
import statistics

import httpx
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY

# Configure enhanced logging with structured context
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [%(correlation_id)s] - %(message)s",
)
logger = logging.getLogger(__name__)

# Add correlation ID filter
class CorrelationFilter(logging.Filter):
    def filter(self, record):
        record.correlation_id = getattr(record, 'correlation_id', 'system')
        return True

logger.addFilter(CorrelationFilter())

# Prometheus metrics for API monitoring
API_REQUEST_COUNT = Counter(
    'api_request_total', 
    'Total API requests', 
    ['method', 'endpoint', 'status']
)
API_REQUEST_DURATION = Histogram(
    'api_request_duration_seconds',
    'API request duration in seconds',
    ['method', 'endpoint']
)
API_ERROR_COUNT = Counter(
    'api_error_total',
    'Total API errors',
    ['method', 'endpoint', 'error_type']
)
ACTIVE_REQUESTS = Gauge(
    'api_active_requests',
    'Number of active API requests'
)
TOOL_EXECUTION_COUNT = Counter(
    'tool_execution_total',
    'Total tool executions',
    ['tool_id', 'status']
)
TOOL_EXECUTION_DURATION = Histogram(
    'tool_execution_duration_seconds',
    'Tool execution duration in seconds',
    ['tool_id']
)

# --- Pydantic Models for Unified API ---


class ToolInfo(BaseModel):
    id: str
    name: str
    description: str
    port: int
    status: str = "available"
    health_score: float = Field(default=1.0, ge=0.0, le=1.0)
    last_checked: Optional[str] = None
    response_time_ms: Optional[float] = None
    success_rate: Optional[float] = None


class FoldRequest(BaseModel):
    fastas: List[str]
    mode: str  # "quantum", "cpu", "hybrid"
    cores: int = 16
    quantum_shots: Optional[int] = 100
    alpha_start: Optional[float] = 0.05
    alpha_end: Optional[float] = 0.01


class PDBResult(BaseModel):
    sequence: str
    pdb: str
    rmsd: Optional[float]
    mode_used: str
    shots_used: Optional[int]


class FoldResponse(BaseModel):
    run_id: UUID
    status: str
    pdbs: Optional[List[PDBResult]] = None
    rmsds: Optional[List[float]] = None
    shots: Optional[int] = None
    time: Optional[str] = None
    error: Optional[str] = None


class VariantCallRequest(BaseModel):
    file_path: str
    sample_name: str
    reference_genome: str
    enable_deep_variant: bool = False
    enable_gatk: bool = False




class ToolExecuteRequest(BaseModel):
    endpoint_path: Optional[str] = None
    params: Dict[str, Any]
    correlation_id: Optional[str] = None
    priority: str = Field(default="normal", regex="^(low|normal|high|critical)$")
    timeout_seconds: Optional[int] = None
    retry_config: Optional[Dict[str, Any]] = None


class PipelineCreate(BaseModel):
    name: str
    description: str
    steps: List[Dict[str, Any]]


class Pipeline(BaseModel):
    id: str
    name: str
    description: str
    steps: List[Dict[str, Any]]
    created_at: str
    status: str


class FileInfo(BaseModel):
    id: str
    filename: str
    size: int
    format: str
    uploaded_at: str
    status: str


class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: float
    created_at: str
    updated_at: Optional[str] = None
    message: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    execution_time_ms: Optional[float] = None
    resource_usage: Optional[Dict[str, Any]] = None
    correlation_id: Optional[str] = None


class FoldRequest(BaseModel):
    fastas: List[str]
    mode: str  # "quantum", "cpu", "hybrid"
    cores: int = 16
    quantum_shots: Optional[int] = 100
    alpha_start: Optional[float] = 0.05
    alpha_end: Optional[float] = 0.01


class PDBResult(BaseModel):
    sequence: str
    pdb: str
    rmsd: Optional[float]
    mode_used: str
    shots_used: Optional[int]


class FoldResponse(BaseModel):
    run_id: UUID
    status: str
    pdbs: Optional[List[PDBResult]] = None
    rmsds: Optional[List[float]] = None
    shots: Optional[int] = None
    time: Optional[str] = None
    error: Optional[str] = None


class VariantCallRequest(BaseModel):
    file_path: str
    sample_name: str
    reference_genome: str
    enable_deep_variant: bool = False
    enable_gatk: bool = False


# New models for API analytics and monitoring
class APIAnalyticsRequest(BaseModel):
    time_range: str = Field(default="1h", regex="^(1h|6h|24h|7d|30d)$")
    granularity: str = Field(default="5m", regex="^(1m|5m|15m|1h|1d)$")
    filters: Optional[Dict[str, Any]] = None

class APIMetrics(BaseModel):
    request_count: int
    error_count: int
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    success_rate: float
    active_requests: int
    tool_health_scores: Dict[str, float]

class BasketballBiotechIntegration(BaseModel):
    player_id: str
    biometric_data: Dict[str, Any]
    performance_metrics: Dict[str, float]
    health_indicators: Dict[str, float]
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class IntegrationResult(BaseModel):
    correlation_id: str
    analysis_type: str
    results: Dict[str, Any]
    confidence_score: float
    recommendations: List[str]
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# --- FastAPI App Initialization ---

app = FastAPI(
    title="Unified Scientific API Gateway - Cheetah v4 Enhanced",
    version="2.0.0",
    description="Enhanced API gateway with Cheetah v4 capabilities: advanced monitoring, analytics, basketball-biotech integration, and intelligent routing",
)

# Configure CORS (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add monitoring middleware
@app.middleware("http")
async def add_monitoring(request: Request, call_next):
    return await monitoring_middleware.track_request(request, call_next)

# --- Microservice Configuration ---

# Map tool identifiers to MCP port numbers
TOOL_PORTS = {
    "pathosphere": 8001,
    "genmutant": 8002,
    "biosim": 8003,
    "opencrispr": 8004,
    "monai": 8005,
    "notebook": 8006,
    "bioware": 8007,
    "qlcce": 8008, # Corrected from qlCCE to qlcce for consistency
}

CORE_BASE = "http://localhost:8000"  # Assuming a core API for files, jobs, pipelines

# Endpoint mapping per tool (MCP specific) - This will be used by the gateway to
# route `tool_execute` requests to the correct internal endpoint of each microservice.
TOOL_EXEC_ENDPOINTS = {
    "pathosphere": "/api/v1/genome",  # Example endpoint, actual path from Pathosphere microservice
    "genmutant": "/api/v1/variants/call", # GenMutant-Pro-main backend/app/api/endpoints.py
    "biosim": "/v1/fold", # BioSim-Fusion api/main.py
    "opencrispr": "/api/v1/crispr/design", # Hypothetical endpoint for OpenCRISPR
    "monai": "/api/v1/image/segment", # Hypothetical endpoint for MONAI
    "notebook": "/api/v1/notebook/create", # Hypothetical endpoint for OpenNotebook
    "bioware": "/api/v1/literature/synthesize", # Hypothetical endpoint for BiowareLabs
    "qlcce": "/api/v1/molecule/optimize", # Hypothetical endpoint for QLCCE
 }
 }

# --- Shared In-Memory Data Stores (for standalone demo/mocking) ---
# In a real microservices deployment, these would be managed by dedicated services.
# We'll use these for services that don't have explicit API files to proxy to yet.
mock_pipelines_db: Dict[str, Pipeline] = {}
mock_files_db: Dict[str, FileInfo] = {}
mock_jobs_db: Dict[str, JobStatus] = {}

# Enhanced data stores for monitoring and analytics
api_metrics_store: List[Dict[str, Any]] = []
tool_health_store: Dict[str, Dict[str, Any]] = defaultdict(dict)
basketball_biotech_store: Dict[str, List[BasketballBiotechIntegration]] = defaultdict(list)
integration_results_store: Dict[str, IntegrationResult] = {}

# --- Enhanced Helper Functions ---


class APIMonitoringMiddleware:
    """Middleware for monitoring API requests and responses"""
    
    def __init__(self):
        self.request_times: Dict[str, float] = {}
        self.active_requests = 0
    
    async def track_request(self, request: Request, call_next):
        correlation_id = request.headers.get('X-Correlation-ID', str(uuid4()))
        request.state.correlation_id = correlation_id
        
        # Update logger with correlation ID
        old_factory = logging.getLogRecordFactory()
        def record_factory(*args, **kwargs):
            record = old_factory(*args, **kwargs)
            record.correlation_id = correlation_id
            return record
        logging.setLogRecordFactory(record_factory)
        
        method = request.method
        endpoint = request.url.path
        
        # Track active requests
        ACTIVE_REQUESTS.inc()
        self.active_requests += 1
        
        # Start timer
        start_time = time.time()
        self.request_times[correlation_id] = start_time
        
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            
            # Update metrics
            API_REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=response.status_code).inc()
            API_REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
            
            # Store metrics for analytics
            api_metrics_store.append({
                'timestamp': datetime.now().isoformat(),
                'correlation_id': correlation_id,
                'method': method,
                'endpoint': endpoint,
                'status_code': response.status_code,
                'duration_ms': duration * 1000,
                'response_size': len(response.body) if hasattr(response, 'body') else 0
            })
            
            # Keep only last 10,000 metrics
            if len(api_metrics_store) > 10000:
                api_metrics_store.pop(0)
                
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            error_type = type(e).__name__
            API_ERROR_COUNT.labels(method=method, endpoint=endpoint, error_type=error_type).inc()
            raise
            
        finally:
            # Clean up
            ACTIVE_REQUESTS.dec()
            self.active_requests -= 1
            if correlation_id in self.request_times:
                del self.request_times[correlation_id]


async def forward_request(
    target_url: str,
    method: str = "GET",
    json_body: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: float = 30.0,
    correlation_id: Optional[str] = None,
    retry_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Enhanced forward request with retry logic and monitoring."""
    retry_config = retry_config or {
        'max_retries': 3,
        'backoff_factor': 1.0,
        'retry_on_status': [502, 503, 504]
    }
    
    max_retries = retry_config.get('max_retries', 3)
    backoff_factor = retry_config.get('backoff_factor', 1.0)
    retry_on_status = retry_config.get('retry_on_status', [502, 503, 504])
    
    last_exception = None
    start_time = time.time()
    
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                m = method.upper()
                request_headers = headers or {}
                if correlation_id:
                    request_headers['X-Correlation-ID'] = correlation_id
                
                if m == "GET":
                    resp = await client.get(target_url, timeout=timeout, headers=request_headers)
                elif m == "POST":
                    resp = await client.post(
                        target_url, json=json_body or {}, timeout=timeout, headers=request_headers
                    )
                elif m == "PUT":
                    resp = await client.put(
                        target_url, json=json_body or {}, timeout=timeout, headers=request_headers
                    )
                elif m == "DELETE":
                    resp = await client.delete(target_url, timeout=timeout, headers=request_headers)
                else:
                    raise ValueError("Unsupported HTTP method")
                
                # Check if we should retry based on status code
                if resp.status_code in retry_on_status and attempt < max_retries:
                    wait_time = backoff_factor * (2 ** attempt)
                    logger.warning(f"Retryable status {resp.status_code} for {target_url}, attempt {attempt + 1}, waiting {wait_time}s")
                    await asyncio.sleep(wait_time)
                    continue
                    
                content_type = resp.headers.get("content-type", "")
                if content_type.startswith("application/json"):
                    try:
                        data = resp.json()
                    except ValueError:
                        data = resp.text
                    if resp.status_code >= 400:
                        raise HTTPException(status_code=resp.status_code, detail=str(data))
                    
                    # Track tool execution metrics
                    execution_time = time.time() - start_time
                    tool_id = extract_tool_id_from_url(target_url)
                    if tool_id:
                        TOOL_EXECUTION_COUNT.labels(tool_id=tool_id, status='success').inc()
                        TOOL_EXECUTION_DURATION.labels(tool_id=tool_id).observe(execution_time)
                    
                    return data
                else:
                    if resp.status_code >= 400:
                        raise HTTPException(status_code=resp.status_code, detail=resp.text)
                    return {"content": resp.text, "status_code": resp.status_code}
                    
        except (httpx.RequestError, HTTPException) as exc:
            last_exception = exc
            if attempt < max_retries:
                wait_time = backoff_factor * (2 ** attempt)
                logger.warning(f"Request error for {target_url}, attempt {attempt + 1}, waiting {wait_time}s: {exc}")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"Max retries exceeded for {target_url}: {exc}")
                if isinstance(exc, HTTPException):
                    raise
                else:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Downstream service unavailable after {max_retries} retries: {exc}",
                    )
        except Exception as e:
            logger.error(f"Unexpected error forwarding to {target_url}: {e}")
            raise HTTPException(status_code=500, detail=f"Internal gateway error: {e}")
    
    # This should never be reached due to the raise in the loop
    raise HTTPException(status_code=500, detail="Unexpected error in forward_request")


def extract_tool_id_from_url(url: str) -> Optional[str]:
    """Extract tool ID from URL for metrics tracking."""
    for tool_id, port in TOOL_PORTS.items():
        if f":{port}" in url:
            return tool_id
    return None


async def check_tool_health(tool_id: str, port: int) -> Dict[str, Any]:
    """Check health of a specific tool with detailed metrics."""
    start_time = time.time()
    try:
        health_url = f"http://localhost:{port}/health"
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(health_url)
            response_time = (time.time() - start_time) * 1000
            
            health_data = {
                'tool_id': tool_id,
                'status': 'healthy' if response.status_code == 200 else 'unhealthy',
                'response_time_ms': response_time,
                'last_checked': datetime.now().isoformat(),
                'status_code': response.status_code
            }
            
            # Update health store
            tool_health_store[tool_id] = health_data
            
            return health_data
            
    except Exception as e:
        response_time = (time.time() - start_time) * 1000
        health_data = {
            'tool_id': tool_id,
            'status': 'unavailable',
            'response_time_ms': response_time,
            'last_checked': datetime.now().isoformat(),
            'error': str(e)
        }
        tool_health_store[tool_id] = health_data
        return health_data


def calculate_tool_health_score(tool_id: str) -> float:
    """Calculate health score for a tool based on recent metrics."""
    if tool_id not in tool_health_store:
        return 0.0
    
    health_data = tool_health_store[tool_id]
    
    # Base score from status
    if health_data.get('status') == 'healthy':
        base_score = 1.0
    elif health_data.get('status') == 'unhealthy':
        base_score = 0.5
    else:
        base_score = 0.0
    
    # Adjust based on response time (penalize slow responses)
    response_time = health_data.get('response_time_ms', 1000)
    if response_time < 100:
        time_factor = 1.0
    elif response_time < 500:
        time_factor = 0.8
    elif response_time < 1000:
        time_factor = 0.6
    else:
        time_factor = 0.4
    
    # Adjust based on recency (penalize stale data)
    last_checked = health_data.get('last_checked')
    if last_checked:
        try:
            last_checked_dt = datetime.fromisoformat(last_checked.replace('Z', '+00:00'))
            age_seconds = (datetime.now() - last_checked_dt).total_seconds()
            if age_seconds < 60:
                recency_factor = 1.0
            elif age_seconds < 300:
                recency_factor = 0.8
            elif age_seconds < 1800:
                recency_factor = 0.6
            else:
                recency_factor = 0.4
        except:
            recency_factor = 0.5
    else:
        recency_factor = 0.5
    
    # Calculate final score
    final_score = base_score * time_factor * recency_factor
    return round(final_score, 2)


def get_tool_port(tool_id: str) -> Optional[int]:
    """Retrieves the port for a given tool ID."""
    for k, v in TOOL_PORTS.items():
        if k.lower() == tool_id.lower():
            return v
    return None


# Initialize monitoring middleware
monitoring_middleware = APIMonitoringMiddleware()


# --- Root and Health Endpoints ---


@app.get("/")
async def root():
    return {"message": "Unified Scientific API Gateway", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    # In a real scenario, this would check health of all proxied services
    return {"status": "healthy", "gateway": "Unified Scientific API Gateway"}


# --- Tools Endpoints ---


@app.get("/api/v1/tools", response_model=Dict[str, Any])
async def list_tools(background_tasks: BackgroundTasks):
    """List all available scientific tools with enhanced health checking and analytics."""
    tools_agg: List[Dict[str, Any]] = []

    # Check health of all tools in parallel
    health_tasks = []
    for tool_id, port in TOOL_PORTS.items():
        health_tasks.append(check_tool_health(tool_id, port))
    
    # Run health checks concurrently
    health_results = await asyncio.gather(*health_tasks, return_exceptions=True)
    
    for idx, (tool_id, port) in enumerate(TOOL_PORTS.items()):
        health_result = health_results[idx]
        
        # Calculate health score
        health_score = calculate_tool_health_score(tool_id)
        
        tool_info: Dict[str, Any] = {
            "id": tool_id,
            "name": tool_id.replace("-", " ").title(),
            "port": port,
            "description": f"Enhanced MCP service on port {port}",
            "status": "unknown",
            "health_score": health_score,
            "last_checked": datetime.now().isoformat(),
        }
        
        if not isinstance(health_result, Exception):
            tool_info["status"] = health_result.get("status", "unknown")
            tool_info["response_time_ms"] = health_result.get("response_time_ms")
            tool_info["last_checked"] = health_result.get("last_checked")
            
            # Enrich with additional info if available
            if health_result.get("status") == "healthy":
                try:
                    info_response = await forward_request(
                        f"http://localhost:{port}/info", 
                        method="GET", 
                        timeout=2.0
                    )
                    if info_response:
                        tool_info["name"] = info_response.get("name", tool_info["name"])
                        tool_info["description"] = info_response.get("description", tool_info["description"])
                        tool_info["version"] = info_response.get("version")
                except:
                    pass  # Info endpoint not available, use defaults
        else:
            tool_info["status"] = "unavailable"
            tool_info["error"] = str(health_result)
        
        tools_agg.append(tool_info)
    
    # Schedule background task to update health scores periodically
    background_tasks.add_task(update_all_tool_health_scores)
    
    return {
        "count": len(tools_agg), 
        "tools": tools_agg,
        "timestamp": datetime.now().isoformat(),
        "overall_health_score": round(statistics.mean([t.get("health_score", 0) for t in tools_agg]), 2)
    }


async def update_all_tool_health_scores():
    """Background task to update health scores for all tools."""
    for tool_id, port in TOOL_PORTS.items():
        await check_tool_health(tool_id, port)
        await asyncio.sleep(0.5)  # Stagger requests


@app.get("/api/v1/tools/{tool_id}", response_model=ToolInfo)
async def get_tool(tool_id: str):
    """Get specific tool details, potentially by querying the microservice."""
    port = get_tool_port(tool_id)
    if port:
        # Attempt to get info from the actual microservice
        try:
            tool_info = await forward_request(
                f"http://localhost:{port}/info", method="GET"
            )
            return ToolInfo(
                id=tool_id,
                name=tool_id.replace("-", " ").title(),  # Basic capitalization
                description=f"Managed by MCP on port {port}",
                port=port,
                status="unavailable",
            )
        # If microservice is down or doesn't have /info, return basic info
        # Removed redundant except block, as the general structure handles it
    raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")


@app.post("/api/v1/tools/{tool_id}/execute", response_model=Dict[str, Any])
async def execute_tool(
    tool_id: str, 
    request: ToolExecuteRequest,
    background_tasks: BackgroundTasks
):
    """Execute a method on a specific scientific tool with enhanced monitoring and analytics."""
    canonical_tool_id = tool_id.lower()
    port = get_tool_port(canonical_tool_id)

    if port is None:
        raise HTTPException(
            status_code=404, detail=f"Tool '{tool_id}' not found or not configured."
        )

    # Check tool health before execution
    health_score = calculate_tool_health_score(canonical_tool_id)
    if health_score < 0.3 and request.priority != "critical":
        raise HTTPException(
            status_code=503,
            detail=f"Tool '{tool_id}' health score is low ({health_score}). Consider using alternative tool or retry later."
        )

    # Determine the actual endpoint path for the microservice
    endpoint_path = request.endpoint_path or TOOL_EXEC_ENDPOINTS.get(canonical_tool_id)
    if endpoint_path is None:
        raise HTTPException(
            status_code=400,
            detail=f"No execution endpoint configured for tool '{tool_id}'",
        )

    target_url = f"http://localhost:{port}{endpoint_path}"
    
    # Generate correlation ID if not provided
    correlation_id = request.correlation_id or str(uuid4())
    
    logger.info(f"Forwarding execution request for tool '{tool_id}' to {target_url} [correlation_id: {correlation_id}]")

    # Special handling for BioSim-Fusion /v1/fold endpoint
    if canonical_tool_id == "biosim" and endpoint_path == "/v1/fold":
        try:
            fold_request = FoldRequest(**request.params)
            json_body_to_send = fold_request.dict()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid BioSim-Fusion fold request parameters: {e}",
            )
    # Special handling for GenMutant /call-variants endpoint
    elif canonical_tool_id == "genmutant" and endpoint_path == "/api/v1/variants/call":
        try:
            variant_call_request = VariantCallRequest(**request.params)
            json_body_to_send = variant_call_request.dict()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid GenMutant variant call request parameters: {e}",
            )
    else:
        json_body_to_send = request.params

    # Add correlation ID to request
    if json_body_to_send and isinstance(json_body_to_send, dict):
        json_body_to_send['correlation_id'] = correlation_id

    # Determine timeout
    timeout = request.timeout_seconds or 120.0
    if request.priority == "critical":
        timeout = min(timeout * 1.5, 300.0)  # Allow longer for critical requests

    # Forward the request with enhanced monitoring
    try:
        response = await forward_request(
            target_url, 
            method="POST", 
            json_body=json_body_to_send, 
            timeout=timeout,
            correlation_id=correlation_id,
            retry_config=request.retry_config
        )

        # Track successful execution
        TOOL_EXECUTION_COUNT.labels(tool_id=canonical_tool_id, status='success').inc()
        
        # Add execution metadata to response
        if isinstance(response, dict):
            response['_metadata'] = {
                'tool_id': canonical_tool_id,
                'correlation_id': correlation_id,
                'execution_timestamp': datetime.now().isoformat(),
                'priority': request.priority,
                'health_score_at_execution': health_score
            }

        # For BioSim-Fusion, attempt to parse into FoldResponse for consistent typing
        if canonical_tool_id == "biosim" and endpoint_path == "/v1/fold":
            try:
                fold_response = FoldResponse(**response)
                response_dict = fold_response.dict()
                response_dict['_metadata'] = response.get('_metadata', {})
                return response_dict
            except Exception as e:
                logger.warning(
                    f"Failed to parse BioSim-Fusion response into FoldResponse: {e}. Returning raw response."
                )
                return response

        return response

    except Exception as e:
        # Track failed execution
        TOOL_EXECUTION_COUNT.labels(tool_id=canonical_tool_id, status='error').inc()
        
        # Update tool health store with failure
        tool_health_store[canonical_tool_id]['last_error'] = str(e)
        tool_health_store[canonical_tool_id]['last_error_time'] = datetime.now().isoformat()
        
        # Schedule background health check
        background_tasks.add_task(check_tool_health, canonical_tool_id, port)
        
        raise HTTPException(
            status_code=500 if not isinstance(e, HTTPException) else e.status_code,
            detail=f"Tool execution failed: {str(e)} [correlation_id: {correlation_id}]"
        )


# --- Pipelines Endpoints (Proxied to a core service or managed here) ---
# These endpoints will query a core service (CORE_BASE) if available,
# otherwise they fall back to mock data management.


@app.get("/api/v1/pipelines", response_model=Dict[str, Any])
async def list_pipelines():
    """List all pipelines."""
    # In a real system, this would query a dedicated pipeline management service.
    return {
        "count": len(mock_pipelines_db),
        "pipelines": list(mock_pipelines_db.values()),
    }


@app.post("/api/v1/pipelines", response_model=Pipeline)
async def create_pipeline(pipeline: PipelineCreate):
    """Create a new pipeline."""
    pipeline_id = f"pipeline_{uuid4().hex[:8]}"
    new_pipeline = Pipeline(
        id=pipeline_id,
        name=pipeline.name,
        description=pipeline.description,
        steps=pipeline.steps,
        created_at=datetime.now().isoformat(),
        status="created",
    )
    mock_pipelines_db[pipeline_id] = new_pipeline
    return new_pipeline


@app.get("/api/v1/pipelines/{pipeline_id}", response_model=Pipeline)
async def get_pipeline(pipeline_id: str):
    """Get pipeline details."""
    if pipeline_id not in mock_pipelines_db:
        raise HTTPException(
            status_code=404, detail=f"Pipeline '{pipeline_id}' not found"
        )
    return mock_pipelines_db[pipeline_id]


@app.put("/api/v1/pipelines/{pipeline_id}", response_model=Pipeline)
async def update_pipeline(pipeline_id: str, pipeline: PipelineCreate):
    """Update pipeline."""
    if pipeline_id not in mock_pipelines_db:
        raise HTTPException(
            status_code=404, detail=f"Pipeline '{pipeline_id}' not found"
        )

    existing_pipeline = mock_pipelines_db[pipeline_id]
    existing_pipeline.name = pipeline.name
    existing_pipeline.description = pipeline.description
    existing_pipeline.steps = pipeline.steps
    existing_pipeline.status = "updated"  # Or other appropriate status
    existing_pipeline.created_at = (
        existing_pipeline.created_at
    )  # Keep original creation date
    return existing_pipeline


@app.delete("/api/v1/pipelines/{pipeline_id}", response_model=Dict[str, Any])
async def delete_pipeline(pipeline_id: str):
    """Delete pipeline."""
    if pipeline_id not in mock_pipelines_db:
        raise HTTPException(
            status_code=404, detail=f"Pipeline '{pipeline_id}' not found"
        )

    deleted = mock_pipelines_db.pop(pipeline_id)
    return {"status": "deleted", "pipeline": deleted}


# --- Enhanced Analytics Endpoints ---

@app.get("/api/v1/analytics/metrics", response_model=APIMetrics)
async def get_api_metrics(request: APIAnalyticsRequest):
    """Get comprehensive API metrics and analytics."""
    # Filter metrics based on time range
    time_range_seconds = {
        "1h": 3600,
        "6h": 21600,
        "24h": 86400,
        "7d": 604800,
        "30d": 2592000
    }.get(request.time_range, 3600)
    
    cutoff_time = datetime.now() - timedelta(seconds=time_range_seconds)
    
    filtered_metrics = [
        m for m in api_metrics_store
        if datetime.fromisoformat(m['timestamp'].replace('Z', '+00:00')) >= cutoff_time
    ]
    
    if not filtered_metrics:
        return APIMetrics(
            request_count=0,
            error_count=0,
            avg_response_time_ms=0,
            p95_response_time_ms=0,
            p99_response_time_ms=0,
            success_rate=1.0,
            active_requests=monitoring_middleware.active_requests,
            tool_health_scores={tool_id: calculate_tool_health_score(tool_id) for tool_id in TOOL_PORTS.keys()}
        )
    
    # Calculate statistics
    response_times = [m['duration_ms'] for m in filtered_metrics]
    success_count = sum(1 for m in filtered_metrics if m['status_code'] < 400)
    error_count = sum(1 for m in filtered_metrics if m['status_code'] >= 400)
    
    if response_times:
        sorted_times = sorted(response_times)
        p95_index = int(len(sorted_times) * 0.95)
        p99_index = int(len(sorted_times) * 0.99)
        
        p95 = sorted_times[p95_index] if p95_index < len(sorted_times) else sorted_times[-1]
        p99 = sorted_times[p99_index] if p99_index < len(sorted_times) else sorted_times[-1]
    else:
        p95 = p99 = 0
    
    return APIMetrics(
        request_count=len(filtered_metrics),
        error_count=error_count,
        avg_response_time_ms=statistics.mean(response_times) if response_times else 0,
        p95_response_time_ms=p95,
        p99_response_time_ms=p99,
        success_rate=success_count / len(filtered_metrics) if filtered_metrics else 1.0,
        active_requests=monitoring_middleware.active_requests,
        tool_health_scores={tool_id: calculate_tool_health_score(tool_id) for tool_id in TOOL_PORTS.keys()}
    )


@app.get("/metrics")
async def get_prometheus_metrics():
    """Prometheus metrics endpoint."""
    return generate_latest(REGISTRY)


@app.post("/api/v1/integrations/basketball-biotech", response_model=IntegrationResult)
async def integrate_basketball_biotech(data: BasketballBiotechIntegration):
    """Integrate basketball analytics with biotech data for performance optimization."""
    correlation_id = str(uuid4())
    
    # Store the data
    basketball_biotech_store[data.player_id].append(data)
    
    # Analyze the data
    analysis_results = analyze_basketball_biotech_data(data)
    
    # Create integration result
    result = IntegrationResult(
        correlation_id=correlation_id,
        analysis_type="basketball_biotech_integration",
        results=analysis_results,
        confidence_score=calculate_confidence_score(analysis_results),
        recommendations=generate_recommendations(analysis_results)
    )
    
    # Store the result
    integration_results_store[correlation_id] = result
    
    return result


@app.get("/api/v1/integrations/{correlation_id}", response_model=IntegrationResult)
async def get_integration_result(correlation_id: str):
    """Get integration result by correlation ID."""
    if correlation_id not in integration_results_store:
        raise HTTPException(status_code=404, detail="Integration result not found")
    
    return integration_results_store[correlation_id]


def analyze_basketball_biotech_data(data: BasketballBiotechIntegration) -> Dict[str, Any]:
    """Analyze basketball and biotech data for insights."""
    analysis = {
        'player_id': data.player_id,
        'timestamp': data.timestamp,
        'performance_score': calculate_performance_score(data.performance_metrics),
        'health_score': calculate_health_score(data.health_indicators),
        'fatigue_level': estimate_fatigue_level(data.biometric_data, data.performance_metrics),
        'recovery_needs': assess_recovery_needs(data.health_indicators),
        'optimization_opportunities': identify_optimization_opportunities(data)
    }
    
    # Add derived metrics
    analysis['overall_score'] = (analysis['performance_score'] * 0.6 + 
                                analysis['health_score'] * 0.4)
    
    return analysis


def calculate_performance_score(metrics: Dict[str, float]) -> float:
    """Calculate overall performance score from basketball metrics."""
    # Example metrics: points, assists, rebounds, shooting percentage
    weights = {
        'points_per_game': 0.3,
        'assists_per_game': 0.2,
        'rebounds_per_game': 0.2,
        'field_goal_percentage': 0.3
    }
    
    score = 0
    total_weight = 0
    
    for metric, weight in weights.items():
        if metric in metrics:
            # Normalize metric to 0-1 scale (assuming reasonable ranges)
            if metric == 'field_goal_percentage':
                normalized = min(metrics[metric] / 100, 1.0)
            else:
                normalized = min(metrics[metric] / 50, 1.0)  # Adjust based on sport
            score += normalized * weight
            total_weight += weight
    
    return round(score / total_weight if total_weight > 0 else 0, 2)


def calculate_health_score(indicators: Dict[str, float]) -> float:
    """Calculate health score from biotech indicators."""
    # Example indicators: heart_rate_variability, cortisol_level, inflammation_markers
    weights = {
        'heart_rate_variability': 0.4,
        'cortisol_level': 0.3,
        'inflammation_markers': 0.3
    }
    
    score = 0
    total_weight = 0
    
    for indicator, weight in weights.items():
        if indicator in indicators:
            # Normalize based on healthy ranges
            if indicator == 'heart_rate_variability':
                # Higher is better (typically 20-200 ms)
                normalized = min(max((indicators[indicator] - 20) / 180, 0), 1)
            elif indicator == 'cortisol_level':
                # Lower is better (typical range 5-25 mcg/dL)
                normalized = 1 - min(max((indicators[indicator] - 5) / 20, 0), 1)
            elif indicator == 'inflammation_markers':
                # Lower is better (CRP typical < 1.0 mg/L)
                normalized = 1 - min(indicators[indicator], 1.0)
            else:
                normalized = 0.5
            
            score += normalized * weight
            total_weight += weight
    
    return round(score / total_weight if total_weight > 0 else 0.5, 2)


def estimate_fatigue_level(biometric: Dict[str, Any], performance: Dict[str, float]) -> str:
    """Estimate fatigue level from biometric and performance data."""
    fatigue_score = 0
    
    if 'heart_rate_recovery' in biometric:
        # Slower HR recovery indicates higher fatigue
        recovery_time = biometric.get('heart_rate_recovery', 180)  # seconds to recover
        if recovery_time > 300:
            fatigue_score += 2
        elif recovery_time > 180:
            fatigue_score += 1
    
    if 'sleep_quality' in biometric:
        sleep_quality = biometric.get('sleep_quality', 0.5)
        if sleep_quality < 0.3:
            fatigue_score += 2
        elif sleep_quality < 0.6:
            fatigue_score += 1
    
    # Performance degradation indicates fatigue
    if 'performance_trend' in performance:
        trend = performance.get('performance_trend', 0)
        if trend < -0.1:  # 10% decline
            fatigue_score += 1
    
    if fatigue_score >= 3:
        return "high"
    elif fatigue_score >= 1:
        return "moderate"
    else:
        return "low"


def assess_recovery_needs(health_indicators: Dict[str, float]) -> List[str]:
    """Assess recovery needs based on health indicators."""
    needs = []
    
    if health_indicators.get('cortisol_level', 0) > 15:
        needs.append("stress_management")
    
    if health_indicators.get('inflammation_markers', 0) > 0.5:
        needs.append("anti_inflammatory_support")
    
    if health_indicators.get('heart_rate_variability', 0) < 40:
        needs.append("recovery_focus")
    
    return needs


def identify_optimization_opportunities(data: BasketballBiotechIntegration) -> List[str]:
    """Identify optimization opportunities from integrated data."""
    opportunities = []
    
    # Performance optimization
    if data.performance_metrics.get('field_goal_percentage', 0) < 0.45:
        opportunities.append("shooting_efficiency_training")
    
    if data.performance_metrics.get('turnovers_per_game', 0) > 3:
        opportunities.append("ball_handling_improvement")
    
    # Health optimization
    if data.health_indicators.get('heart_rate_variability', 0) < 50:
        opportunities.append("recovery_optimization")
    
    if data.biometric_data.get('sleep_quality', 0.5) < 0.7:
        opportunities.append("sleep_optimization")
    
    return opportunities


def calculate_confidence_score(analysis: Dict[str, Any]) -> float:
    """Calculate confidence score for analysis results."""
    # Base confidence on data completeness and consistency
    confidence = 0.7  # Base confidence
    
    # Adjust based on data quality indicators
    if analysis.get('performance_score') is not None:
        confidence += 0.1
    
    if analysis.get('health_score') is not None:
        confidence += 0.1
    
    if analysis.get('fatigue_level') != "unknown":
        confidence += 0.05
    
    if analysis.get('recovery_needs'):
        confidence += 0.05
    
    return min(round(confidence, 2), 1.0)


def generate_recommendations(analysis: Dict[str, Any]) -> List[str]:
    """Generate personalized recommendations based on analysis."""
    recommendations = []
    
    # Performance recommendations
    if analysis.get('performance_score', 0) < 0.7:
        recommendations.append("Focus on skill-specific training drills")
    
    if analysis.get('fatigue_level') == "high":
        recommendations.append("Increase recovery time and reduce training intensity")
        recommendations.append("Consider active recovery methods like swimming or yoga")
    
    # Health recommendations
    if analysis.get('health_score', 0) < 0.6:
        recommendations.append("Consult with sports medicine specialist")
        recommendations.append("Implement nutritional optimization plan")
    
    if "stress_management" in analysis.get('recovery_needs', []):
        recommendations.append("Incorporate mindfulness and meditation practices")
    
    if "sleep_optimization" in analysis.get('optimization_opportunities', []):
        recommendations.append("Establish consistent sleep schedule (7-9 hours)")
        recommendations.append("Create optimal sleep environment (dark, cool, quiet)")
    
    # General optimization
    if analysis.get('overall_score', 0) < 0.65:
        recommendations.append("Develop personalized training and recovery plan")
        recommendations.append("Regular monitoring of key performance and health indicators")
    
    return recommendations[:5]  # Return top 5 recommendations


@app.post("/api/v1/pipelines/{pipeline_id}/execute", response_model=JobStatus)
async def execute_pipeline(pipeline_id: str, inputs: Dict[str, Any]):
    """Execute a pipeline."""
    if pipeline_id not in mock_pipelines_db:
        raise HTTPException(
            status_code=404, detail=f"Pipeline '{pipeline_id}' not found"
        )

    job_id = f"job_{uuid4().hex[:8]}"
    mock_jobs_db[job_id] = JobStatus(
        job_id=job_id,
        status="running",
        progress=0.0,
        created_at=datetime.now().isoformat(),
        message="Pipeline execution started",
        results={"pipeline_id": pipeline_id, "inputs": inputs},
    )
    # In a real system, this would trigger a background task for pipeline execution
    logger.info(f"Pipeline '{pipeline_id}' execution started with job ID: {job_id}")
    return mock_jobs_db[job_id]


# --- Files Endpoints (Proxied to a core service or managed here) ---
# These endpoints will query a core service (CORE_BASE) for file operations,
# falling back to mock data management if the core service is unavailable or not set.


@app.get("/api/v1/files", response_model=Dict[str, Any])
async def list_files():
    """List all uploaded files."""
    return {"count": len(mock_files_db), "files": list(mock_files_db.values())}


@app.post("/api/v1/files/upload", response_model=FileInfo)
async def upload_file(file: UploadFile):
    """Upload a file."""
    # Try to proxy to CORE_BASE first
    try:
        # Use CORE_BASE for file uploads if it provides this endpoint
        upload_url = f"{CORE_BASE}/api/v1/files/upload"
        # Assuming CORE_BASE expects multipart/form-data for file uploads
        # This requires a different approach than JSON body forwarding.
        # For simplicity here, we will stick to mock_files_db if CORE_BASE doesn't support direct proxying easily.
        # A more robust solution would involve streaming the file.

        # If CORE_BASE doesn't handle file uploads directly or we want to mock:
        raise HTTPException(status_code=404, detail="File upload proxy not implemented for CORE_BASE")

    except HTTPException:
        # Fallback to mock file storage if proxy fails or is not implemented
        file_id = f"file_{uuid4().hex[:8]}"

        # Detect format from extension
        format_map = {
            ".fasta": "FASTA", ".fa": "FASTA", ".fastq": "FASTQ", ".fq": "FASTQ",
            ".vcf": "VCF", ".bam": "BAM", ".sam": "SAM", ".pdb": "PDB",
            ".sdf": "SDF", ".dcm": "DICOM", ".nii": "NIfTI", ".json": "JSON",
            ".csv": "CSV",
        }
        file_ext = "." + file.filename.split(".")[-1].lower()
        file_format = format_map.get(file_ext, "UNKNOWN")

        file_info = FileInfo(
            id=file_id,
            filename=file.filename,
            size=0,  # Placeholder; actual size would be determined after saving
            format=file_format,
            uploaded_at=datetime.now().isoformat(),
            status="uploaded",
        )
        mock_files_db[file_id] = file_info
        logger.info(f"File uploaded: {file.filename} with ID {file_id} (Mock storage)")
        return file_info


@app.get("/api/v1/files/{file_id}", response_model=FileInfo)
async def get_file_info(file_id: str):
    """Get file metadata."""
    if file_id not in mock_files_db:
        raise HTTPException(status_code=404, detail=f"File '{file_id}' not found")
    return mock_files_db[file_id]


@app.delete("/api/v1/files/{file_id}", response_model=Dict[str, Any])
async def delete_file(file_id: str):
    """Delete a file."""
    if file_id not in mock_files_db:
        raise HTTPException(status_code=404, detail=f"File '{file_id}' not found")
    deleted = mock_files_db.pop(file_id)
    return {"status": "deleted", "file": deleted}


# --- Jobs Endpoints (Proxied or Managed) ---
# These endpoints will query respective microservices for job status,
# or manage jobs created through this gateway's pipeline execution.


@app.get("/api/v1/jobs", response_model=Dict[str, Any])
async def list_jobs():
    """List all jobs across the system."""
    # This would aggregate jobs from various microservices if a distributed job system existed.
    # For now, it returns jobs initiated via this gateway.
    return {"count": len(mock_jobs_db), "jobs": list(mock_jobs_db.values())}


@app.get("/api/v1/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get status of a specific job."""
    if job_id in mock_jobs_db:
        return mock_jobs_db[job_id]

    # Try to determine which microservice might own this job if it's not local
    # This is a simplified example; a real system would need a robust job registry.

    # Example: Check GenMutant
    if job_id.startswith("genmutant_job_"):
        try:
            genmutant_response = await forward_request(
                f"http://localhost:{TOOL_PORTS['genmutant']}/api/v1/jobs/{job_id.replace('genmutant_job_', '')}",
                method="GET",
            )
            # Adapt GenMutant's JobStatusResponse to JobStatus
            return JobStatus(
                job_id=job_id,
                status=genmutant_response.get("status", "unknown"),
                progress=genmutant_response.get("progress", 0.0) if genmutant_response.get("status") == "processing" else (100.0 if genmutant_response.get("status") == "completed" else 0.0),
                created_at=genmutant_response.get(
                    "created_at", datetime.now().isoformat()
                ),
                updated_at=genmutant_response.get(
                    "updated_at", datetime.now().isoformat()
                ),
                message=genmutant_response.get("message"),
                results=genmutant_response.get("results"),
            )
        except HTTPException as e:
            logger.warning(f"Job {job_id} not found in GenMutant or error: {e.detail}")

    # Add checks for other microservices here (e.g., BioSim-Fusion, Pathosphere, etc.)
    # Example for BioSim-Fusion (assuming run_id format and /v1/run/{run_id} endpoint)
    if job_id.startswith("biosim_run_"):
        try:
            biosim_run_id = job_id.replace("biosim_run_", "")
            biosim_response = await forward_request(
                f"http://localhost:{TOOL_PORTS['biosim']}/v1/run/{biosim_run_id}",
                method="GET",
            )
            # Adapt BioSim-Fusion's FoldResponse to JobStatus
            fold_response = FoldResponse(**biosim_response)
            return JobStatus(
                job_id=job_id,
                status=fold_response.status,
                progress=100.0 if fold_response.status == "completed" else (50.0 if fold_response.status == "running" else 0.0), # Basic progress mapping
                created_at=datetime.now().isoformat(),  # Placeholder, ideally get from microservice
                updated_at=datetime.now().isoformat(),  # Placeholder
                message=fold_response.error or f"BioSim-Fusion job {fold_response.status}",
                results=fold_response.dict(exclude_unset=True),
            )
        except (HTTPException, httpx.RequestError) as e:
            logger.warning(f"Job {job_id} not found in BioSim-Fusion or error: {e.detail if isinstance(e, HTTPException) else str(e)}")

    raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")


@app.post("/api/v1/jobs/{job_id}/cancel", response_model=Dict[str, Any])
async def cancel_job(job_id: str):
    """Cancel a running job."""
    if job_id in mock_jobs_db:
        mock_jobs_db[job_id].status = "cancelled"
        mock_jobs_db[job_id].updated_at = datetime.now().isoformat()
        return {
            "job_id": job_id,
            "status": "cancelled",
            "message": "Job cancelled successfully",
        }

    # Attempt to cancel in downstream services if not found locally
    # This requires knowing which service owns the job, similar to get_job_status
    if job_id.startswith("biosim_run_"):
        try:
            # Assuming BioSim-Fusion has a cancel endpoint (hypothetical)
            await forward_request(
                f"http://localhost:{TOOL_PORTS['biosim']}/v1/run/{job_id.replace('biosim_run_', '')}/cancel",
                method="POST",
            )
            return {
                "job_id": job_id,
                "status": "cancelled",
                "message": "BioSim-Fusion job cancellation requested",
            }
        except HTTPException as e:
            logger.warning(f"Failed to cancel BioSim-Fusion job {job_id}: {e.detail}")

    return {
        "job_id": job_id,
        "status": "cancelled",
        "message": "BioSim-Fusion job cancellation requested",
    }
except (HTTPException, httpx.RequestError) as e:
    logger.warning(f"Failed to cancel BioSim-Fusion job {job_id}: {e.detail if isinstance(e, HTTPException) else str(e)}")

if job_id.startswith("genmutant_job_"):
try:
    # Assuming GenMutant has a cancel endpoint
    await forward_request(
        f"http://localhost:{TOOL_PORTS['genmutant']}/api/v1/jobs/{job_id.replace('genmutant_job_', '')}/cancel",
        method="POST",
    )
    return {
        "job_id": job_id,
        "status": "cancelled",
        "message": "GenMutant job cancellation requested",
    }
except (HTTPException, httpx.RequestError) as e:
    logger.warning(f"Failed to cancel GenMutant job {job_id}: {e.detail if isinstance(e, HTTPException) else str(e)}")

# Add cancellation logic for other microservices if they have cancel endpoints

    raise HTTPException(
        status_code=404, detail=f"Job '{job_id}' not found or cannot be cancelled."
    )


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 80)
    print("  CHEETAH v4 ENHANCED UNIFIED SCIENTIFIC API GATEWAY")
    print("=" * 80)
    print("\n  Starting server on http://localhost:8000")
    print("\n  Enhanced Access Points:")
    print("    - API Documentation:      http://localhost:8000/docs")
    print("    - Health Check:           http://localhost:8000/health")
    print("    - Tools (Enhanced):       http://localhost:8000/api/v1/tools")
    print("    - API Analytics:          http://localhost:8000/api/v1/analytics/metrics")
    print("    - Prometheus Metrics:     http://localhost:8000/metrics")
    print("    - Basketball-Biotech:     http://localhost:8000/api/v1/integrations/basketball-biotech")
    print("\n  Core Endpoints:")
    print("    - Pipelines:              http://localhost:8000/api/v1/pipelines")
    print("    - Files:                  http://localhost:8000/api/v1/files")
    print("    - Jobs:                   http://localhost:8000/api/v1/jobs")
    print("\n  Cheetah v4 Features:")
    print("    - Real-time API monitoring")
    print("    - Tool health scoring")
    print("    - Intelligent retry logic")
    print("    - Basketball-biotech integration")
    print("    - Performance analytics")
    print("    - Correlation ID tracking")
    print("\n" + "=" * 80 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
