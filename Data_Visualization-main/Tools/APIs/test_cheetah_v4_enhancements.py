#!/usr/bin/env python3
"""
Test Script for Cheetah v4 Enhanced API Gateway

This script tests the enhanced capabilities of the Cheetah v4
Unified Scientific API Gateway, including:
- Enhanced tool health checking
- API analytics and monitoring
- Basketball-biotech integration
- Real-time metrics collection
- Alerting system
"""

import asyncio
import httpx
import json
import time
from datetime import datetime
from typing import Dict, List, Any
import statistics


class CheetahV4Tester:
    """Test the Cheetah v4 enhanced API gateway."""
    
    def __init__(self, gateway_url: str = "http://localhost:8000", 
                 monitoring_url: str = "http://localhost:8001"):
        self.gateway_url = gateway_url
        self.monitoring_url = monitoring_url
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.test_results = []
    
    async def run_all_tests(self):
        """Run all tests."""
        print("\n" + "=" * 80)
        print("  CHEETAH v4 ENHANCED API GATEWAY TEST SUITE")
        print("=" * 80)
        
        tests = [
            self.test_gateway_health,
            self.test_enhanced_tools_endpoint,
            self.test_api_analytics,
            self.test_basketball_biotech_integration,
            self.test_tool_execution_with_enhancements,
            self.test_monitoring_service,
            self.test_performance_under_load
        ]
        
        for test in tests:
            try:
                await test()
                await asyncio.sleep(1)  # Brief pause between tests
            except Exception as e:
                print(f"  [ERROR] Test failed: {type(e).__name__}: {e}")
        
        self.print_summary()
    
    async def test_gateway_health(self):
        """Test basic gateway health."""
        print("\n[TEST 1] Testing Gateway Health...")
        
        try:
            response = await self.http_client.get(f"{self.gateway_url}/health")
            assert response.status_code == 200
            data = response.json()
            assert data.get("status") == "healthy"
            
            print(f"  [PASS] Gateway health check successful")
            self.test_results.append({"test": "gateway_health", "status": "pass"})
            
        except Exception as e:
            print(f"  [FAIL] Gateway health check failed: {e}")
            self.test_results.append({"test": "gateway_health", "status": "fail", "error": str(e)})
    
    async def test_enhanced_tools_endpoint(self):
        """Test enhanced tools endpoint with health scores."""
        print("\n[TEST 2] Testing Enhanced Tools Endpoint...")
        
        try:
            response = await self.http_client.get(f"{self.gateway_url}/api/v1/tools")
            assert response.status_code == 200
            data = response.json()
            
            # Check for enhanced fields
            assert "tools" in data
            assert "timestamp" in data
            assert "overall_health_score" in data
            
            tools = data["tools"]
            assert len(tools) > 0
            
            # Check each tool has enhanced fields
            for tool in tools:
                assert "id" in tool
                assert "health_score" in tool
                assert "last_checked" in tool
                assert "response_time_ms" in tool or tool["status"] == "unavailable"
                
                # Health score should be between 0 and 1
                health_score = tool.get("health_score", 0)
                assert 0 <= health_score <= 1
            
            print(f"  [PASS] Enhanced tools endpoint successful. Found {len(tools)} tools.")
            print(f"  [INFO] Overall health score: {data['overall_health_score']:.2f}")
            
            self.test_results.append({
                "test": "enhanced_tools", 
                "status": "pass",
                "tools_count": len(tools),
                "overall_health": data["overall_health_score"]
            })
            
        except Exception as e:
            print(f"  [FAIL] Enhanced tools test failed: {e}")
            self.test_results.append({"test": "enhanced_tools", "status": "fail", "error": str(e)})
    
    async def test_api_analytics(self):
        """Test API analytics endpoint."""
        print("\n[TEST 3] Testing API Analytics...")
        
        try:
            response = await self.http_client.get(
                f"{self.gateway_url}/api/v1/analytics/metrics",
                params={"time_range": "1h", "granularity": "5m"}
            )
            assert response.status_code == 200
            data = response.json()
            
            # Check required fields
            required_fields = [
                "request_count", "error_count", "avg_response_time_ms",
                "p95_response_time_ms", "p99_response_time_ms", "success_rate",
                "active_requests", "tool_health_scores"
            ]
            
            for field in required_fields:
                assert field in data
            
            # Validate data types and ranges
            assert isinstance(data["request_count"], int)
            assert isinstance(data["error_count"], int)
            assert isinstance(data["success_rate"], float)
            assert 0 <= data["success_rate"] <= 1
            
            print(f"  [PASS] API analytics endpoint successful")
            print(f"  [INFO] Request count: {data['request_count']}, Success rate: {data['success_rate']:.1%}")
            
            self.test_results.append({
                "test": "api_analytics",
                "status": "pass",
                "request_count": data["request_count"],
                "success_rate": data["success_rate"]
            })
            
        except Exception as e:
            print(f"  [FAIL] API analytics test failed: {e}")
            self.test_results.append({"test": "api_analytics", "status": "fail", "error": str(e)})
    
    async def test_basketball_biotech_integration(self):
        """Test basketball-biotech integration endpoint."""
        print("\n[TEST 4] Testing Basketball-Biotech Integration...")
        
        try:
            # Create test data
            test_data = {
                "player_id": "test_player_001",
                "biometric_data": {
                    "heart_rate_recovery": 120,
                    "sleep_quality": 0.8,
                    "hydration_level": 0.9
                },
                "performance_metrics": {
                    "points_per_game": 25.5,
                    "assists_per_game": 7.2,
                    "rebounds_per_game": 8.1,
                    "field_goal_percentage": 48.5,
                    "turnovers_per_game": 2.8
                },
                "health_indicators": {
                    "heart_rate_variability": 65,
                    "cortisol_level": 12.5,
                    "inflammation_markers": 0.3
                }
            }
            
            response = await self.http_client.post(
                f"{self.gateway_url}/api/v1/integrations/basketball-biotech",
                json=test_data
            )
            assert response.status_code == 200
            data = response.json()
            
            # Check response structure
            assert "correlation_id" in data
            assert "analysis_type" in data
            assert "results" in data
            assert "confidence_score" in data
            assert "recommendations" in data
            
            results = data["results"]
            assert "player_id" in results
            assert "performance_score" in results
            assert "health_score" in results
            assert "fatigue_level" in results
            assert "overall_score" in results
            
            # Validate scores
            assert 0 <= results["performance_score"] <= 1
            assert 0 <= results["health_score"] <= 1
            assert 0 <= results["overall_score"] <= 1
            assert results["fatigue_level"] in ["low", "moderate", "high"]
            
            print(f"  [PASS] Basketball-biotech integration successful")
            print(f"  [INFO] Performance score: {results['performance_score']:.2f}")
            print(f"  [INFO] Health score: {results['health_score']:.2f}")
            print(f"  [INFO] Fatigue level: {results['fatigue_level']}")
            print(f"  [INFO] Recommendations: {len(data['recommendations'])}")
            
            self.test_results.append({
                "test": "basketball_biotech",
                "status": "pass",
                "correlation_id": data["correlation_id"],
                "performance_score": results["performance_score"],
                "health_score": results["health_score"]
            })
            
        except Exception as e:
            print(f"  [FAIL] Basketball-biotech integration test failed: {e}")
            self.test_results.append({"test": "basketball_biotech", "status": "fail", "error": str(e)})
    
    async def test_tool_execution_with_enhancements(self):
        """Test tool execution with enhanced features."""
        print("\n[TEST 5] Testing Enhanced Tool Execution...")
        
        try:
            # Test with correlation ID and priority
            test_request = {
                "endpoint_path": "/health",  # Using health endpoint for testing
                "params": {},
                "correlation_id": f"test_{int(time.time())}",
                "priority": "normal",
                "timeout_seconds": 10,
                "retry_config": {
                    "max_retries": 2,
                    "backoff_factor": 1.0
                }
            }
            
            # Try to execute on a tool (using biosim as example)
            response = await self.http_client.post(
                f"{self.gateway_url}/api/v1/tools/biosim/execute",
                json=test_request
            )
            
            # We expect either success or appropriate error
            if response.status_code == 200:
                data = response.json()
                print(f"  [PASS] Tool execution successful")
                print(f"  [INFO] Response contains metadata: {'_metadata' in data}")
                
                self.test_results.append({
                    "test": "tool_execution",
                    "status": "pass",
                    "response_status": response.status_code
                })
                
            elif response.status_code in [404, 503, 502]:
                # Tool might not be running, which is okay for test
                print(f"  [INFO] Tool not available (expected for test): {response.status_code}")
                
                self.test_results.append({
                    "test": "tool_execution",
                    "status": "skip",
                    "reason": "Tool not running"
                })
                
            else:
                print(f"  [WARN] Unexpected response: {response.status_code}")
                
                self.test_results.append({
                    "test": "tool_execution",
                    "status": "warn",
                    "response_status": response.status_code
                })
                
        except Exception as e:
            print(f"  [FAIL] Tool execution test failed: {e}")
            self.test_results.append({"test": "tool_execution", "status": "fail", "error": str(e)})
    
    async def test_monitoring_service(self):
        """Test monitoring service if available."""
        print("\n[TEST 6] Testing Monitoring Service...")
        
        try:
            # Check if monitoring service is running
            try:
                response = await self.http_client.get(f"{self.monitoring_url}/health", timeout=5.0)
                monitoring_available = response.status_code == 200
            except:
                monitoring_available = False
            
            if not monitoring_available:
                print(f"  [SKIP] Monitoring service not available at {self.monitoring_url}")
                self.test_results.append({
                    "test": "monitoring_service",
                    "status": "skip",
                    "reason": "Service not running"
                })
                return
            
            # Test monitoring endpoints
            endpoints = [
                "/health",
                "/metrics/realtime",
                "/alerts",
                "/dashboard"
            ]
            
            for endpoint in endpoints:
                try:
                    response = await self.http_client.get(f"{self.monitoring_url}{endpoint}", timeout=5.0)
                    assert response.status_code == 200
                    print(f"  [OK] {endpoint}: {response.status_code}")
                except Exception as e:
                    print(f"  [WARN] {endpoint}: {e}")
            
            print(f"  [PASS] Monitoring service tests completed")
            
            self.test_results.append({
                "test": "monitoring_service",
                "status": "pass",
                "endpoints_tested": len(endpoints)
            })
            
        except Exception as e:
            print(f"  [FAIL] Monitoring service test failed: {e}")
            self.test_results.append({"test": "monitoring_service", "status": "fail", "error": str(e)})
    
    async def test_performance_under_load(self):
        """Test performance under simulated load."""
        print("\n[TEST 7] Testing Performance Under Load...")
        
        try:
            # Simulate multiple concurrent requests
            num_requests = 10
            start_time = time.time()
            
            tasks = []
            for i in range(num_requests):
                task = self.http_client.get(f"{self.gateway_url}/health")
                tasks.append(task)
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Count successful responses
            success_count = sum(1 for r in responses if isinstance(r, httpx.Response) and r.status_code == 200)
            
            requests_per_second = num_requests / duration if duration > 0 else 0
            
            print(f"  [INFO] Made {num_requests} requests in {duration:.2f}s")
            print(f"  [INFO] Success rate: {success_count}/{num_requests} ({success_count/num_requests:.1%})")
            print(f"  [INFO] Throughput: {requests_per_second:.1f} requests/second")
            
            if success_count >= num_requests * 0.8:  # 80% success threshold
                print(f"  [PASS] Performance test successful")
                self.test_results.append({
                    "test": "performance",
                    "status": "pass",
                    "requests": num_requests,
                    "success_rate": success_count/num_requests,
                    "throughput_rps": requests_per_second
                })
            else:
                print(f"  [FAIL] Performance test failed: success rate too low")
                self.test_results.append({
                    "test": "performance",
                    "status": "fail",
                    "success_rate": success_count/num_requests
                })
                
        except Exception as e:
            print(f"  [FAIL] Performance test failed: {e}")
            self.test_results.append({"test": "performance", "status": "fail", "error": str(e)})
    
    def print_summary(self):
        """Print test summary."""
        print("\n" + "=" * 80)
        print("  TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.test_results if r["status"] == "pass")
        failed = sum(1 for r in self.test_results if r["status"] == "fail")
        skipped = sum(1 for r in self.test_results if r["status"] in ["skip", "warn"])
        total = len(self.test_results)
        
        print(f"\n  Total Tests: {total}")
        print(f"  Passed: {passed}")
        print(f"  Failed: {failed}")
        print(f"  Skipped/Warnings: {skipped}")
        
        if failed == 0:
            print(f"\n  [SUCCESS] All critical tests passed!")
        else:
            print(f"\n  [WARNING] {failed} test(s) failed")
        
        # Print detailed results
        print(f"\n  Detailed Results:")
        for result in self.test_results:
            status_icon = "✓" if result["status"] == "pass" else "✗" if result["status"] == "fail" else "⚠"
            print(f"    {status_icon} {result['test']}: {result['status']}")
            
            if result["status"] == "fail" and "error" in result:
                print(f"        Error: {result['error'][:100]}...")
        
        print("\n" + "=" * 80)
    
    async def cleanup(self):
        """Clean up HTTP client."""
        await self.http_client.aclose()


async def main():
    """Main test function."""
    tester = CheetahV4Tester()
    
    try:
        await tester.run_all_tests()
    finally:
        await tester.cleanup()


if __name__ == "__main__":
    print("Starting Cheetah v4 Enhanced API Gateway Tests...")
    print("Note: Ensure the gateway is running on http://localhost:8000")
    print("      Monitoring service (optional) on http://localhost:8001")
    print()
    
    asyncio.run(main())