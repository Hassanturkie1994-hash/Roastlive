from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Literal
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reactions", tags=["reactions"])

# Models
class SendReaction(BaseModel):
    stream_id: str
    user_id: str
    reaction_type: Literal["applause", "boo", "fire", "laugh", "love", "shocked"]
    intensity: int = 1  # 1-5 for reaction strength

class ReactionStats(BaseModel):
    stream_id: str
    applause_count: int
    boo_count: int
    fire_count: int
    laugh_count: int
    love_count: int
    shocked_count: int
    roast_meter: int  # -100 to +100 (-100 = all boos, +100 = all applause)
    total_reactions: int
    trending_reaction: str

class ChallengeGoal(BaseModel):
    stream_id: str
    creator_id: str
    goal_type: str  # "gift_total", "reaction_count", "viewer_count"
    target_amount: int
    reward_description: str
    current_amount: int = 0
    is_completed: bool = False

# Routes
@router.post("/send")
async def send_reaction(reaction: SendReaction, req: Request):
    """Send a reaction to a live stream"""
    from server import db
    
    try:
        # Record the reaction
        reaction_doc = {
            "stream_id": reaction.stream_id,
            "user_id": reaction.user_id,
            "reaction_type": reaction.reaction_type,
            "intensity": reaction.intensity,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.reactions.insert_one(reaction_doc)
        
        # Update stream reaction counters
        counter_field = f"{reaction.reaction_type}_count"
        await db.stream_stats.update_one(
            {"stream_id": reaction.stream_id},
            {
                "$inc": {
                    counter_field: reaction.intensity,
                    "total_reactions": reaction.intensity
                }
            },
            upsert=True
        )
        
        logger.info(f"Reaction sent: {reaction.reaction_type} to stream {reaction.stream_id}")
        
        # Calculate roast-o-meter value
        stats = await db.stream_stats.find_one({"stream_id": reaction.stream_id})
        if stats:
            applause = stats.get("applause_count", 0)
            boo = stats.get("boo_count", 0)
            total = stats.get("total_reactions", 1)
            
            # Calculate roast meter (-100 to +100)
            positive = applause + stats.get("laugh_count", 0) + stats.get("fire_count", 0) + stats.get("love_count", 0)
            negative = boo + stats.get("shocked_count", 0)
            
            if total > 0:
                roast_meter = int(((positive - negative) / total) * 100)
            else:
                roast_meter = 0
            
            await db.stream_stats.update_one(
                {"stream_id": reaction.stream_id},
                {"$set": {"roast_meter": roast_meter}}
            )
            
            # Check for milestone triggers (100 reactions, 500 reactions, etc.)
            if total in [100, 500, 1000, 5000]:
                logger.info(f"🎉 MILESTONE: Stream {reaction.stream_id} hit {total} reactions!")
                # Could trigger special effects here
        
        return {
            "success": True,
            "reaction_recorded": True,
            "roast_meter": roast_meter if stats else 0
        }
        
    except Exception as e:
        logger.error(f"Send reaction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stream/{stream_id}/stats")
async def get_reaction_stats(stream_id: str):
    """Get real-time reaction statistics for a stream"""
    from server import db
    
    try:
        # Get overall stats
        stats = await db.stream_stats.find_one(
            {"stream_id": stream_id},
            {"_id": 0}
        )
        
        if not stats:
            # Return empty stats
            return ReactionStats(
                stream_id=stream_id,
                applause_count=0,
                boo_count=0,
                fire_count=0,
                laugh_count=0,
                love_count=0,
                shocked_count=0,
                roast_meter=0,
                total_reactions=0,
                trending_reaction="none"
            )
        
        # Determine trending reaction
        reactions = {
            "applause": stats.get("applause_count", 0),
            "boo": stats.get("boo_count", 0),
            "fire": stats.get("fire_count", 0),
            "laugh": stats.get("laugh_count", 0),
            "love": stats.get("love_count", 0),
            "shocked": stats.get("shocked_count", 0),
        }
        
        trending = max(reactions, key=reactions.get)
        
        return ReactionStats(
            stream_id=stream_id,
            applause_count=stats.get("applause_count", 0),
            boo_count=stats.get("boo_count", 0),
            fire_count=stats.get("fire_count", 0),
            laugh_count=stats.get("laugh_count", 0),
            love_count=stats.get("love_count", 0),
            shocked_count=stats.get("shocked_count", 0),
            roast_meter=stats.get("roast_meter", 0),
            total_reactions=stats.get("total_reactions", 0),
            trending_reaction=trending
        )
        
    except Exception as e:
        logger.error(f"Get reaction stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/challenge/create")
async def create_challenge_goal(challenge: ChallengeGoal, req: Request):
    """Create a crowdfunded challenge goal for a stream"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user or current_user.user_id != challenge.creator_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        challenge_doc = {
            "stream_id": challenge.stream_id,
            "creator_id": challenge.creator_id,
            "goal_type": challenge.goal_type,
            "target_amount": challenge.target_amount,
            "current_amount": 0,
            "reward_description": challenge.reward_description,
            "is_completed": False,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.challenge_goals.insert_one(challenge_doc)
        
        logger.info(f"Challenge goal created for stream {challenge.stream_id}: {challenge.reward_description}")
        
        return {"success": True, "message": "Challenge goal created"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create challenge error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/challenge/stream/{stream_id}")
async def get_stream_challenges(stream_id: str):
    """Get active challenges for a stream"""
    from server import db
    
    try:
        challenges = await db.challenge_goals.find(
            {
                "stream_id": stream_id,
                "is_completed": False
            },
            {"_id": 0}
        ).to_list(10)
        
        return {"challenges": challenges}
        
    except Exception as e:
        logger.error(f"Get challenges error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/milestone/trigger")
async def trigger_milestone(stream_id: str, milestone_type: str, req: Request):
    """Trigger a milestone event (1000 viewers, 500 gifts, etc.)"""
    from server import db
    
    try:
        milestone_doc = {
            "stream_id": stream_id,
            "milestone_type": milestone_type,
            "triggered_at": datetime.now(timezone.utc)
        }
        
        await db.milestones.insert_one(milestone_doc)
        
        logger.info(f"🎉 MILESTONE TRIGGERED: {milestone_type} for stream {stream_id}")
        
        # Return celebration message
        messages = {
            "1000_viewers": "🎉 1,000 concurrent viewers! You're trending!",
            "500_gifts": "🎁 500 gifts received! Your audience loves you!",
            "100_reactions": "👏 100 reactions! The crowd is loving it!",
            "1_hour_stream": "⏰ 1 hour streaming! Keep going strong!",
        }
        
        return {
            "success": True,
            "message": messages.get(milestone_type, "Milestone achieved!"),
            "celebration": True
        }
        
    except Exception as e:
        logger.error(f"Milestone trigger error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
