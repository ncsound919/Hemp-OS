#!/usr/bin/env python3
"""
Digital Lab Gateway API

A lightweight API gateway that proxies the core API (8000) and the eight MCP
servers (8001-8008). This MVP provides a single entry point for API calls and
an easy path to add orchestration later.
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
import httpx
from typing import Optional
from fastapi.security import APIKeyHeader
from vault_manager import VaultManager
import os
import builtins

# Security setup
GATEWAY_API_KEY = os.environ.get("GATEWAY_API_KEY", "dev-gateway-key")
api_key_header = APIKeyHeader(name="X-Gateway-API-Key", auto_error=False)

async def verify_gateway_key(api_key: str = Depends(api_key_header)):
    if api_key != GATEWAY_API_KEY:
        if os.environ.get("ENVIRONMENT") == "production":
            raise HTTPException(status_code=403, detail="Invalid API Key")
        elif api_key is None:
            # For development, just warn if key is missing but allow for now? 
            # No, let's be strict but give a helper message.
            raise HTTPException(status_code=403, detail="X-Gateway-API-Key header required. Default dev key is 'dev-gateway-key'")
        elif api_key != GATEWAY_API_KEY:
            raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key

app = FastAPI(
    title="Digital Lab Gateway",
    version="1.0.0",
    description="Central API gateway for Overlay Labs Digital Lab (MCPs + Core)"
)

# Map tool identifiers to MCP port numbers. Core API lives on 8000.
TOOL_PORTS = {
    "pathosphere": 8001,
    "genmutant": 8002,
    "biosim": 8003,
    "opencrispr": 8004,
    "monai": 8005,
    "notebook": 8006,
    "bioware": 8007,
    "qlCCE": 8008,
    # alias to be forgiving on casing
    "qlcce": 8008,
}

CORE_BASE = "http://localhost:8000"
LOCALHOST = "http://localhost"

# Vault integration (Phase A MVP)
_VAULT: Optional[VaultManager] = None

def _get_vault() -> VaultManager:
    global _VAULT
    if _VAULT is None:
        _VAULT = VaultManager()
        # Prefer environment variable for passphrase
        passphrase = os.environ.get("DL_VAULT_PASSPHRASE")
        if not passphrase:
            try:
                passphrase = builtins.input("Enter vault passphrase: ")
            except Exception:
                raise HTTPException(status_code=500, detail="Vault passphrase required (set DL_VAULT_PASSPHRASE or input at prompt)")
        if not _VAULT.has_vault():
            _VAULT.init_vault(passphrase)
        else:
            _VAULT.unlock_with_passphrase(passphrase)
        # After unlock, ensure a public key exists for MCPs
    return _VAULT


async def forward(url: str, method: str = "GET", json_body: Optional[dict] = None, headers: Optional[dict] = None):
    async with httpx.AsyncClient() as client:
        try:
            m = method.upper()
            if m == "GET":
                resp = await client.get(url, timeout=30.0, headers=headers)
            elif m == "POST":
                resp = await client.post(url, json=json_body or {}, timeout=60.0, headers=headers)
            elif m == "PUT":
                resp = await client.put(url, json=json_body or {}, timeout=60.0, headers=headers)
            elif m == "DELETE":
                resp = await client.delete(url, timeout=30.0, headers=headers)
            else:
                raise ValueError("Unsupported HTTP method")
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Downstream request error: {exc}")
    content_type = resp.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        try:
            data = resp.json()
        except ValueError:
            data = resp.text
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=str(data))
        return data
    else:
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return {"content": resp.text}


@app.get("/")
async def root():
    return {"message": "Digital Lab Gateway", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy", "gateway": "Digital Lab Gateway"}


@app.get("/api/v1/secrets")
async def secrets_list(api_key: str = Depends(verify_gateway_key)):
    vault = _get_vault()
    name_list = []
    if vault and getattr(vault, "_vault", None):
        name_list = list(vault._vault.get("secrets", {}).keys())
    return {"count": len(name_list), "secrets": name_list}


@app.post("/api/v1/secrets")
async def secrets_create(req: Request, api_key: str = Depends(verify_gateway_key)):
    payload = await req.json()
    vault = _get_vault()
    vault.add_secret(payload["name"], payload.get("type", "API_KEY"), payload["value"], payload.get("rotation_days", 60), payload.get("metadata"))
    return {"status": "secret_added", "name": payload["name"]}


@app.post("/api/v1/secrets/rotate/{name}")
async def secrets_rotate(name: str, api_key: str = Depends(verify_gateway_key)):
    vault = _get_vault()
    vault.rotate_secret(name)
    return {"status": "rotated", "name": name}


@app.get("/api/v1/secrets/health")
async def secrets_health():
    # Simple health indicator
    return {"secrets_store": "operational"}


@app.get("/api/v1/tools")
async def tools_list():
    # Aggregate core tools and MCPs information to present a unified tool list
    core_url = f"{CORE_BASE}/api/v1/tools"
    mcp_ports = [8001,8002,8003,8004,8005,8006,8007,8008]
    tools_agg = []
    async with httpx.AsyncClient() as client:
        core_task = client.get(core_url, timeout=30.0)
        info_tasks = [client.get(f"http://localhost:{p}/info", timeout=5.0) for p in mcp_ports]
        tasks = [core_task, *info_tasks]
        responses = await __import__('asyncio').gather(*tasks, return_exceptions=True)
        core_resp = responses[0]
        if isinstance(core_resp, httpx.Response) and core_resp.status_code == 200:
            core_json = core_resp.json()
            for t in core_json.get("tools", []):
                tools_agg.append({
                    "id": str(t.get("id", "")).lower(),
                    "name": t.get("name"),
                    "port": t.get("port"),
                    "status": t.get("status", "available")
                })
        # MCPs
        seen_ports = set()
        for idx, resp in enumerate(responses[1:]):
            port = mcp_ports[idx]
            seen_ports.add(port)
            if isinstance(resp, httpx.Response) and resp.status_code == 200:
                info = resp.json()
                name = info.get("tool") or info.get("name") or f"MCP-{port}"
                tools_agg.append({"id": str(name).lower(), "name": name, "port": port, "status": "operational"})
            else:
                tools_agg.append({"id": f"mcp_{port}", "name": f"MCP on {port}", "port": port, "status": "down"})
        # Deduplicate by id while preserving last seen state
        merged = {t['id']: t for t in tools_agg}
        return {"count": len(merged), "tools": list(merged.values())}


@app.get("/api/v1/tools/{tool_id}")
async def tool_get(tool_id: str):
    port = None
    for k, v in TOOL_PORTS.items():
        if k.lower() == tool_id.lower():
            port = v
            break
    if port:
        url = f"http://localhost:{port}/api/v1/tools/{tool_id}"
        try:
            resp = await forward(url, method="GET")
            return resp
        except HTTPException:
            pass
    # Fallback to core API
    url = f"{CORE_BASE}/api/v1/tools/{tool_id}"
    return await forward(url, method="GET")


@app.post("/api/v1/tools/{tool_id}/execute")
async def tool_execute(tool_id: str, request: Request, api_key: str = Depends(verify_gateway_key)):
    body = await request.json()
    endpoint_path: Optional[str] = body.pop("endpoint_path", None)

    canonical = tool_id.lower()
    port = None
    for k, v in TOOL_PORTS.items():
        if k.lower() == canonical:
            port = v
            break
    if port is None:
        core_path = endpoint_path or f"/api/v1/tools/{tool_id}/execute"
        url = f"{CORE_BASE}{core_path}"
        return await forward(url, method="POST", json_body=body)

    # Endpoint mapping per tool (MCP specific)
    TOOL_EXEC_ENDPOINTS = {
        'pathosphere': '/store_genome_data',
        'genmutant': '/analyze_variants',
        'biosim': '/fold_protein',
        'opencrispr': '/design_guides',
        'monai': '/segment_organ',
        'notebook': '/create_notebook',
        'bioware': '/synthesize_literature',
        'qlcce': '/optimize_molecule',
    }
    ep = endpoint_path or TOOL_EXEC_ENDPOINTS.get(canonical)
    if ep is None:
        raise HTTPException(status_code=400, detail=f"No execute endpoint configured for tool '{tool_id}'")
    url = f"http://localhost:{port}{ep}"

    # Attach a short-lived RS256-signed token for secret access, if needed
    headers = {}
    secrets_map = {
        'pathosphere': ['pathosphere_api_key'],
        'genmutant': ['genmutant_api_key'],
        'biosim': ['biosim_api_key'],
        'opencrispr': ['opencrispr_api_key'],
        'monai': ['monai_api_key'],
        'notebook': ['notebook_api_key'],
        'bioware': ['bioware_api_key'],
        'qlcce': ['qlcce_api_key'],
    }
    if canonical in secrets_map:
        vault = _get_vault()
        try:
            token = vault.sign_token(secrets_map[canonical], subject="digital_lab_gateway")
            headers["Authorization"] = f"Bearer {token}"
        except Exception:
            pass
    return await forward(url, method="POST", json_body=body, headers=headers if headers else None)


# Pipelines (proxy to core by default)
@app.get("/api/v1/pipelines")
async def pipelines_list():
    return await forward(f"{CORE_BASE}/api/v1/pipelines", method="GET")


@app.post("/api/v1/pipelines")
async def pipelines_create(req: Request):
    payload = await req.json()
    return await forward(f"{CORE_BASE}/api/v1/pipelines", method="POST", json_body=payload)


@app.get("/api/v1/pipelines/{pipeline_id}")
async def pipeline_get(pipeline_id: str):
    return await forward(f"{CORE_BASE}/api/v1/pipelines/{pipeline_id}", method="GET")


@app.put("/api/v1/pipelines/{pipeline_id}")
async def pipeline_update(pipeline_id: str, req: Request):
    payload = await req.json()
    return await forward(f"{CORE_BASE}/api/v1/pipelines/{pipeline_id}", method="PUT", json_body=payload)


@app.delete("/api/v1/pipelines/{pipeline_id}")
async def pipeline_delete(pipeline_id: str):
    return await forward(f"{CORE_BASE}/api/v1/pipelines/{pipeline_id}", method="DELETE")


@app.post("/api/v1/pipelines/{pipeline_id}/execute")
async def pipeline_execute(pipeline_id: str, req: Request):
    payload = await req.json()
    return await forward(f"{CORE_BASE}/api/v1/pipelines/{pipeline_id}/execute", method="POST", json_body=payload)


@app.post("/api/v1/pipelines/{pipeline_id}/validate")
async def pipeline_validate(pipeline_id: str):
    return await forward(f"{CORE_BASE}/api/v1/pipelines/{pipeline_id}/validate", method="POST")


# Files
@app.get("/api/v1/files")
async def files_list():
    return await forward(f"{CORE_BASE}/api/v1/files", method="GET")


@app.post("/api/v1/files/upload")
async def files_upload(req: Request):
    payload = await req.json()
    return await forward(f"{CORE_BASE}/api/v1/files/upload", method="POST", json_body=payload)


@app.get("/api/v1/files/{file_id}")
async def file_get(file_id: str):
    return await forward(f"{CORE_BASE}/api/v1/files/{file_id}", method="GET")


@app.post("/api/v1/files/validate")
async def file_validate(req: Request):
    payload = await req.json()
    return await forward(f"{CORE_BASE}/api/v1/files/validate", method="POST", json_body=payload)


@app.delete("/api/v1/files/{file_id}")
async def file_delete(file_id: str):
    return await forward(f"{CORE_BASE}/api/v1/files/{file_id}", method="DELETE")


# Jobs
@app.get("/api/v1/jobs")
async def jobs_list():
    return await forward(f"{CORE_BASE}/api/v1/jobs", method="GET")


@app.get("/api/v1/jobs/{job_id}")
async def job_get(job_id: str):
    return await forward(f"{CORE_BASE}/api/v1/jobs/{job_id}", method="GET")


@app.get("/api/v1/jobs/{job_id}/logs")
async def job_logs(job_id: str):
    return await forward(f"{CORE_BASE}/api/v1/jobs/{job_id}/logs", method="GET")


@app.post("/api/v1/jobs/{job_id}/cancel")
async def job_cancel(job_id: str):
    return await forward(f"{CORE_BASE}/api/v1/jobs/{job_id}/cancel", method="POST")


@app.get("/api/v1/jobs/{job_id}/results")
async def job_results(job_id: str):
    return await forward(f"{CORE_BASE}/api/v1/jobs/{job_id}/results", method="GET")


# System
@app.get("/api/v1/system/info")
async def system_info():
    return await forward(f"{CORE_BASE}/api/v1/system/info", method="GET")


@app.get("/api/v1/system/stats")
async def system_stats():
    return await forward(f"{CORE_BASE}/api/v1/system/stats", method="GET")


__all__ = ["app"]
