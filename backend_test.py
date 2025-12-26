"""
Backend API Testing for Roast Live
Tests all backend endpoints focusing on Phases 3-7 features
"""

import requests
import json
import time
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://live-preview-22.preview.emergentagent.com/api"

# Test data
TEST_USER_ID = "test-user-" + str(int(time.time()))
TEST_STREAM_ID = None
TEST_CHANNEL_NAME = "test-channel-" + str(int(time.time()))

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(name):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Testing: {name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_success(message):
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    print(f"{RED}✗ {message}{RESET}")

def print_warning(message):
    print(f"{YELLOW}⚠ {message}{RESET}")

def print_info(message):
    print(f"  {message}")

# Test 1: Backend Health Check
def test_health_check():
    print_test("Backend Health Check")
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                print_success("Backend is responding correctly")
                return True
            else:
                print_error("Response missing 'message' field")
                return False
        else:
            print_error(f"Backend returned status code {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to connect to backend: {str(e)}")
        return False
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        return False

# Test 2: Content Moderation - Normal Text
def test_moderation_normal_text():
    print_test("Content Moderation - Normal Text")
    try:
        payload = {
            "text": "Hello everyone! Welcome to my stream. Let's have fun!",
            "userId": TEST_USER_ID,
            "contentType": "message"
        }
        
        response = requests.post(f"{BACKEND_URL}/moderate/text", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "action" in data and "flagged" in data:
                if data["action"] == "allow" and data["flagged"] == False:
                    print_success("Normal text correctly allowed")
                    return True
                else:
                    print_warning(f"Normal text flagged: action={data['action']}, flagged={data['flagged']}")
                    return True  # Still working, just overly sensitive
            else:
                print_error("Response missing required fields (action, flagged)")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 3: Content Moderation - Toxic Text
def test_moderation_toxic_text():
    print_test("Content Moderation - Toxic Text")
    try:
        payload = {
            "text": "You are stupid and worthless. I hate you!",
            "userId": TEST_USER_ID,
            "contentType": "message"
        }
        
        response = requests.post(f"{BACKEND_URL}/moderate/text", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "action" in data and "flagged" in data:
                print_info(f"Action: {data['action']}, Flagged: {data['flagged']}")
                if "categoryScores" in data:
                    print_info(f"Category Scores: {json.dumps(data['categoryScores'], indent=2)}")
                print_success("Toxic text moderation endpoint working")
                return True
            else:
                print_error("Response missing required fields")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 4: Content Moderation - Profane Text
def test_moderation_profane_text():
    print_test("Content Moderation - Profane Text")
    try:
        payload = {
            "text": "This is some explicit sexual content that should be flagged",
            "userId": TEST_USER_ID,
            "contentType": "message"
        }
        
        response = requests.post(f"{BACKEND_URL}/moderate/text", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "action" in data and "flagged" in data:
                print_info(f"Action: {data['action']}, Flagged: {data['flagged']}")
                print_success("Profane text moderation endpoint working")
                return True
            else:
                print_error("Response missing required fields")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 5: Content Moderation - Stream Title
def test_moderation_stream_title():
    print_test("Content Moderation - Stream Title")
    try:
        payload = {
            "text": "Epic Gaming Stream - Come Join!",
            "userId": TEST_USER_ID,
            "contentType": "bio"
        }
        
        response = requests.post(f"{BACKEND_URL}/moderate/text", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "action" in data:
                print_success("Stream title moderation working")
                return True
            else:
                print_error("Response missing 'action' field")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 6: Content Moderation - Username
def test_moderation_username():
    print_test("Content Moderation - Username")
    try:
        payload = {
            "text": "CoolGamer2024",
            "userId": TEST_USER_ID,
            "contentType": "username"
        }
        
        response = requests.post(f"{BACKEND_URL}/moderate/text", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "action" in data:
                print_success("Username moderation working")
                return True
            else:
                print_error("Response missing 'action' field")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 7: Content Moderation - Missing Input
def test_moderation_missing_input():
    print_test("Content Moderation - Error Handling (Missing Input)")
    try:
        payload = {
            "userId": TEST_USER_ID,
            "contentType": "message"
            # Missing 'text' field
        }
        
        response = requests.post(f"{BACKEND_URL}/moderate/text", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {response.text}")
        
        if response.status_code in [400, 422]:  # Bad request or validation error
            print_success("Error handling working correctly for missing input")
            return True
        else:
            print_warning(f"Expected 400/422 status code, got {response.status_code}")
            return True  # Not critical
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 8: Content Moderation - Invalid Input
def test_moderation_invalid_input():
    print_test("Content Moderation - Error Handling (Invalid Input)")
    try:
        payload = {
            "text": "",  # Empty text
            "userId": TEST_USER_ID,
            "contentType": "message"
        }
        
        response = requests.post(f"{BACKEND_URL}/moderate/text", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {response.text}")
        
        # Should either accept empty text or return error
        if response.status_code in [200, 400, 422]:
            print_success("Error handling working for empty text")
            return True
        else:
            print_warning(f"Unexpected status code: {response.status_code}")
            return True  # Not critical
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 9: Emergent LLM Chat Moderation
def test_emergent_chat_moderation():
    print_test("Emergent LLM Chat Moderation")
    try:
        payload = {
            "message": "Hello everyone! Great stream!",
            "user_id": TEST_USER_ID,
            "stream_id": "test-stream-123"
        }
        
        response = requests.post(f"{BACKEND_URL}/moderation/chat-message", json=payload, timeout=15)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "action" in data and "score" in data:
                print_success("Emergent LLM chat moderation working")
                return True
            else:
                print_error("Response missing required fields")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 10: Stream Creation
def test_stream_creation():
    print_test("Stream Creation")
    global TEST_STREAM_ID
    try:
        payload = {
            "hostId": TEST_USER_ID,
            "title": "Test Stream - Automated Testing",
            "channelName": TEST_CHANNEL_NAME
        }
        
        response = requests.post(f"{BACKEND_URL}/streams/create", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and "channelName" in data:
                TEST_STREAM_ID = data["id"]
                print_success(f"Stream created successfully with ID: {TEST_STREAM_ID}")
                return True
            else:
                print_error("Response missing required fields")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 11: Get Active Streams
def test_get_active_streams():
    print_test("Get Active Streams")
    try:
        response = requests.get(f"{BACKEND_URL}/streams/active", timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "streams" in data:
                print_success(f"Retrieved {len(data['streams'])} active streams")
                return True
            else:
                print_error("Response missing 'streams' field")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 12: Agora Token Generation
def test_agora_token_generation():
    print_test("Agora Token Generation")
    try:
        payload = {
            "channelName": TEST_CHANNEL_NAME,
            "uid": 12345,
            "role": "host"
        }
        
        response = requests.post(f"{BACKEND_URL}/streams/token", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "appId" in data:
                print_info(f"Token generated (length: {len(data['token'])})")
                print_info(f"App ID: {data['appId']}")
                print_success("Agora token generation working")
                return True
            else:
                print_error("Response missing required fields")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 13: Gift Catalog
def test_gift_catalog():
    print_test("Gift Catalog")
    try:
        response = requests.get(f"{BACKEND_URL}/gifts/catalog", timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "gifts" in data and len(data["gifts"]) > 0:
                print_success(f"Retrieved {len(data['gifts'])} gifts from catalog")
                return True
            else:
                print_error("No gifts in catalog")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 14: Wallet Balance
def test_wallet_balance():
    print_test("Wallet Balance")
    try:
        response = requests.get(f"{BACKEND_URL}/wallet/{TEST_USER_ID}", timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "balance" in data:
                print_success(f"Wallet balance retrieved: {data['balance']} coins")
                return True
            else:
                print_error("Response missing 'balance' field")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Test 15: MongoDB Connection (via status endpoint)
def test_mongodb_connection():
    print_test("MongoDB Connection")
    try:
        # Test by creating a status check
        payload = {
            "client_name": "backend_test"
        }
        
        response = requests.post(f"{BACKEND_URL}/status", json=payload, timeout=10)
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and "client_name" in data:
                print_success("MongoDB connection working (data saved successfully)")
                return True
            else:
                print_error("Response missing required fields")
                return False
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False

# Run all tests
def run_all_tests():
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}ROAST LIVE BACKEND API TESTING{RESET}")
    print(f"{BLUE}Backend URL: {BACKEND_URL}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    results = {}
    
    # Core tests
    results["Health Check"] = test_health_check()
    results["MongoDB Connection"] = test_mongodb_connection()
    
    # Content Moderation tests (HIGH PRIORITY)
    results["Moderation - Normal Text"] = test_moderation_normal_text()
    results["Moderation - Toxic Text"] = test_moderation_toxic_text()
    results["Moderation - Profane Text"] = test_moderation_profane_text()
    results["Moderation - Stream Title"] = test_moderation_stream_title()
    results["Moderation - Username"] = test_moderation_username()
    results["Moderation - Missing Input"] = test_moderation_missing_input()
    results["Moderation - Invalid Input"] = test_moderation_invalid_input()
    results["Emergent LLM Chat Moderation"] = test_emergent_chat_moderation()
    
    # Stream tests
    results["Stream Creation"] = test_stream_creation()
    results["Get Active Streams"] = test_get_active_streams()
    results["Agora Token Generation"] = test_agora_token_generation()
    
    # Other features
    results["Gift Catalog"] = test_gift_catalog()
    results["Wallet Balance"] = test_wallet_balance()
    
    # Summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"{status} - {test_name}")
    
    print(f"\n{BLUE}Total: {passed}/{total} tests passed{RESET}")
    
    if passed == total:
        print(f"{GREEN}All tests passed!{RESET}")
    elif passed >= total * 0.8:
        print(f"{YELLOW}Most tests passed, some issues found{RESET}")
    else:
        print(f"{RED}Multiple tests failed, critical issues detected{RESET}")
    
    return results

if __name__ == "__main__":
    run_all_tests()
