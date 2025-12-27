from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/achievements", tags=["achievements"])

# Achievement Definitions
ACHIEVEMENTS = {
    # Viewer Achievements
    "roast_regular": {
        "name": "Roast Regular",
        "description": "Watch 5 streams in a week",
        "icon": "🎭",
        "requirement": {"type": "streams_watched", "count": 5, "period": "week"}
    },
    "chat_champion": {
        "name": "Chat Champion",
        "description": "Post 100 messages",
        "icon": "💬",
        "requirement": {"type": "messages_sent", "count": 100}
    },
    "top_tipper": {
        "name": "Top Tipper",
        "description": "Send 1000 coins in gifts",
        "icon": "💰",
        "requirement": {"type": "gifts_value", "count": 1000}
    },
    "reaction_king": {
        "name": "Reaction King",
        "description": "Send 500 reactions",
        "icon": "👑",
        "requirement": {"type": "reactions_sent", "count": 500}
    },
    
    # Streamer Achievements
    "marathon_streamer": {
        "name": "Marathon Streamer",
        "description": "Stream 20 hours in a month",
        "icon": "⏰",
        "requirement": {"type": "stream_hours", "count": 20, "period": "month"}
    },
    "crowd_favorite": {
        "name": "Crowd Favorite",
        "description": "Average 100+ viewers",
        "icon": "⭐",
        "requirement": {"type": "avg_viewers", "count": 100}
    },
    "battle_master": {
        "name": "Battle Master",
        "description": "Win 10 battles",
        "icon": "⚔️",
        "requirement": {"type": "battle_wins", "count": 10}
    },
    "roast_legend": {
        "name": "Roast Legend",
        "description": "Hit +90 on roast-o-meter",
        "icon": "🔥",
        "requirement": {"type": "roast_meter_peak", "count": 90}
    }
}

# Models
class AchievementProgress(BaseModel):
    achievement_id: str
    current_value: int
    target_value: int
    percentage: int
    is_unlocked: bool

# Routes
@router.get("/user/{user_id}")
async def get_user_achievements(user_id: str, req: Request):
    """Get achievements for a user"""
    from server import db
    
    try:
        # Get user's unlocked achievements
        user_achievements = await db.user_achievements.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        
        unlocked_ids = [a["achievement_id"] for a in user_achievements if a.get("unlocked")]
        
        # Calculate progress for all achievements
        user_stats = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        
        achievements_with_progress = []
        for ach_id, ach_data in ACHIEVEMENTS.items():
            req_type = ach_data["requirement"]["type"]
            target = ach_data["requirement"]["count"]
            
            # Get current value based on requirement type
            current_value = user_stats.get(req_type, 0) if user_stats else 0
            
            is_unlocked = ach_id in unlocked_ids
            percentage = min(int((current_value / target) * 100), 100) if target > 0 else 0
            
            achievements_with_progress.append({
                "achievement_id": ach_id,
                "name": ach_data["name"],
                "description": ach_data["description"],
                "icon": ach_data["icon"],
                "current_value": current_value,
                "target_value": target,
                "percentage": percentage,
                "is_unlocked": is_unlocked,
                "unlocked_at": next((a["unlocked_at"] for a in user_achievements if a["achievement_id"] == ach_id), None)
            })
        
        return {
            "achievements": achievements_with_progress,
            "total_unlocked": len(unlocked_ids),
            "total_available": len(ACHIEVEMENTS)
        }
        
    except Exception as e:
        logger.error(f"Get achievements error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-unlock/{user_id}")
async def check_and_unlock_achievements(user_id: str):
    """Check if user has unlocked new achievements"""
    from server import db
    
    try:
        user_stats = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user_stats:
            return {"newly_unlocked": []}
        
        newly_unlocked = []
        
        for ach_id, ach_data in ACHIEVEMENTS.items():
            # Check if already unlocked
            existing = await db.user_achievements.find_one({
                "user_id": user_id,
                "achievement_id": ach_id,
                "unlocked": True
            })
            
            if existing:
                continue
            
            # Check if requirement met
            req_type = ach_data["requirement"]["type"]
            target = ach_data["requirement"]["count"]
            current = user_stats.get(req_type, 0)
            
            if current >= target:
                # Unlock achievement!
                await db.user_achievements.update_one(
                    {"user_id": user_id, "achievement_id": ach_id},
                    {
                        "$set": {
                            "unlocked": True,
                            "unlocked_at": datetime.now(timezone.utc)
                        }
                    },
                    upsert=True
                )
                
                newly_unlocked.append({
                    "achievement_id": ach_id,
                    "name": ach_data["name"],
                    "icon": ach_data["icon"]
                })
                
                logger.info(f"🏆 Achievement unlocked: {ach_id} for user {user_id}")
        
        return {"newly_unlocked": newly_unlocked}
        
    except Exception as e:
        logger.error(f"Check unlock error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
