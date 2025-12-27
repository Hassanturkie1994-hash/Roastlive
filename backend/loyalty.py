from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Literal
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/loyalty", tags=["loyalty"])

# Models
class EarnPoints(BaseModel):
    user_id: str
    action: Literal["watch_stream", "send_message", "daily_login", "send_reaction"]
    points: int

class RedeemReward(BaseModel):
    user_id: str
    reward_id: str
    cost: int

# Point values
POINT_VALUES = {
    "watch_stream": 10,  # Per 10 minutes
    "send_message": 1,
    "daily_login": 50,
    "send_reaction": 2,
    "complete_quest": 100
}

# Redeemable rewards
REWARDS = {
    "highlight_message": {"name": "Highlight Next Message", "cost": 500, "icon": "✨"},
    "custom_emoji": {"name": "Unlock Custom Emoji", "cost": 1000, "icon": "😎"},
    "sound_effect": {"name": "Play Sound Effect", "cost": 750, "icon": "🔊"},
    "name_color": {"name": "Custom Name Color", "cost": 2000, "icon": "🎨"},
    "badge_display": {"name": "Featured Badge", "cost": 1500, "icon": "🏅"}
}

# Routes
@router.post("/earn")
async def earn_loyalty_points(earn: EarnPoints, req: Request):
    """Award loyalty points for user actions"""
    from server import db
    
    try:
        # Record points transaction
        transaction_doc = {
            "user_id": earn.user_id,
            "action": earn.action,
            "points": earn.points,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.loyalty_transactions.insert_one(transaction_doc)
        
        # Update user's loyalty balance
        await db.users.update_one(
            {"user_id": earn.user_id},
            {"$inc": {"loyalty_points": earn.points}},
            upsert=True
        )
        
        # Get new balance
        user = await db.users.find_one({"user_id": earn.user_id}, {"_id": 0})
        new_balance = user.get("loyalty_points", 0) if user else earn.points
        
        logger.info(f"Loyalty points earned: {earn.user_id} +{earn.points} ({earn.action})")
        
        return {
            "success": True,
            "points_earned": earn.points,
            "new_balance": new_balance
        }
        
    except Exception as e:
        logger.error(f"Earn points error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/balance/{user_id}")
async def get_loyalty_balance(user_id: str):
    """Get user's loyalty points balance"""
    from server import db
    
    try:
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        balance = user.get("loyalty_points", 0) if user else 0
        
        return {
            "user_id": user_id,
            "balance": balance,
            "rank": "Bronze"  # TODO: Calculate tier
        }
        
    except Exception as e:
        logger.error(f"Get balance error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/redeem")
async def redeem_reward(redeem: RedeemReward, req: Request):
    """Redeem loyalty points for a reward"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user or current_user.user_id != redeem.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Check if reward exists
        if redeem.reward_id not in REWARDS:
            raise HTTPException(status_code=404, detail="Reward not found")
        
        reward = REWARDS[redeem.reward_id]
        
        # Check if user has enough points
        user = await db.users.find_one({"user_id": redeem.user_id})
        current_balance = user.get("loyalty_points", 0) if user else 0
        
        if current_balance < redeem.cost:
            raise HTTPException(status_code=400, detail="Insufficient points")
        
        # Deduct points
        await db.users.update_one(
            {"user_id": redeem.user_id},
            {"$inc": {"loyalty_points": -redeem.cost}}
        )
        
        # Record redemption
        redemption_doc = {
            "user_id": redeem.user_id,
            "reward_id": redeem.reward_id,
            "reward_name": reward["name"],
            "cost": redeem.cost,
            "redeemed_at": datetime.now(timezone.utc)
        }
        
        await db.loyalty_redemptions.insert_one(redemption_doc)
        
        logger.info(f"Reward redeemed: {redeem.user_id} - {reward['name']} ({redeem.cost} points)")
        
        return {
            "success": True,
            "reward_name": reward["name"],
            "points_spent": redeem.cost,
            "new_balance": current_balance - redeem.cost
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Redeem reward error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rewards")
async def get_available_rewards():
    """Get all available rewards for redemption"""
    return {
        "rewards": [
            {"id": rid, **data}
            for rid, data in REWARDS.items()
        ]
    }
