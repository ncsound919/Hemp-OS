#!/usr/bin/env python3
"""
Digital Lab API - Standalone Version
=====================================

Simplified API server that runs immediately without complex imports.
Includes all main endpoints for testing the generated system.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="Digital Lab API - Standalone",
    version="1.0.0",
    description="Backend API for Digital Lab scientific platform (Standalone Version)"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "Digital Lab API"
    version: str = "1.0.0"

class ToolInfo(BaseModel):
    id: str
    name: str
    port: int
    status: str = "available"

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

class FileInfo(BaseModel):
    id: str
    filename: str
    size: int
    format: str
    uploaded_at: str

class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: float
    created_at: str

# ============================================================================
# IN-MEMORY DATA STORES
# ============================================================================

TOOLS_DB = [
    {"id": "pathosphere", "name": "Pathosphere", "port": 8001, "description": "Blockchain genomic data"},
    {"id": "genmutant", "name": "GenMutant-Pro", "port": 8002, "description": "Mutation analysis"},
    {"id": "biosim", "name": "BioSim-Fusion", "port": 8003, "description": "Protein folding"},
    {"id": "opencrispr", "name": "OpenCRISPR", "port": 8004, "description": "CRISPR design"},
    {"id": "monai", "name": "MONAI", "port": 8005, "description": "Medical imaging AI"},
    {"id": "notebook", "name": "OpenNotebook", "port": 8006, "description": "Research tracking"},
    {"id": "bioware", "name": "BiowareLabs", "port": 8007, "description": "Content synthesis"},
    {"id": "qlcce", "name": "QLCCE", "port": 8008, "description": "Quantum chemistry"},
]

pipelines_db = {}
files_db = {}
jobs_db = {}

# ============================================================================
# ROOT & HEALTH ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Digital Lab API - Standalone Version",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "documentation": "/docs",
            "health": "/health",
            "tools": "/api/v1/tools",
            "pipelines": "/api/v1/pipelines",
            "files": "/api/v1/files",
            "jobs": "/api/v1/jobs"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse()

# ============================================================================
# TOOLS ENDPOINTS
# ============================================================================

@app.get("/api/v1/tools")
async def list_tools():
    """List all available scientific tools"""
    return {
        "count": len(TOOLS_DB),
        "tools": TOOLS_DB
    }

@app.get("/api/v1/tools/{tool_id}")
async def get_tool(tool_id: str):
    """Get specific tool details"""
    for tool in TOOLS_DB:
        if tool["id"] == tool_id:
            return tool
    raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

@app.get("/api/v1/tools/{tool_id}/status")
async def get_tool_status(tool_id: str):
    """Get tool MCP server status"""
    for tool in TOOLS_DB:
        if tool["id"] == tool_id:
            return {
                "tool_id": tool_id,
                "name": tool["name"],
                "port": tool["port"],
                "status": "available",
                "url": f"http://localhost:{tool['port']}"
            }
    raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

@app.post("/api/v1/tools/{tool_id}/execute")
async def execute_tool(tool_id: str, params: Dict[str, Any]):
    """Execute a tool method"""
    for tool in TOOLS_DB:
        if tool["id"] == tool_id:
            job_id = f"job_{len(jobs_db) + 1}"
            jobs_db[job_id] = {
                "job_id": job_id,
                "tool_id": tool_id,
                "tool_name": tool["name"],
                "status": "running",
                "progress": 0.0,
                "params": params,
                "created_at": "2026-01-17T02:00:00"
            }
            return {
                "job_id": job_id,
                "status": "submitted",
                "message": f"Job submitted to {tool['name']}"
            }
    raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

# ============================================================================
# PIPELINES ENDPOINTS
# ============================================================================

@app.get("/api/v1/pipelines")
async def list_pipelines():
    """List all pipelines"""
    return {
        "count": len(pipelines_db),
        "pipelines": list(pipelines_db.values())
    }

@app.post("/api/v1/pipelines")
async def create_pipeline(pipeline: PipelineCreate):
    """Create a new pipeline"""
    pipeline_id = f"pipeline_{len(pipelines_db) + 1}"
    new_pipeline = {
        "id": pipeline_id,
        "name": pipeline.name,
        "description": pipeline.description,
        "steps": pipeline.steps,
        "created_at": "2026-01-17T02:00:00",
        "status": "created"
    }
    pipelines_db[pipeline_id] = new_pipeline
    return new_pipeline

@app.get("/api/v1/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str):
    """Get pipeline details"""
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")
    return pipelines_db[pipeline_id]

@app.put("/api/v1/pipelines/{pipeline_id}")
async def update_pipeline(pipeline_id: str, pipeline: PipelineCreate):
    """Update pipeline"""
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")

    pipelines_db[pipeline_id].update({
        "name": pipeline.name,
        "description": pipeline.description,
        "steps": pipeline.steps,
        "updated_at": "2026-01-17T02:00:00"
    })
    return pipelines_db[pipeline_id]

@app.delete("/api/v1/pipelines/{pipeline_id}")
async def delete_pipeline(pipeline_id: str):
    """Delete pipeline"""
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")

    deleted = pipelines_db.pop(pipeline_id)
    return {
        "status": "deleted",
        "pipeline": deleted
    }

@app.post("/api/v1/pipelines/{pipeline_id}/execute")
async def execute_pipeline(pipeline_id: str, inputs: Dict[str, Any]):
    """Execute a pipeline"""
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")

    job_id = f"job_{len(jobs_db) + 1}"
    jobs_db[job_id] = {
        "job_id": job_id,
        "pipeline_id": pipeline_id,
        "pipeline_name": pipelines_db[pipeline_id]["name"],
        "status": "running",
        "progress": 0.0,
        "inputs": inputs,
        "created_at": "2026-01-17T02:00:00"
    }

    return {
        "job_id": job_id,
        "pipeline_id": pipeline_id,
        "status": "submitted",
        "message": "Pipeline execution started"
    }

@app.post("/api/v1/pipelines/{pipeline_id}/validate")
async def validate_pipeline(pipeline_id: str):
    """Validate pipeline configuration"""
    if pipeline_id not in pipelines_db:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")

    pipeline = pipelines_db[pipeline_id]
    errors = []
    warnings = []

    # Basic validation
    if not pipeline.get("steps"):
        errors.append("Pipeline has no steps defined")

    if len(pipeline.get("steps", [])) > 20:
        warnings.append("Pipeline has more than 20 steps, may be slow")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "pipeline_id": pipeline_id,
        "step_count": len(pipeline.get("steps", []))
    }

# ============================================================================
# FILES ENDPOINTS
# ============================================================================

@app.get("/api/v1/files")
async def list_files():
    """List all uploaded files"""
    return {
        "count": len(files_db),
        "files": list(files_db.values())
    }

@app.post("/api/v1/files/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file"""
    file_id = f"file_{len(files_db) + 1}"

    # Detect format from extension
    format_map = {
        ".fasta": "FASTA",
        ".fa": "FASTA",
        ".fastq": "FASTQ",
        ".fq": "FASTQ",
        ".vcf": "VCF",
        ".bam": "BAM",
        ".sam": "SAM",
        ".pdb": "PDB",
        ".sdf": "SDF",
        ".dcm": "DICOM",
        ".nii": "NIfTI",
        ".json": "JSON",
        ".csv": "CSV",
    }

    file_ext = "." + file.filename.split(".")[-1].lower()
    file_format = format_map.get(file_ext, "UNKNOWN")

    file_info = {
        "id": file_id,
        "filename": file.filename,
        "size": 0,  # Would be actual size in real implementation
        "format": file_format,
        "content_type": file.content_type,
        "uploaded_at": "2026-01-17T02:00:00",
        "status": "uploaded"
    }

    files_db[file_id] = file_info
    return file_info

@app.get("/api/v1/files/{file_id}")
async def get_file_info(file_id: str):
    """Get file metadata"""
    if file_id not in files_db:
        raise HTTPException(status_code=404, detail=f"File '{file_id}' not found")
    return files_db[file_id]

@app.post("/api/v1/files/validate")
async def validate_file(file: UploadFile = File(...)):
    """Validate file format"""
    file_ext = "." + file.filename.split(".")[-1].lower()

    supported_formats = [".fasta", ".fa", ".fastq", ".fq", ".vcf", ".bam",
                        ".sam", ".pdb", ".sdf", ".dcm", ".nii", ".json", ".csv"]

    is_valid = file_ext in supported_formats

    return {
        "valid": is_valid,
        "filename": file.filename,
        "extension": file_ext,
        "supported": is_valid,
        "message": "Valid format" if is_valid else f"Unsupported format: {file_ext}"
    }

@app.delete("/api/v1/files/{file_id}")
async def delete_file(file_id: str):
    """Delete a file"""
    if file_id not in files_db:
        raise HTTPException(status_code=404, detail=f"File '{file_id}' not found")

    deleted = files_db.pop(file_id)
    return {
        "status": "deleted",
        "file": deleted
    }

# ============================================================================
# JOBS ENDPOINTS
# ============================================================================

@app.get("/api/v1/jobs")
async def list_jobs():
    """List all jobs"""
    return {
        "count": len(jobs_db),
        "jobs": list(jobs_db.values())
    }

@app.get("/api/v1/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status"""
    if job_id in jobs_db:
        return jobs_db[job_id]

    # Return mock status for demo
    return {
        "job_id": job_id,
        "status": "completed",
        "progress": 100.0,
        "created_at": "2026-01-17T02:00:00",
        "completed_at": "2026-01-17T02:05:00"
    }

@app.get("/api/v1/jobs/{job_id}/logs")
async def get_job_logs(job_id: str):
    """Get job execution logs"""
    return {
        "job_id": job_id,
        "logs": [
            {"timestamp": "2026-01-17T02:00:00", "level": "INFO", "message": "Job started"},
            {"timestamp": "2026-01-17T02:01:00", "level": "INFO", "message": "Processing data..."},
            {"timestamp": "2026-01-17T02:03:00", "level": "INFO", "message": "Analysis complete"},
            {"timestamp": "2026-01-17T02:05:00", "level": "INFO", "message": "Job completed successfully"}
        ]
    }

@app.post("/api/v1/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancel a running job"""
    if job_id in jobs_db:
        jobs_db[job_id]["status"] = "cancelled"
        return {
            "job_id": job_id,
            "status": "cancelled",
            "message": "Job cancelled successfully"
        }

    return {
        "job_id": job_id,
        "status": "cancelled",
        "message": "Job cancellation requested"
    }

@app.get("/api/v1/jobs/{job_id}/results")
async def get_job_results(job_id: str):
    """Get job results"""
    return {
        "job_id": job_id,
        "status": "completed",
        "results": {
            "output_files": [
                {"name": "results.json", "size": 1024, "type": "application/json"},
                {"name": "analysis.csv", "size": 2048, "type": "text/csv"}
            ],
            "summary": {
                "items_processed": 100,
                "success_rate": 0.95,
                "execution_time": "5m 30s"
            }
        }
    }

# ============================================================================
# SYSTEM INFO ENDPOINTS
# ============================================================================

@app.get("/api/v1/system/info")
async def system_info():
    """Get system information"""
    return {
        "service": "Digital Lab API",
        "version": "1.0.0",
        "status": "operational",
        "tools_available": len(TOOLS_DB),
        "pipelines_count": len(pipelines_db),
        "files_count": len(files_db),
        "jobs_count": len(jobs_db),
        "features": [
            "Tool execution",
            "Pipeline management",
            "File upload/validation",
            "Job monitoring",
            "Multiple scientific tools"
        ]
    }

@app.get("/api/v1/system/stats")
async def system_stats():
    """Get system statistics"""
    return {
        "tools": {
            "total": len(TOOLS_DB),
            "available": len([t for t in TOOLS_DB]),
        },
        "pipelines": {
            "total": len(pipelines_db),
            "active": len([p for p in pipelines_db.values() if p.get("status") != "archived"])
        },
        "files": {
            "total": len(files_db),
            "total_size": sum(f.get("size", 0) for f in files_db.values())
        },
        "jobs": {
            "total": len(jobs_db),
            "running": len([j for j in jobs_db.values() if j.get("status") == "running"]),
            "completed": len([j for j in jobs_db.values() if j.get("status") == "completed"])
        }
    }

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*80)
    print("  Digital Lab API - Standalone Server")
    print("="*80)
    print("\n  Starting server on http://localhost:8000")
    print("\n  Access points:")
    print("    - API Documentation: http://localhost:8000/docs")
    print("    - Health Check:      http://localhost:8000/health")
    print("    - Tools:             http://localhost:8000/api/v1/tools")
    print("    - Pipelines:         http://localhost:8000/api/v1/pipelines")
    print("    - Files:             http://localhost:8000/api/v1/files")
    print("    - Jobs:              http://localhost:8000/api/v1/jobs")
    print("\n" + "="*80 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
