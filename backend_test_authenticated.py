"""
Enhanced Backend API Testing for Roast Live - Phase 8
Tests Authentication, 2FA, and Payout endpoints with authenticated flows
"""

import requests
import json
import time
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import secrets

# Backend URL
BASE_URL = "https://codeclinic-1.preview.emergentagent.com/api"

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "roast_live"

# Test data
TEST_USER_EMAIL = f"testuser_{int(time.time())}@roastlive.app"
TEST_USER_NAME = "Test User"

# Global variables
session_token = None
user_id = None
totp_secret = None
backup_codes = []

def print_test_header(test_name):
    """Print formatted test header"""
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(success, message, details=None):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if details and isinstance(details, dict):
        # Don't print sensitive data
        safe_details = {k: v for k, v in details.items() if k not in ['session_token', 'otp_secret', 'backup_codes']}
        if safe_details:
            print(f"Details: {json.dumps(safe_details, indent=2)}")

def setup_test_user():
    """Create a test user directly in MongoDB"""
    print_test_header("Setup: Creating Test User in Database")
    global session_token, user_id
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Generate test user
        user_id = f"user_{secrets.token_hex(12)}"
        session_token = secrets.token_hex(32)
        
        # Create user document
        user_doc = {
            "user_id": user_id,
            "email": TEST_USER_EMAIL,
            "name": TEST_USER_NAME,
            "picture": None,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Insert user
        db.users.insert_one(user_doc)
        
        # Create session
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        }
        
        db.user_sessions.insert_one(session_doc)
        
        print_result(True, f"Test user created: {user_id}")
        client.close()
        return True
        
    except Exception as e:
        print_result(False, f"Failed to create test user: {str(e)}")
        return False

def cleanup_test_user():
    """Remove test user from MongoDB"""
    print_test_header("Cleanup: Removing Test User")
    global user_id
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Delete user and related data
        db.users.delete_many({"user_id": user_id})
        db.user_sessions.delete_many({"user_id": user_id})
        db.temp_2fa_setup.delete_many({"user_id": user_id})
        db.creators.delete_many({"platform_user_id": user_id})
        db.payments.delete_many({"creator_id": user_id})
        
        print_result(True, "Test user cleaned up")
        client.close()
        return True
        
    except Exception as e:
        print_result(False, f"Failed to cleanup: {str(e)}")
        return False

# ============================================================================
# AUTHENTICATED TESTS
# ============================================================================

def test_auth_me_authenticated():
    """Test GET /api/auth/me - Get authenticated user"""
    print_test_header("Auth: Get Me (Authenticated)")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("user_id") == user_id and data.get("email") == TEST_USER_EMAIL:
                print_result(True, "Successfully retrieved authenticated user", data)
                return True
            else:
                print_result(False, "User data mismatch", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Auth me test failed: {str(e)}")
        return False

def test_auth_check_authenticated():
    """Test GET /api/auth/check - Check auth status with token"""
    print_test_header("Auth: Check Status (Authenticated)")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.get(f"{BASE_URL}/auth/check", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("authenticated") == True:
                print_result(True, "Correctly returns authenticated", data)
                return True
            else:
                print_result(False, "Should return authenticated=true", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Auth check failed: {str(e)}")
        return False

def test_2fa_generate_authenticated():
    """Test POST /api/2fa/generate - Generate 2FA secret"""
    print_test_header("2FA: Generate Secret (Authenticated)")
    global totp_secret, backup_codes
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.post(f"{BASE_URL}/2fa/generate", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "secret" in data and "backup_codes" in data and "qr_code_url" in data:
                totp_secret = data["secret"]
                backup_codes = data["backup_codes"]
                print_result(True, f"2FA setup generated successfully (secret length: {len(totp_secret)}, backup codes: {len(backup_codes)})")
                return True
            else:
                print_result(False, "Missing required fields in response", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"2FA generate test failed: {str(e)}")
        return False

def test_2fa_verify_authenticated():
    """Test POST /api/2fa/verify - Verify TOTP code"""
    print_test_header("2FA: Verify TOTP (Authenticated)")
    
    try:
        # Generate a valid TOTP code
        import pyotp
        totp = pyotp.TOTP(totp_secret)
        valid_code = totp.now()
        
        headers = {"Authorization": f"Bearer {session_token}"}
        payload = {"otp_code": valid_code}
        response = requests.post(f"{BASE_URL}/2fa/verify", json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            # During setup, response includes backup_codes; during login, it includes 2fa_verified
            if "message" in data and ("2fa_verified" in data or "backup_codes" in data):
                print_result(True, "TOTP code verified successfully", data)
                return True
            else:
                print_result(False, "Unexpected response format", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result(False, f"2FA verify test failed: {str(e)}")
        return False

def test_2fa_status_authenticated():
    """Test GET /api/2fa/status - Check 2FA status"""
    print_test_header("2FA: Check Status (Authenticated)")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.get(f"{BASE_URL}/2fa/status", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("is_2fa_enabled") == True:
                print_result(True, "2FA status correctly shows enabled", data)
                return True
            else:
                print_result(False, "2FA should be enabled after verification", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"2FA status test failed: {str(e)}")
        return False

def test_2fa_backup_code_verify():
    """Test POST /api/2fa/backup-code/verify - Verify backup code"""
    print_test_header("2FA: Verify Backup Code (Authenticated)")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        payload = {"backup_code": backup_codes[0]}  # Use first backup code
        response = requests.post(f"{BASE_URL}/2fa/backup-code/verify", json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("2fa_verified") == True:
                print_result(True, "Backup code verified successfully", data)
                return True
            else:
                print_result(False, "Backup code verification failed", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Backup code verify test failed: {str(e)}")
        return False

def test_2fa_disable_authenticated():
    """Test POST /api/2fa/disable - Disable 2FA"""
    print_test_header("2FA: Disable 2FA (Authenticated)")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.post(f"{BASE_URL}/2fa/disable", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                print_result(True, "2FA disabled successfully", data)
                return True
            else:
                print_result(False, "Unexpected response format", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"2FA disable test failed: {str(e)}")
        return False

def test_payout_status_authenticated():
    """Test GET /api/payouts/status - Get payout status"""
    print_test_header("Payouts: Get Status (Authenticated)")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.get(f"{BASE_URL}/payouts/status", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("is_registered") == False:
                print_result(True, "Payout status shows not registered (expected)", data)
                return True
            else:
                print_result(False, "Unexpected payout status", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Payout status test failed: {str(e)}")
        return False

def test_payout_register_creator():
    """Test POST /api/payouts/creators/register - Register creator"""
    print_test_header("Payouts: Register Creator (Authenticated)")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        payload = {
            "email": TEST_USER_EMAIL,
            "country": "US",
            "business_type": "individual"
        }
        response = requests.post(f"{BASE_URL}/payouts/creators/register", json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("mock_mode") == True and "stripe_account_id" in data:
                print_result(True, "Creator registered successfully in MOCK mode", data)
                return True
            else:
                print_result(False, "Unexpected response format", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result(False, f"Creator registration test failed: {str(e)}")
        return False

def test_payout_status_after_registration():
    """Test GET /api/payouts/status - Get payout status after registration"""
    print_test_header("Payouts: Get Status After Registration")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.get(f"{BASE_URL}/payouts/status", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("is_registered") == True and data.get("can_receive_payments") == True:
                print_result(True, "Payout status shows registered and ready", data)
                return True
            else:
                print_result(False, "Payout status should show registered", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Payout status test failed: {str(e)}")
        return False

def test_payout_create_payment():
    """Test POST /api/payouts/payments/create - Create payment"""
    print_test_header("Payouts: Create Payment (MOCK)")
    
    try:
        payload = {
            "creator_id": user_id,
            "amount_cents": 1000,
            "currency": "usd",
            "customer_email": "customer@test.com",
            "description": "Test payment for creator"
        }
        response = requests.post(f"{BASE_URL}/payouts/payments/create", json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("mock_mode") == True and data.get("status") == "succeeded":
                print_result(True, "Payment created successfully in MOCK mode", data)
                return True
            else:
                print_result(False, "Unexpected response format", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result(False, f"Payment creation test failed: {str(e)}")
        return False

def test_payout_get_earnings():
    """Test GET /api/payouts/creators/{creator_id}/earnings - Get earnings"""
    print_test_header("Payouts: Get Earnings")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.get(f"{BASE_URL}/payouts/creators/{user_id}/earnings", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "total_earnings_cents" in data and data.get("payment_count") >= 1:
                print_result(True, "Earnings retrieved successfully", data)
                return True
            else:
                print_result(False, "Unexpected earnings data", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Get earnings test failed: {str(e)}")
        return False

def test_payout_request_payout():
    """Test POST /api/payouts/creators/{creator_id}/request-payout - Request payout"""
    print_test_header("Payouts: Request Payout (MOCK)")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.post(f"{BASE_URL}/payouts/creators/{user_id}/request-payout", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("mock_mode") == True and data.get("status") == "paid":
                print_result(True, "Payout requested successfully in MOCK mode", data)
                return True
            else:
                print_result(False, "Unexpected response format", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}", response.text)
            return False
            
    except Exception as e:
        print_result(False, f"Payout request test failed: {str(e)}")
        return False

def test_auth_logout():
    """Test POST /api/auth/logout - Logout"""
    print_test_header("Auth: Logout (Authenticated)")
    
    try:
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.post(f"{BASE_URL}/auth/logout", headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                print_result(True, "Logout successful", data)
                return True
            else:
                print_result(False, "Unexpected response format", data)
                return False
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Logout test failed: {str(e)}")
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_all_tests():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("ROAST LIVE BACKEND API TESTING - PHASE 8 (AUTHENTICATED FLOWS)")
    print("Testing Authentication, 2FA, and Payout Endpoints")
    print("="*80)
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0
    }
    
    # Setup
    if not setup_test_user():
        print("\n❌ CRITICAL: Failed to setup test user. Aborting tests.")
        return results
    
    tests = [
        # Authentication tests
        ("Auth: Get Me", test_auth_me_authenticated),
        ("Auth: Check Status", test_auth_check_authenticated),
        
        # 2FA flow
        ("2FA: Generate Secret", test_2fa_generate_authenticated),
        ("2FA: Verify TOTP", test_2fa_verify_authenticated),
        ("2FA: Check Status", test_2fa_status_authenticated),
        ("2FA: Verify Backup Code", test_2fa_backup_code_verify),
        ("2FA: Disable 2FA", test_2fa_disable_authenticated),
        
        # Payout flow
        ("Payouts: Get Status (Not Registered)", test_payout_status_authenticated),
        ("Payouts: Register Creator", test_payout_register_creator),
        ("Payouts: Get Status (Registered)", test_payout_status_after_registration),
        ("Payouts: Create Payment", test_payout_create_payment),
        ("Payouts: Get Earnings", test_payout_get_earnings),
        ("Payouts: Request Payout", test_payout_request_payout),
        
        # Logout
        ("Auth: Logout", test_auth_logout),
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
        
        time.sleep(0.3)  # Small delay between tests
    
    # Cleanup
    cleanup_test_user()
    
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
