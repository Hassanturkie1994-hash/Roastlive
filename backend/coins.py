from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List, Optional, Literal
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/coins", tags=["virtual_currency"])

# Coin Bundle Offers
COIN_BUNDLES = {
    "starter": {"id": "starter", "name": "Starter Pack", "coins": 100, "bonus_coins": 0, "price_usd": 0.99, "icon": "💎", "savings": 0},
    "basic": {"id": "basic", "name": "Basic Bundle", "coins": 500, "bonus_coins": 50, "price_usd": 4.99, "icon": "💎💎", "savings": 10},
    "popular": {"id": "popular", "name": "Popular Pack", "coins": 1000, "bonus_coins": 150, "price_usd": 9.99, "icon": "💎💎💎", "savings": 15, "badge": "BEST VALUE"},
    "premium": {"id": "premium", "name": "Premium Bundle", "coins": 2500, "bonus_coins": 500, "price_usd": 24.99, "icon": "💎💎💎💎", "savings": 20},
    "whale": {"id": "whale", "name": "Mega Pack", "coins": 5000, "bonus_coins": 1250, "price_usd": 49.99, "icon": "💎💎💎💎💎", "savings": 25, "badge": "MOST POPULAR"},
    "nuclear": {"id": "nuclear", "name": "Nuclear Bundle", "coins": 10000, "bonus_coins": 3000, "price_usd": 99.99, "icon": "🔥💎🔥", "savings": 30, "badge": "BEST DEAL"}
}

# Enhanced Gift Catalog
ENHANCED_GIFTS = {
    "rose": {"id": "rose", "name": "Rose", "tier": "low", "price": 1, "icon": "🌹", "format": "lottie"},
    "heart": {"id": "heart", "name": "Heart", "tier": "low", "price": 2, "icon": "❤️", "format": "lottie"},
    "fire": {"id": "fire", "name": "Fire", "tier": "low", "price": 5, "icon": "🔥", "format": "lottie"},
    "crown": {"id": "crown", "name": "Crown", "tier": "mid", "price": 20, "icon": "👑", "format": "lottie"},
    "diamond": {"id": "diamond", "name": "Diamond", "tier": "mid", "price": 30, "icon": "💎", "format": "lottie"},
    "rocket": {"id": "rocket", "name": "Rocket", "tier": "mid", "price": 50, "icon": "🚀", "format": "lottie"},
    "fireworks": {"id": "fireworks", "name": "Fireworks", "tier": "high", "price": 100, "icon": "🎆", "format": "lottie"},
    "lightning": {"id": "lightning", "name": "Lightning", "tier": "high", "price": 200, "icon": "⚡", "format": "lottie"},
    "dragon": {"id": "dragon", "name": "Dragon Fury", "tier": "ultra", "price": 500, "icon": "🐉", "format": "mp4", "sound": True},
    "meteor": {"id": "meteor", "name": "Meteor Shower", "tier": "ultra", "price": 1000, "icon": "☄️", "format": "mp4", "sound": True},
    "supernova": {"id": "supernova", "name": "Supernova", "tier": "nuclear", "price": 5000, "icon": "💥", "format": "mp4", "sound": True},
    "roast_master": {"id": "roast_master", "name": "Roast Master", "tier": "nuclear", "price": 10000, "icon": "👑🔥", "format": "mp4", "sound": True}
}

# Models
class PurchaseCoins(BaseModel):
    user_id: str
    bundle_id: str

# Routes
@router.get("/bundles")
async def get_coin_bundles():
    return {"bundles": list(COIN_BUNDLES.values())}

@router.post("/purchase")
async def purchase_coins(purchase: PurchaseCoins, req: Request):
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user or current_user.user_id != purchase.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        bundle = COIN_BUNDLES.get(purchase.bundle_id)
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle not found")
        
        total_coins = bundle["coins"] + bundle["bonus_coins"]
        
        logger.info(f"💳 MOCK PURCHASE: {bundle['name']} ({total_coins} coins)")
        
        await db.wallets.update_one(
            {"user_id": purchase.user_id},
            {"$inc": {"balance": total_coins}},
            upsert=True
        )
        
        wallet = await db.wallets.find_one({"user_id": purchase.user_id})
        
        return {
            "success": True,
            "coins_added": total_coins,
            "bonus_coins": bundle["bonus_coins"],
            "new_balance": wallet["balance"],
            "mock_mode": True
        }
    except Exception as e:
        logger.error(f"Purchase error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/catalog")
async def get_enhanced_catalog():
    by_tier = {"low": [], "mid": [], "high": [], "ultra": [], "nuclear": []}
    for gift in ENHANCED_GIFTS.values():
        by_tier[gift["tier"]].append(gift)
    return {"gifts_by_tier": by_tier, "total_gifts": len(ENHANCED_GIFTS)}

@router.get("/leaderboard/{stream_id}")
async def get_top_gifters(stream_id: str):
    from server import db
    try:
        pipeline = [
            {"$match": {"stream_id": stream_id}},
            {"$group": {"_id": "$sender_id", "total": {"$sum": "$gift_price"}, "count": {"$sum": 1}}},
            {"$sort": {"total": -1}},
            {"$limit": 10}
        ]
        results = await db.gifts.aggregate(pipeline).to_list(10)
        leaderboard = [{"rank": i+1, "user_id": r["_id"], "total": r["total"], "count": r["count"]} for i, r in enumerate(results)]
        return {"leaderboard": leaderboard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
