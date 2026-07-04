import os
import sys
import base64
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'Draymond'))
from draymond_integrations import IntegrationManager

def test_save_login_profile():
    print("Testing save_login_profile...")
    im = IntegrationManager("test_db")
    im.save_login_profile(
        profile_id="test1", 
        site_name="test_site", 
        login_url="http://test.com", 
        username="user1", 
        password="secret_password", 
        otp_secret="secret_otp"
    )
    
    profile = im.login_profiles["test1"]
    
    # Assert it's not plaintext
    assert profile["password"] != "secret_password", "Password is in plaintext!"
    assert profile["otp_secret"] != "secret_otp", "OTP is in plaintext!"
    
    # Assert we can decode it
    decoded_pw = base64.b64decode(profile["password"].encode('utf-8')).decode('utf-8')
    assert decoded_pw == "secret_password", "Cannot decode password properly"
    print("test_save_login_profile PASSED")

def test_api_server_auth_enforcement():
    print("Testing api_server_auth_enforcement...")
    # Change env to trigger 503
    if "DRAYMOND_API_KEY" in os.environ:
        del os.environ["DRAYMOND_API_KEY"]
        
    import api_server
    api_server.API_KEY = ""
    app = api_server.app
    app.testing = True
    client = app.test_client()
    
    # test protected endpoint (previously unprotected) like /api/agents (wait, that was protected)
    # let's test a purely unprotected endpoint like /api/tasks (which was missing @require_auth)
    # Actually wait, let's just test any endpoint
    resp = client.get("/api/status")
    assert resp.status_code == 503, f"Expected 503, got {resp.status_code}"
    
    # Set API KEY and test
    api_server.API_KEY = "test_key"
    resp = client.get("/api/status")
    # This might return 401 because we didn't pass the key in header
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    
    print("test_api_server_auth_enforcement PASSED")

def test_marketplace_api_leak():
    print("Testing marketplace_api.py (Static check)...")
    with open(os.path.join(os.path.dirname(__file__), 'Draymond', 'marketplace', 'marketplace_api.py'), 'r', encoding='utf-8') as f:
        content = f.read()
    assert "Generated random ephemeral key: {MARKETPLACE_API_KEY}" not in content, "Key is still leaked in logs!"
    assert "ALLOW_UNSECURE =" not in content, "ALLOW_UNSECURE bypass is still present!"
    print("test_marketplace_api_leak PASSED")

if __name__ == "__main__":
    try:
        test_save_login_profile()
        test_api_server_auth_enforcement()
        test_marketplace_api_leak()
        print("ALL TESTS PASSED")
    except Exception as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
