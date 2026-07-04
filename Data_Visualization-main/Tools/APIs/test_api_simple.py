"""Simple integration test for BioSim-Fusion API."""

import sys
import asyncio
from pathlib import Path

from httpx import AsyncClient, ASGITransport

# Add project root to path dynamically, based on this file location
repo_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(repo_root))

from biosim_fusion.api.main import app


async def test_api():
    """Test API endpoints."""
    print("Testing BioSim-Fusion API...")
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        # Test root
        print("\n1. Testing root endpoint...")
        response = await client.get("/")
        assert response.status_code == 200
        print("   ✅ Root endpoint works")
        
        # Test health
        print("\n2. Testing health endpoint...")
        response = await client.get("/health")
        assert response.status_code == 200
        print("   ✅ Health endpoint works")
        
        # Test CPU folding
        print("\n3. Testing CPU folding...")
        request = {
            "fastas": ["ACDEFG"],
            "mode": "cpu",
            "cores": 16,
        }
        response = await client.post("/v1/fold", json=request)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert len(data["pdbs"]) == 1
        assert data["pdbs"][0]["mode_used"] == "cpu"
        print(f"   ✅ CPU folding works")
        print(f"      Run ID: {data['run_id']}")
        print(f"      RMSD: {data['rmsds'][0]:.2f}Å")
        print(f"      Time: {data['time']}")
        
        # Test hybrid mode (force CPU for large proteins)
        print("\n4. Testing hybrid mode (CPU routing)...")
        request = {
            "fastas": ["A" * 20, "A" * 30],  # Both large, will route to CPU
            "mode": "hybrid",
            "cores": 32,
        }
        response = await client.post("/v1/fold", json=request)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert len(data["pdbs"]) == 2
        print(f"   ✅ Hybrid routing works")
        print(f"      Protein 1 ({len('A' * 20)}AA): {data['pdbs'][0]['mode_used']}")
        print(f"      Protein 2 ({len('A' * 30)}AA): {data['pdbs'][1]['mode_used']}")
        
        # Test run status
        print("\n5. Testing run status...")
        run_id = data["run_id"]
        response = await client.get(f"/v1/run/{run_id}")
        assert response.status_code == 200
        print("   ✅ Run status endpoint works")
        
        # Test list runs
        print("\n6. Testing list runs...")
        response = await client.get("/v1/runs")
        assert response.status_code == 200
        data = response.json()
        assert "runs" in data
        assert data["count"] > 0
        print(f"   ✅ List runs works ({data['count']} runs)")
    
    print("\n✅ All API tests passed!")


if __name__ == "__main__":
    asyncio.run(test_api())
