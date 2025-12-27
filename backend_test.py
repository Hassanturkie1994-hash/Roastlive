"""
Comprehensive Backend API Testing for Roast Live
Tests Authentication, 2FA, and Payout endpoints (Phase 8)
"""

import requests
import json
import time
from datetime import datetime

# Backend URL
BASE_URL = "https://roast-auth-1.preview.emergentagent.com/api"

# Test data
TEST_USER_EMAIL = "testuser@roastlive.app"
TEST_USER_NAME = "Test User"
TEST_SESSION_ID = "test_session_123"

# Global variables to store session data
session_token = None
user_id = None
totp_secret = None
backup_codes = []
creator_stripe_account_id = None

def print_test_header(test_name):
    """Print formatted test header"""
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(success, message, details=None):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"Details: {json.dumps(details, indent=2)}")

def test_health_check():
    """Test basic API health"""
    print_test_header("Health Check")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        if response.status_code == 200:
            print_result(True, "API is reachable", response.json())
            return True
        else:
            print_result(False, f"API returned status {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"API health check failed: {str(e)}")
        return False

# ============================================================================
# AUTHENTICATION TESTS
# ============================================================================

def test_auth_session_creation():
    """Test POST /api/auth/session - Create session from session_id"""
    print_test_header("Auth: Create Session (MOCKED)")
    global session_token, user_id
    
    try:
        # Note: This endpoint calls exchange_session_id which tries to hit external API
        # In mock mode, it should handle gracefully
        payload = {
            "session_id": TEST_SESSION_ID
        }
        
        response = requests.post(
            f"{BASE_URL}/auth/session",
            json=payload,
            timeout=10
        )
        
        # This will likely fail because exchange_session_id tries to call external API
        # But we should see a proper error response
        if response.status_code == 401:
            print_result(True, "Session exchange properly returns 401 for invalid session_id (expected in mock mode)", response.json())
            return True
        elif response.status_code == 200:
            data = response.json()
            session_token = data.get("session_token")
            user_id = data.get("user_id")
            print_result(True, "Session created successfully", data)
            return True
        else:
            print_result(False, f"Unexpected status code: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result(False, f"Session creation failed: {str(e)}")
        return False

def test_auth_check_unauthenticated():
    """Test GET /api/auth/check - Check auth status without token"""
    print_test_header("Auth: Check Status (Unauthenticated)")
    
    try:
        response = requests.get(f"{BASE_URL}/auth/check", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("authenticated") == False:
                print_result(True, "Correctly returns unauthenticated", data)
                return True
            else:
                print_result(False, "Should return authenticated=false", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Auth check failed: {str(e)}")
        return False

def test_auth_me_unauthenticated():
    """Test GET /api/auth/me - Get user without authentication"""
    print_test_header("Auth: Get Me (Unauthenticated)")
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        
        if response.status_code == 401:
            print_result(True, "Correctly returns 401 for unauthenticated request", response.json())
            return True
        else:
            print_result(False, f"Should return 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Auth me test failed: {str(e)}")
        return False

def test_auth_logout_unauthenticated():
    """Test POST /api/auth/logout - Logout without authentication"""
    print_test_header("Auth: Logout (Unauthenticated)")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/logout", timeout=10)
        
        if response.status_code == 401:
            print_result(True, "Correctly returns 401 for unauthenticated logout", response.json())
            return True
        else:
            print_result(False, f"Should return 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Logout test failed: {str(e)}")
        return False

# ============================================================================
# 2FA TESTS
# ============================================================================

def test_2fa_generate_unauthenticated():
    """Test POST /api/2fa/generate - Generate 2FA without authentication"""
    print_test_header("2FA: Generate Secret (Unauthenticated)")
    
    try:
        response = requests.post(f"{BASE_URL}/2fa/generate", timeout=10)
        
        if response.status_code == 401:
            print_result(True, "Correctly returns 401 for unauthenticated request", response.json())
            return True
        else:
            print_result(False, f"Should return 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"2FA generate test failed: {str(e)}")
        return False

def test_2fa_status_unauthenticated():
    """Test GET /api/2fa/status - Check 2FA status without authentication"""
    print_test_header("2FA: Check Status (Unauthenticated)")
    
    try:
        response = requests.get(f"{BASE_URL}/2fa/status", timeout=10)
        
        if response.status_code == 401:
            print_result(True, "Correctly returns 401 for unauthenticated request", response.json())
            return True
        else:
            print_result(False, f"Should return 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"2FA status test failed: {str(e)}")
        return False

def test_2fa_verify_unauthenticated():
    """Test POST /api/2fa/verify - Verify TOTP without authentication"""
    print_test_header("2FA: Verify TOTP (Unauthenticated)")
    
    try:
        payload = {"otp_code": "123456"}
        response = requests.post(f"{BASE_URL}/2fa/verify", json=payload, timeout=10)
        
        if response.status_code == 401:
            print_result(True, "Correctly returns 401 for unauthenticated request", response.json())
            return True
        else:
            print_result(False, f"Should return 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"2FA verify test failed: {str(e)}")
        return False

def test_2fa_backup_code_verify_unauthenticated():
    """Test POST /api/2fa/backup-code/verify - Verify backup code without authentication"""
    print_test_header("2FA: Verify Backup Code (Unauthenticated)")
    
    try:
        payload = {"backup_code": "ABCD1234"}
        response = requests.post(f"{BASE_URL}/2fa/backup-code/verify", json=payload, timeout=10)
        
        if response.status_code == 401:
            print_result(True, "Correctly returns 401 for unauthenticated request", response.json())
            return True
        else:
            print_result(False, f"Should return 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"2FA backup code test failed: {str(e)}")
        return False

def test_2fa_disable_unauthenticated():
    """Test POST /api/2fa/disable - Disable 2FA without authentication"""
    print_test_header("2FA: Disable 2FA (Unauthenticated)")
    
    try:
        response = requests.post(f"{BASE_URL}/2fa/disable", timeout=10)
        
        if response.status_code == 401:
            print_result(True, "Correctly returns 401 for unauthenticated request", response.json())
            return True
        else:
            print_result(False, f"Should return 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"2FA disable test failed: {str(e)}")
        return False

# ============================================================================
# PAYOUT TESTS
# ============================================================================

def test_payout_status_unauthenticated():
    """Test GET /api/payouts/status - Get payout status without authentication"""
    print_test_header("Payouts: Get Status (Unauthenticated)")
    
    try:
        response = requests.get(f"{BASE_URL}/payouts/status", timeout=10)
        
        if response.status_code == 401:
            print_result(True, "Correctly returns 401 for unauthenticated request", response.json())
            return True
        else:
            print_result(False, f"Should return 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Payout status test failed: {str(e)}")
        return False

def test_payout_register_creator_unauthenticated():
    """Test POST /api/payouts/creators/register - Register creator without authentication"""
    print_test_header("Payouts: Register Creator (Unauthenticated)")
    
    try:
        payload = {
            "email": TEST_USER_EMAIL,
            "country": "US",
            "business_type": "individual"
        }
        response = requests.post(f"{BASE_URL}/payouts/creators/register", json=payload, timeout=10)
        
        if response.status_code == 401:
            print_result(True, "Correctly returns 401 for unauthenticated request", response.json())
            return True
        else:
            print_result(False, f"Should return 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Payout register test failed: {str(e)}")
        return False

def test_payout_onboard():
    """Test GET /api/payouts/creators/{account_id}/onboard - Start onboarding"""
    print_test_header("Payouts: Start Onboarding (MOCK)")
    
    try:
        # In mock mode, this should return a mock response
        mock_account_id = "acct_MOCK_test123"
        response = requests.get(f"{BASE_URL}/payouts/creators/{mock_account_id}/onboard", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("mock_mode") == True:
                print_result(True, "Onboarding endpoint returns mock response", data)
                return True
            else:
                print_result(False, "Expected mock_mode=true in response", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Payout onboard test failed: {str(e)}")
        return False

def test_payout_create_payment_unauthenticated():
    """Test POST /api/payouts/payments/create - Create payment without authentication"""
    print_test_header("Payouts: Create Payment (Invalid Creator)")
    
    try:
        payload = {
            "creator_id": "test_creator_123",
            "amount_cents": 1000,
            "currency": "usd",
            "customer_email": "customer@test.com",
            "description": "Test payment"
        }
        response = requests.post(f"{BASE_URL}/payouts/payments/create", json=payload, timeout=10)
        
        # This endpoint doesn't require auth but requires valid creator
        if response.status_code in [400, 404]:
            print_result(True, "Correctly rejects payment for non-existent creator", response.json())
            return True
        else:
            print_result(False, f"Unexpected status code: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result(False, f"Payout create payment test failed: {str(e)}")
        return False

def test_payout_get_earnings_unauthenticated():
    """Test GET /api/payouts/creators/{creator_id}/earnings - Get earnings without authentication"""
    print_test_header("Payouts: Get Earnings (Unauthenticated)")
    
    try:
        response = requests.get(f"{BASE_URL}/payouts/creators/test_creator_123/earnings", timeout=10)
        
        if response.status_code == 401 or response.status_code == 403:
            print_result(True, "Correctly returns 401/403 for unauthenticated request", response.json())
            return True
        else:
            print_result(False, f"Should return 401/403, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Payout earnings test failed: {str(e)}")
        return False

def test_payout_request_payout_unauthenticated():
    """Test POST /api/payouts/creators/{creator_id}/request-payout - Request payout without authentication"""
    print_test_header("Payouts: Request Payout (Unauthenticated)")
    
    try:
        response = requests.post(f"{BASE_URL}/payouts/creators/test_creator_123/request-payout", timeout=10)
        
        if response.status_code == 401 or response.status_code == 403:
            print_result(True, "Correctly returns 401/403 for unauthenticated request", response.json())
            return True
        else:
            print_result(False, f"Should return 401/403, got {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Payout request test failed: {str(e)}")
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_all_tests():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("ROAST LIVE BACKEND API TESTING - PHASE 8")
    print("Testing Authentication, 2FA, and Payout Endpoints")
    print("="*80)
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0
    }
    
    tests = [
        # Health check
        ("Health Check", test_health_check),
        
        # Authentication tests
        ("Auth: Session Creation", test_auth_session_creation),
        ("Auth: Check Status (Unauthenticated)", test_auth_check_unauthenticated),
        ("Auth: Get Me (Unauthenticated)", test_auth_me_unauthenticated),
        ("Auth: Logout (Unauthenticated)", test_auth_logout_unauthenticated),
        
        # 2FA tests
        ("2FA: Generate Secret (Unauthenticated)", test_2fa_generate_unauthenticated),
        ("2FA: Check Status (Unauthenticated)", test_2fa_status_unauthenticated),
        ("2FA: Verify TOTP (Unauthenticated)", test_2fa_verify_unauthenticated),
        ("2FA: Verify Backup Code (Unauthenticated)", test_2fa_backup_code_verify_unauthenticated),
        ("2FA: Disable 2FA (Unauthenticated)", test_2fa_disable_unauthenticated),
        
        # Payout tests
        ("Payouts: Get Status (Unauthenticated)", test_payout_status_unauthenticated),
        ("Payouts: Register Creator (Unauthenticated)", test_payout_register_creator_unauthenticated),
        ("Payouts: Start Onboarding (MOCK)", test_payout_onboard),
        ("Payouts: Create Payment (Invalid Creator)", test_payout_create_payment_unauthenticated),
        ("Payouts: Get Earnings (Unauthenticated)", test_payout_get_earnings_unauthenticated),
        ("Payouts: Request Payout (Unauthenticated)", test_payout_request_payout_unauthenticated),
    ]
    
    for test_name, test_func in tests:
        results["total"] += 1
        try:
            if test_func():
                results["passed"] += 1
            else:
                results["failed"] += 1
        except Exception as e:
            print(f"❌ EXCEPTION in {test_name}: {str(e)}")
            results["failed"] += 1
        
        time.sleep(0.5)  # Small delay between tests
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {results['total']}")
    print(f"✅ Passed: {results['passed']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"Success Rate: {(results['passed']/results['total']*100):.1f}%")
    print("="*80)
    
    return results

if __name__ == "__main__":
    results = run_all_tests()
    
    # Exit with appropriate code
    exit(0 if results["failed"] == 0 else 1)
