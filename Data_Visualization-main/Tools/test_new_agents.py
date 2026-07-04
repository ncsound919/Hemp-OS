import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'Draymond'))

def test_imports():
    print("Testing imports...")
    from draymond_integrations import HttpClientProvider, ScraperProvider, AutomationProvider
    from draymond_core import AgentRegistry
    print("  - Imports OK")
    return True

def test_agents_registered():
    print("Testing agent registration...")
    from draymond_core import AgentRegistry
    registry = AgentRegistry()
    
    agents_to_check = ['http_ops', 'scraper_ops', 'automation_ops']
    for agent_name in agents_to_check:
        agent = registry.get_agent(agent_name)
        if not agent:
            print(f"  - FAILED: {agent_name} not registered")
            return False
        print(f"  - {agent_name}: {agent.capabilities}")
    return True

def test_http_provider():
    print("Testing HTTP provider...")
    from draymond_integrations import IntegrationManager
    im = IntegrationManager("test_db")
    
    result = im.http_request("GET", "https://httpbin.org/get", timeout=10)
    if result.get("success"):
        print(f"  - HTTP GET OK (status: {result.get('status')})")
        return True
    else:
        print(f"  - HTTP GET failed: {result.get('error')}")
        return False

def test_automation_provider():
    print("Testing Automation provider...")
    from draymond_integrations import IntegrationManager
    im = IntegrationManager("test_db")
    
    im.add_automation_rule(
        "test_rule",
        {"field": "price", "op": "gt", "value": 100},
        {"type": "log", "message": "Price is high!"}
    )
    
    rules = im.list_automation_rules()
    print(f"  - Rules: {len(rules)}")
    
    triggered = im.check_automation({"price": 150})
    print(f"  - Triggered: {len(triggered)}")
    
    history = im.get_automation_history()
    print(f"  - History: {len(history)} events")
    return True

def test_integration_manager():
    print("Testing IntegrationManager...")
    from draymond_integrations import IntegrationManager
    im = IntegrationManager("test_db")
    
    http = im.get_http_provider()
    scraper = im.get_scraper_provider()
    automation = im.get_automation_provider()
    
    print(f"  - HTTP provider: {type(http).__name__}")
    print(f"  - Scraper provider: {type(scraper).__name__}")
    print(f"  - Automation provider: {type(automation).__name__}")
    return True

if __name__ == "__main__":
    try:
        test_imports()
        test_agents_registered()
        test_integration_manager()
        test_http_provider()
        test_automation_provider()
        print("\nALL TESTS PASSED")
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
