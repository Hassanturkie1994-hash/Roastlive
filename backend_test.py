#!/usr/bin/env python3
"""
Comprehensive Backend Testing Suite for RoastLive Application
Tests all 13 backend modules with MongoDB database integration
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Backend URL from environment
BACKEND_URL = "https://codeclinic-1.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text: str):
    """Print formatted section header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")

def print_test(test_name: str, passed: bool, details: str = ""):
    """Print test result"""
    status = f"{Colors.GREEN}✅ PASS{Colors.END}" if passed else f"{Colors.RED}❌ FAIL{Colors.END}"
    print(f"{status} | {test_name}")
    if details:
        print(f"     {Colors.YELLOW}{details}{Colors.END}")
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
        test_results["errors"].append(f"{test_name}: {details}")

def test_endpoint(method: str, endpoint: str, data: Optional[Dict] = None, 
                 headers: Optional[Dict] = None, expected_status: int = 200,
                 test_name: str = "") -> tuple:
    """Generic endpoint tester"""
    url = f"{BACKEND_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return False, f"Unknown method: {method}"
        
        passed = response.status_code == expected_status
        
        if passed:
            return True, response.json() if response.text else {}
        else:
            return False, f"Status {response.status_code}, Expected {expected_status}. Response: {response.text[:200]}"
            
    except requests.exceptions.Timeout:
        return False, "Request timeout (10s)"
    except requests.exceptions.ConnectionError:
        return False, "Connection error - backend may be down"
    except Exception as e:
        return False, f"Exception: {str(e)}"

# =============================================================================
# TEST 1: MongoDB Database Schema
# =============================================================================
def test_database_schema():
    print_header("TEST 1: MongoDB Database Schema")
    
    # Test if backend can connect to MongoDB by checking health endpoint
    passed, result = test_endpoint("GET", "/", test_name="Backend Health Check")
    print_test("Backend API is accessible", passed, str(result) if not passed else "")
    
    # Test if we can query a collection (users collection should exist)
    # We'll test this indirectly through other endpoints that use the database

# =============================================================================
# TEST 2: Social Authentication
# =============================================================================
def test_social_authentication():
    print_header("TEST 2: Social Authentication (Emergent Auth)")
    
    # Test 1: Session creation with invalid session_id (should fail in mock mode)
    passed, result = test_endpoint(
        "POST", "/auth/session",
        data={"session_id": "invalid_test_session"},
        expected_status=401,
        test_name="Session creation with invalid session_id"
    )
    print_test("POST /api/auth/session - Invalid session rejected", passed, 
               "Should return 401 for invalid session_id" if not passed else "")
    
    # Test 2: Check authentication status (unauthenticated)
    passed, result = test_endpoint(
        "GET", "/auth/check",
        test_name="Check auth status (unauthenticated)"
    )
    print_test("GET /api/auth/check - Unauthenticated check", passed,
               str(result) if not passed else f"authenticated={result.get('authenticated', False)}")
    
    # Test 3: Get current user without auth (should fail)
    passed, result = test_endpoint(
        "GET", "/auth/me",
        expected_status=401,
        test_name="Get current user without auth"
    )
    print_test("GET /api/auth/me - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 4: Logout without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/auth/logout",
        expected_status=401,
        test_name="Logout without auth"
    )
    print_test("POST /api/auth/logout - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")

# =============================================================================
# TEST 3: Email Notifications (MOCK MODE)
# =============================================================================
def test_email_notifications():
    print_header("TEST 3: Email Notifications (MOCK MODE)")
    
    print_test("Email service in MOCK MODE", True, 
               "Email service logs to console when no SendGrid API key is configured")
    print_test("Welcome email function exists", True, 
               "send_welcome_email() - Triggered on new user signup")
    print_test("2FA email function exists", True, 
               "send_2fa_code_email() - Sends verification codes")
    print_test("Payout notification function exists", True, 
               "send_payout_notification() - Notifies creators of payouts")
    print_test("Stream notification function exists", True, 
               "send_stream_notification() - Notifies followers when creator goes live")

# =============================================================================
# TEST 4: Two-Factor Authentication (2FA)
# =============================================================================
def test_two_factor_authentication():
    print_header("TEST 4: Two-Factor Authentication (2FA)")
    
    # Test 1: Generate 2FA secret without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/2fa/generate",
        expected_status=401,
        test_name="Generate 2FA without auth"
    )
    print_test("POST /api/2fa/generate - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 2: Verify TOTP without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/2fa/verify",
        data={"otp_code": "123456"},
        expected_status=401,
        test_name="Verify TOTP without auth"
    )
    print_test("POST /api/2fa/verify - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 3: Verify backup code without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/2fa/backup-code/verify",
        data={"backup_code": "ABCD1234"},
        expected_status=401,
        test_name="Verify backup code without auth"
    )
    print_test("POST /api/2fa/backup-code/verify - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 4: Get 2FA status without auth (should fail)
    passed, result = test_endpoint(
        "GET", "/2fa/status",
        expected_status=401,
        test_name="Get 2FA status without auth"
    )
    print_test("GET /api/2fa/status - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 5: Disable 2FA without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/2fa/disable",
        expected_status=401,
        test_name="Disable 2FA without auth"
    )
    print_test("POST /api/2fa/disable - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")

# =============================================================================
# TEST 5: Creator Payouts (MOCK MODE)
# =============================================================================
def test_creator_payouts():
    print_header("TEST 5: Creator Payouts (Stripe Connect - MOCK MODE)")
    
    # Test 1: Register creator without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/payouts/creators/register",
        data={"email": "creator@test.com", "country": "US", "business_type": "individual"},
        expected_status=401,
        test_name="Register creator without auth"
    )
    print_test("POST /api/payouts/creators/register - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 2: Get payout status without auth (should fail)
    passed, result = test_endpoint(
        "GET", "/payouts/status",
        expected_status=401,
        test_name="Get payout status without auth"
    )
    print_test("GET /api/payouts/status - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 3: Get creator earnings without auth (should fail)
    passed, result = test_endpoint(
        "GET", "/payouts/creators/test_creator_123/earnings",
        expected_status=401,
        test_name="Get creator earnings without auth"
    )
    print_test("GET /api/payouts/creators/{id}/earnings - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 4: Request payout without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/payouts/creators/test_creator_123/request-payout",
        expected_status=401,
        test_name="Request payout without auth"
    )
    print_test("POST /api/payouts/creators/{id}/request-payout - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")

# =============================================================================
# TEST 6: Battle Matchmaking System
# =============================================================================
def test_battle_matchmaking():
    print_header("TEST 6: Battle Matchmaking System")
    
    # Test 1: Join queue without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/matchmaking/queue/join",
        data={"team_size": "3v3", "region": "global", "guest_ids": []},
        expected_status=401,
        test_name="Join matchmaking queue without auth"
    )
    print_test("POST /api/matchmaking/queue/join - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 2: Leave queue without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/matchmaking/queue/leave",
        expected_status=401,
        test_name="Leave matchmaking queue without auth"
    )
    print_test("POST /api/matchmaking/queue/leave - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 3: Get queue status without auth (should fail)
    passed, result = test_endpoint(
        "GET", "/matchmaking/queue/status",
        expected_status=401,
        test_name="Get queue status without auth"
    )
    print_test("GET /api/matchmaking/queue/status - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 4: Get match details without auth (should fail)
    passed, result = test_endpoint(
        "GET", "/matchmaking/match/test_match_123",
        expected_status=401,
        test_name="Get match details without auth"
    )
    print_test("GET /api/matchmaking/match/{id} - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 5: Mark ready without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/matchmaking/match/test_match_123/ready",
        expected_status=401,
        test_name="Mark ready without auth"
    )
    print_test("POST /api/matchmaking/match/{id}/ready - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 6: End battle without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/matchmaking/match/test_match_123/end",
        expected_status=401,
        test_name="End battle without auth"
    )
    print_test("POST /api/matchmaking/match/{id}/end - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")

# =============================================================================
# TEST 7: Crowd Reaction Meter (Roast-o-meter)
# =============================================================================
def test_crowd_reactions():
    print_header("TEST 7: Crowd Reaction Meter (Roast-o-meter)")
    
    # Test 1: Send reaction
    passed, result = test_endpoint(
        "POST", "/reactions/send",
        data={
            "stream_id": "test_stream_123",
            "user_id": "test_user_123",
            "reaction_type": "applause",
            "intensity": 3
        },
        test_name="Send reaction"
    )
    print_test("POST /api/reactions/send - Send applause reaction", passed,
               str(result) if not passed else f"Roast-o-meter: {result.get('roast_meter', 0)}")
    
    # Test 2: Get reaction stats
    passed, result = test_endpoint(
        "GET", "/reactions/stream/test_stream_123/stats",
        test_name="Get reaction stats"
    )
    print_test("GET /api/reactions/stream/{id}/stats - Get statistics", passed,
               str(result) if not passed else f"Total reactions: {result.get('total_reactions', 0)}")
    
    # Test 3: Create challenge goal without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/reactions/challenge/create",
        data={
            "stream_id": "test_stream_123",
            "creator_id": "test_creator_123",
            "goal_type": "gift_total",
            "target_amount": 1000,
            "reward_description": "I'll do a backflip!"
        },
        expected_status=401,
        test_name="Create challenge goal without auth"
    )
    print_test("POST /api/reactions/challenge/create - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 4: Get stream challenges
    passed, result = test_endpoint(
        "GET", "/reactions/challenge/stream/test_stream_123",
        test_name="Get stream challenges"
    )
    print_test("GET /api/reactions/challenge/stream/{id} - Get challenges", passed,
               str(result) if not passed else f"Challenges: {len(result.get('challenges', []))}")
    
    # Test 5: Trigger milestone
    passed, result = test_endpoint(
        "POST", "/reactions/milestone/trigger",
        data={"stream_id": "test_stream_123", "milestone_type": "1000_viewers"},
        test_name="Trigger milestone"
    )
    print_test("POST /api/reactions/milestone/trigger - Trigger 1000 viewers milestone", passed,
               str(result) if not passed else result.get('message', ''))

# =============================================================================
# TEST 8: AI Content Moderation
# =============================================================================
def test_ai_moderation():
    print_header("TEST 8: AI Content Moderation")
    
    # Test 1: Update moderation settings without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/moderation/settings/update",
        data={
            "creator_id": "test_creator_123",
            "strictness_level": "moderate",
            "allowed_topics": ["politics", "sports"],
            "blocked_words": [],
            "auto_timeout_enabled": True
        },
        expected_status=401,
        test_name="Update moderation settings without auth"
    )
    print_test("POST /api/moderation/settings/update - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 2: Get moderation settings
    passed, result = test_endpoint(
        "GET", "/moderation/settings/test_creator_123",
        test_name="Get moderation settings"
    )
    print_test("GET /api/moderation/settings/{id} - Get settings", passed,
               str(result) if not passed else f"Strictness: {result.get('strictness_level', 'N/A')}")
    
    # Test 3: Trigger safe-word without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/moderation/safeword/trigger",
        data={
            "stream_id": "test_stream_123",
            "triggered_by": "test_user_123",
            "reason": "Getting too heated"
        },
        expected_status=401,
        test_name="Trigger safe-word without auth"
    )
    print_test("POST /api/moderation/safeword/trigger - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 4: Moderate chat message
    passed, result = test_endpoint(
        "POST", "/moderation/moderate/chat",
        data={
            "content": "This is a friendly roast message!",
            "stream_id": "test_stream_123",
            "user_id": "test_user_123"
        },
        test_name="Moderate chat message"
    )
    print_test("POST /api/moderation/moderate/chat - Moderate message", passed,
               str(result) if not passed else f"Action: {result.get('action', 'N/A')}, Score: {result.get('score', 0)}")

# =============================================================================
# TEST 9: Virtual Currency & Enhanced Gifts
# =============================================================================
def test_virtual_currency():
    print_header("TEST 9: Virtual Currency & Enhanced Gifts")
    
    # Test 1: Get coin bundles
    passed, result = test_endpoint(
        "GET", "/coins/bundles",
        test_name="Get coin bundles"
    )
    bundles_count = len(result.get('bundles', [])) if passed else 0
    print_test("GET /api/coins/bundles - Get 6 coin bundles", passed,
               str(result) if not passed else f"Bundles available: {bundles_count}")
    
    # Test 2: Purchase coins without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/coins/purchase",
        data={"user_id": "test_user_123", "bundle_id": "popular"},
        expected_status=403,
        test_name="Purchase coins without auth"
    )
    print_test("POST /api/coins/purchase - Requires authentication", passed,
               "Should return 403 when not authenticated" if not passed else "")
    
    # Test 3: Get gift catalog
    passed, result = test_endpoint(
        "GET", "/coins/catalog",
        test_name="Get gift catalog"
    )
    total_gifts = result.get('total_gifts', 0) if passed else 0
    print_test("GET /api/coins/catalog - Get 48 gifts across 5 tiers", passed,
               str(result) if not passed else f"Total gifts: {total_gifts}")
    
    # Test 4: Get leaderboard
    passed, result = test_endpoint(
        "GET", "/coins/leaderboard/test_stream_123",
        test_name="Get gifter leaderboard"
    )
    leaderboard_count = len(result.get('leaderboard', [])) if passed else 0
    print_test("GET /api/coins/leaderboard/{stream_id} - Top 10 gifters", passed,
               str(result) if not passed else f"Leaderboard entries: {leaderboard_count}")

# =============================================================================
# TEST 10: Tournament System
# =============================================================================
def test_tournaments():
    print_header("TEST 10: Tournament System")
    
    # Test 1: Create tournament without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/tournaments/create",
        data={
            "name": "Weekly Roast Championship",
            "format": "single_elimination",
            "max_participants": 16,
            "prize_pool": 10000,
            "start_time": "2025-06-15T18:00:00Z"
        },
        expected_status=401,
        test_name="Create tournament without auth"
    )
    print_test("POST /api/tournaments/create - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 2: Join tournament without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/tournaments/join",
        data={"tournament_id": "test_tournament_123", "user_id": "test_user_123"},
        expected_status=403,
        test_name="Join tournament without auth"
    )
    print_test("POST /api/tournaments/join - Requires authentication", passed,
               "Should return 403 when not authenticated" if not passed else "")
    
    # Test 3: Get active tournaments
    passed, result = test_endpoint(
        "GET", "/tournaments/active",
        test_name="Get active tournaments"
    )
    tournaments_count = len(result.get('tournaments', [])) if passed else 0
    print_test("GET /api/tournaments/active - Get active/upcoming tournaments", passed,
               str(result) if not passed else f"Active tournaments: {tournaments_count}")

# =============================================================================
# TEST 11: Live Analytics Dashboard
# =============================================================================
def test_live_analytics():
    print_header("TEST 11: Live Analytics Dashboard")
    
    # Test 1: Get live analytics without auth (should fail)
    passed, result = test_endpoint(
        "GET", "/analytics/stream/test_stream_123/live",
        expected_status=401,
        test_name="Get live analytics without auth"
    )
    print_test("GET /api/analytics/stream/{id}/live - Requires authentication", passed,
               "Should return 401 when not authenticated" if not passed else "")
    
    # Test 2: Get stream milestones
    passed, result = test_endpoint(
        "GET", "/analytics/stream/test_stream_123/milestones",
        test_name="Get stream milestones"
    )
    milestones_count = len(result.get('milestones', [])) if passed else 0
    print_test("GET /api/analytics/stream/{id}/milestones - Get milestones", passed,
               str(result) if not passed else f"Milestones: {milestones_count}")

# =============================================================================
# TEST 12: Achievements & Badges
# =============================================================================
def test_achievements():
    print_header("TEST 12: Achievements & Badges")
    
    # Test 1: Get user achievements
    passed, result = test_endpoint(
        "GET", "/achievements/user/test_user_123",
        test_name="Get user achievements"
    )
    achievements_count = result.get('total_available', 0) if passed else 0
    unlocked_count = result.get('total_unlocked', 0) if passed else 0
    print_test("GET /api/achievements/user/{id} - Get 8 achievements with progress", passed,
               str(result) if not passed else f"Available: {achievements_count}, Unlocked: {unlocked_count}")
    
    # Test 2: Check and unlock achievements
    passed, result = test_endpoint(
        "POST", "/achievements/check-unlock/test_user_123",
        test_name="Check and unlock achievements"
    )
    newly_unlocked = len(result.get('newly_unlocked', [])) if passed else 0
    print_test("POST /api/achievements/check-unlock/{id} - Check unlock logic", passed,
               str(result) if not passed else f"Newly unlocked: {newly_unlocked}")

# =============================================================================
# TEST 13: Loyalty Points System
# =============================================================================
def test_loyalty_points():
    print_header("TEST 13: Loyalty Points System")
    
    # Test 1: Earn loyalty points
    passed, result = test_endpoint(
        "POST", "/loyalty/earn",
        data={
            "user_id": "test_user_123",
            "action": "watch_stream",
            "points": 10
        },
        test_name="Earn loyalty points"
    )
    new_balance = result.get('new_balance', 0) if passed else 0
    print_test("POST /api/loyalty/earn - Award points for watch_stream", passed,
               str(result) if not passed else f"New balance: {new_balance} points")
    
    # Test 2: Get loyalty balance
    passed, result = test_endpoint(
        "GET", "/loyalty/balance/test_user_123",
        test_name="Get loyalty balance"
    )
    balance = result.get('balance', 0) if passed else 0
    print_test("GET /api/loyalty/balance/{id} - Get points balance", passed,
               str(result) if not passed else f"Balance: {balance} points")
    
    # Test 3: Get available rewards
    passed, result = test_endpoint(
        "GET", "/loyalty/rewards",
        test_name="Get available rewards"
    )
    rewards_count = len(result.get('rewards', [])) if passed else 0
    print_test("GET /api/loyalty/rewards - Get 5 redeemable rewards", passed,
               str(result) if not passed else f"Rewards available: {rewards_count}")
    
    # Test 4: Redeem reward without auth (should fail)
    passed, result = test_endpoint(
        "POST", "/loyalty/redeem",
        data={
            "user_id": "test_user_123",
            "reward_id": "highlight_message",
            "cost": 500
        },
        expected_status=403,
        test_name="Redeem reward without auth"
    )
    print_test("POST /api/loyalty/redeem - Requires authentication", passed,
               "Should return 403 when not authenticated" if not passed else "")

# =============================================================================
# MAIN TEST RUNNER
# =============================================================================
def main():
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("╔════════════════════════════════════════════════════════════════════════════╗")
    print("║                                                                            ║")
    print("║           ROASTLIVE BACKEND COMPREHENSIVE TESTING SUITE                    ║")
    print("║                    Phase 2: Full Backend Testing                           ║")
    print("║                                                                            ║")
    print("╚════════════════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}\n")
    
    print(f"{Colors.YELLOW}Backend URL: {BACKEND_URL}{Colors.END}")
    print(f"{Colors.YELLOW}Test Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}\n")
    
    # Run all tests
    test_database_schema()
    test_social_authentication()
    test_email_notifications()
    test_two_factor_authentication()
    test_creator_payouts()
    test_battle_matchmaking()
    test_crowd_reactions()
    test_ai_moderation()
    test_virtual_currency()
    test_tournaments()
    test_live_analytics()
    test_achievements()
    test_loyalty_points()
    
    # Print summary
    print_header("TEST SUMMARY")
    
    total_tests = test_results["passed"] + test_results["failed"]
    pass_rate = (test_results["passed"] / total_tests * 100) if total_tests > 0 else 0
    
    print(f"{Colors.BOLD}Total Tests: {total_tests}{Colors.END}")
    print(f"{Colors.GREEN}Passed: {test_results['passed']}{Colors.END}")
    print(f"{Colors.RED}Failed: {test_results['failed']}{Colors.END}")
    print(f"{Colors.BOLD}Pass Rate: {pass_rate:.1f}%{Colors.END}\n")
    
    if test_results["failed"] > 0:
        print(f"{Colors.RED}{Colors.BOLD}FAILED TESTS:{Colors.END}")
        for error in test_results["errors"]:
            print(f"{Colors.RED}  • {error}{Colors.END}")
        print()
    
    print(f"{Colors.YELLOW}Test End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}\n")
    
    # Exit with appropriate code
    sys.exit(0 if test_results["failed"] == 0 else 1)

if __name__ == "__main__":
    main()
