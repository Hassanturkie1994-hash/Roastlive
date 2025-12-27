"""
MongoDB Database Schema for RoastLive Application
==================================================

This file defines all collections and their schemas for the application.
Run this file to initialize indexes and validate the database structure.
"""

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import logging
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Database Schema Definitions
COLLECTIONS_SCHEMA = {
    # ========== USER MANAGEMENT ==========
    "users": {
        "description": "Core user profiles",
        "indexes": [
            {"keys": [("user_id", 1)], "unique": True},
            {"keys": [("email", 1)], "unique": True},
        ],
        "sample_document": {
            "user_id": "user_abc123",
            "email": "user@example.com",
            "name": "John Doe",
            "picture": "https://example.com/avatar.jpg",
            "created_at": datetime.now(timezone.utc),
            # 2FA fields
            "otp_secret": None,
            "backup_codes": [],
            "backup_codes_used": [],
            "is_2fa_enabled": False,
            # Gamification fields
            "total_xp": 0,
            "battle_wins": 0,
            "battle_total": 0,
            "loyalty_points": 0,
            # Analytics tracking
            "streams_watched": 0,
            "messages_sent": 0,
            "gifts_value": 0,
            "reactions_sent": 0,
            "stream_hours": 0,
            "avg_viewers": 0,
            "roast_meter_peak": 0,
            "updated_at": datetime.now(timezone.utc)
        }
    },
    
    "user_sessions": {
        "description": "Active user sessions with JWT tokens",
        "indexes": [
            {"keys": [("user_id", 1)]},
            {"keys": [("session_token", 1)], "unique": True},
            {"keys": [("expires_at", 1)], "expireAfterSeconds": 0}
        ],
        "sample_document": {
            "user_id": "user_abc123",
            "session_token": "token_xyz",
            "expires_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
    },
    
    "temp_2fa_setup": {
        "description": "Temporary 2FA setup data (expires in 15 minutes)",
        "indexes": [
            {"keys": [("user_id", 1)], "unique": True},
            {"keys": [("expires_at", 1)], "expireAfterSeconds": 0}
        ],
        "sample_document": {
            "user_id": "user_abc123",
            "secret": "BASE32SECRET",
            "backup_codes": ["CODE1", "CODE2"],
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc)
        }
    },
    
    # ========== MATCHMAKING & BATTLES ==========
    "matchmaking_queue": {
        "description": "Users waiting for battle matchmaking",
        "indexes": [
            {"keys": [("user_id", 1)]},
            {"keys": [("team_size", 1), ("region", 1), ("status", 1)]},
            {"keys": [("joined_at", 1)]},
            {"keys": [("expires_at", 1)], "expireAfterSeconds": 0}
        ],
        "sample_document": {
            "user_id": "user_abc123",
            "team_size": "3v3",
            "region": "global",
            "is_leader": True,
            "team_members": ["user_def456"],
            "status": "waiting",  # waiting, matched, expired
            "match_id": None,
            "joined_at": datetime.now(timezone.utc),
            "matched_at": None,
            "expires_at": datetime.now(timezone.utc)
        }
    },
    
    "battle_matches": {
        "description": "Battle match records",
        "indexes": [
            {"keys": [("match_id", 1)], "unique": True},
            {"keys": [("status", 1)]},
            {"keys": [("created_at", -1)]}
        ],
        "sample_document": {
            "match_id": "battle_abc123",
            "team_size": "3v3",
            "status": "forming",  # forming, in_progress, completed
            "team_a_score": 0,
            "team_b_score": 0,
            "duration_seconds": 180,
            "region": "global",
            "winner": None,  # team_a, team_b, tie
            "created_at": datetime.now(timezone.utc),
            "started_at": None,
            "ended_at": None
        }
    },
    
    "battle_participants": {
        "description": "Participants in battle matches",
        "indexes": [
            {"keys": [("match_id", 1)]},
            {"keys": [("user_id", 1)]},
            {"keys": [("match_id", 1), ("user_id", 1)]}
        ],
        "sample_document": {
            "match_id": "battle_abc123",
            "user_id": "user_abc123",
            "team": "team_a",  # team_a, team_b
            "status": "pending",  # pending, ready, active, completed
            "ready": False,
            "joined_at": datetime.now(timezone.utc)
        }
    },
    
    # ========== REACTIONS & ENGAGEMENT ==========
    "reactions": {
        "description": "User reactions to streams",
        "indexes": [
            {"keys": [("stream_id", 1)]},
            {"keys": [("user_id", 1)]},
            {"keys": [("created_at", -1)]}
        ],
        "sample_document": {
            "stream_id": "stream_abc123",
            "user_id": "user_abc123",
            "reaction_type": "applause",  # applause, boo, fire, laugh, love, shocked
            "intensity": 1,  # 1-5
            "created_at": datetime.now(timezone.utc)
        }
    },
    
    "stream_stats": {
        "description": "Aggregated reaction statistics per stream",
        "indexes": [
            {"keys": [("stream_id", 1)], "unique": True}
        ],
        "sample_document": {
            "stream_id": "stream_abc123",
            "applause_count": 0,
            "boo_count": 0,
            "fire_count": 0,
            "laugh_count": 0,
            "love_count": 0,
            "shocked_count": 0,
            "total_reactions": 0,
            "roast_meter": 0  # -100 to +100
        }
    },
    
    "challenge_goals": {
        "description": "Crowdfunded challenge goals",
        "indexes": [
            {"keys": [("stream_id", 1)]},
            {"keys": [("creator_id", 1)]}
        ],
        "sample_document": {
            "stream_id": "stream_abc123",
            "creator_id": "user_abc123",
            "goal_type": "gift_total",  # gift_total, reaction_count, viewer_count
            "target_amount": 1000,
            "current_amount": 0,
            "reward_description": "I'll do a backflip!",
            "is_completed": False,
            "created_at": datetime.now(timezone.utc)
        }
    },
    
    "milestones": {
        "description": "Triggered milestone events",
        "indexes": [
            {"keys": [("stream_id", 1)]},
            {"keys": [("triggered_at", -1)]}
        ],
        "sample_document": {
            "stream_id": "stream_abc123",
            "milestone_type": "1000_viewers",
            "triggered_at": datetime.now(timezone.utc)
        }
    },
    
    # ========== VIRTUAL CURRENCY & GIFTS ==========
    "wallets": {
        "description": "User virtual currency balances",
        "indexes": [
            {"keys": [("user_id", 1)], "unique": True}
        ],
        "sample_document": {
            "user_id": "user_abc123",
            "balance": 0,
            "total_earned": 0,
            "total_spent": 0,
            "last_purchase": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    },
    
    "gifts": {
        "description": "Gift transactions",
        "indexes": [
            {"keys": [("stream_id", 1)]},
            {"keys": [("sender_id", 1)]},
            {"keys": [("receiver_id", 1)]},
            {"keys": [("created_at", -1)]}
        ],
        "sample_document": {
            "stream_id": "stream_abc123",
            "sender_id": "user_abc123",
            "receiver_id": "user_def456",
            "gift_id": "rose",
            "gift_name": "Rose",
            "gift_price": 1,  # In coins
            "created_at": datetime.now(timezone.utc)
        }
    },
    
    # ========== TOURNAMENTS ==========
    "tournaments": {
        "description": "Tournament metadata",
        "indexes": [
            {"keys": [("tournament_id", 1)], "unique": True},
            {"keys": [("status", 1)]},
            {"keys": [("created_at", -1)]}
        ],
        "sample_document": {
            "tournament_id": "tournament_abc123",
            "name": "Weekly Roast Championship",
            "format": "single_elimination",  # single_elimination, double_elimination, round_robin
            "max_participants": 16,
            "current_participants": 0,
            "prize_pool": 10000,  # In coins
            "start_time": "2025-06-15T18:00:00Z",
            "status": "registration",  # registration, in_progress, completed
            "created_by": "user_abc123",
            "created_at": datetime.now(timezone.utc)
        }
    },
    
    "tournament_participants": {
        "description": "Tournament registrations",
        "indexes": [
            {"keys": [("tournament_id", 1)]},
            {"keys": [("user_id", 1)]},
            {"keys": [("tournament_id", 1), ("user_id", 1)], "unique": True}
        ],
        "sample_document": {
            "tournament_id": "tournament_abc123",
            "user_id": "user_abc123",
            "status": "registered",  # registered, active, eliminated, winner
            "seed": 1,
            "joined_at": datetime.now(timezone.utc)
        }
    },
    
    # ========== MODERATION & SAFETY ==========
    "moderation_settings": {
        "description": "Creator moderation preferences",
        "indexes": [
            {"keys": [("creator_id", 1)], "unique": True}
        ],
        "sample_document": {
            "creator_id": "user_abc123",
            "strictness_level": "moderate",  # strict, moderate, relaxed
            "allowed_topics": ["politics", "sports"],
            "blocked_words": ["badword1", "badword2"],
            "auto_timeout_enabled": True,
            "updated_at": datetime.now(timezone.utc)
        }
    },
    
    "safeword_triggers": {
        "description": "Safe-word activation events",
        "indexes": [
            {"keys": [("stream_id", 1)]},
            {"keys": [("triggered_at", -1)]}
        ],
        "sample_document": {
            "stream_id": "stream_abc123",
            "triggered_by": "user_abc123",
            "reason": "Getting too heated",
            "triggered_at": datetime.now(timezone.utc)
        }
    },
    
    "moderation_actions": {
        "description": "AI moderation decision logs",
        "indexes": [
            {"keys": [("stream_id", 1)]},
            {"keys": [("user_id", 1)]},
            {"keys": [("action", 1)]},
            {"keys": [("created_at", -1)]}
        ],
        "sample_document": {
            "stream_id": "stream_abc123",
            "user_id": "user_abc123",
            "content": "Example message",
            "action": "allow",  # allow, warn, timeout, ban
            "ai_score": 0.2,
            "reason": "Friendly banter",
            "strictness_level": "moderate",
            "created_at": datetime.now(timezone.utc)
        }
    },
    
    # ========== ANALYTICS ==========
    "streams": {
        "description": "Stream metadata (extended from existing)",
        "indexes": [
            {"keys": [("id", 1)], "unique": True},
            {"keys": [("host_id", 1)]},
            {"keys": [("status", 1)]},
            {"keys": [("created_at", -1)]}
        ],
        "sample_document": {
            "id": "stream_abc123",
            "host_id": "user_abc123",
            "title": "Epic Roast Battle",
            "status": "live",  # live, ended
            "viewer_count": 0,
            "peak_viewers": 0,
            "avg_viewers": 0,
            "created_at": datetime.now(timezone.utc)
        }
    },
    
    "stream_messages": {
        "description": "Chat messages in streams",
        "indexes": [
            {"keys": [("stream_id", 1)]},
            {"keys": [("user_id", 1)]},
            {"keys": [("created_at", -1)]}
        ],
        "sample_document": {
            "stream_id": "stream_abc123",
            "user_id": "user_abc123",
            "content": "Great stream!",
            "created_at": datetime.now(timezone.utc)
        }
    },
    
    # ========== PAYOUTS & PAYMENTS ==========
    "creators": {
        "description": "Creator Stripe Connect accounts",
        "indexes": [
            {"keys": [("platform_user_id", 1)], "unique": True},
            {"keys": [("stripe_connect_account_id", 1)], "unique": True}
        ],
        "sample_document": {
            "platform_user_id": "user_abc123",
            "email": "creator@example.com",
            "stripe_connect_account_id": "acct_xyz",
            "onboarding_completed": False,
            "charges_enabled": False,
            "payouts_enabled": False,
            "country": "US",
            "business_type": "individual",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    },
    
    "payments": {
        "description": "Payment transactions",
        "indexes": [
            {"keys": [("creator_id", 1)]},
            {"keys": [("stripe_payment_intent_id", 1)]},
            {"keys": [("status", 1)]},
            {"keys": [("created_at", -1)]}
        ],
        "sample_document": {
            "creator_id": "user_abc123",
            "amount_cents": 1000,
            "currency": "usd",
            "stripe_payment_intent_id": "pi_xyz",
            "stripe_charge_id": "ch_xyz",
            "status": "succeeded",
            "customer_email": "customer@example.com",
            "platform_fee_cents": 150,
            "creator_amount_cents": 850,
            "metadata": {},
            "created_at": datetime.now(timezone.utc),
            "mock_mode": False
        }
    },
    
    # ========== GAMIFICATION ==========
    "user_achievements": {
        "description": "User achievement progress",
        "indexes": [
            {"keys": [("user_id", 1)]},
            {"keys": [("achievement_id", 1)]},
            {"keys": [("user_id", 1), ("achievement_id", 1)], "unique": True}
        ],
        "sample_document": {
            "user_id": "user_abc123",
            "achievement_id": "roast_regular",
            "unlocked": False,
            "unlocked_at": None
        }
    },
    
    "loyalty_transactions": {
        "description": "Loyalty point earning history",
        "indexes": [
            {"keys": [("user_id", 1)]},
            {"keys": [("created_at", -1)]}
        ],
        "sample_document": {
            "user_id": "user_abc123",
            "action": "watch_stream",  # watch_stream, send_message, daily_login, send_reaction
            "points": 10,
            "created_at": datetime.now(timezone.utc)
        }
    },
    
    "loyalty_redemptions": {
        "description": "Loyalty reward redemptions",
        "indexes": [
            {"keys": [("user_id", 1)]},
            {"keys": [("redeemed_at", -1)]}
        ],
        "sample_document": {
            "user_id": "user_abc123",
            "reward_id": "highlight_message",
            "reward_name": "Highlight Next Message",
            "cost": 500,
            "redeemed_at": datetime.now(timezone.utc)
        }
    }
}


async def initialize_database():
    """
    Initialize MongoDB database with all required collections and indexes.
    Safe to run multiple times - will not drop existing data.
    """
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client.get_database("roastlive_db")
        
        logger.info("🗄️  Initializing database schema...")
        
        for collection_name, schema_info in COLLECTIONS_SCHEMA.items():
            logger.info(f"   Creating collection: {collection_name}")
            
            # Create collection if it doesn't exist
            if collection_name not in await db.list_collection_names():
                await db.create_collection(collection_name)
                logger.info(f"   ✓ Created {collection_name}")
            else:
                logger.info(f"   ✓ Collection {collection_name} already exists")
            
            # Create indexes
            collection = db[collection_name]
            for index_spec in schema_info.get("indexes", []):
                try:
                    keys = index_spec["keys"]
                    options = {k: v for k, v in index_spec.items() if k != "keys"}
                    await collection.create_index(keys, **options)
                    logger.info(f"      ✓ Index created on {keys}")
                except Exception as e:
                    # Index might already exist
                    logger.debug(f"      Index already exists or error: {e}")
        
        logger.info("✅ Database schema initialization complete!")
        logger.info(f"   Total collections: {len(COLLECTIONS_SCHEMA)}")
        
        # Print summary
        print("\n" + "="*60)
        print("DATABASE SCHEMA SUMMARY")
        print("="*60)
        for collection_name, schema_info in COLLECTIONS_SCHEMA.items():
            print(f"📁 {collection_name}")
            print(f"   {schema_info['description']}")
            print(f"   Indexes: {len(schema_info.get('indexes', []))}")
        print("="*60 + "\n")
        
        client.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(initialize_database())
