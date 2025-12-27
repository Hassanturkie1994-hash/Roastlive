from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Models
class StreamAnalytics(BaseModel):
    stream_id: str
    current_viewers: int
    peak_viewers: int
    avg_viewers: int
    total_messages: int
    messages_per_minute: float
    total_gifts: int
    total_revenue: int
    sentiment_score: float  # -1 to +1
    trending_topics: list
    engagement_rate: float
    new_followers: int

# Routes
@router.get("/stream/{stream_id}/live")
async def get_live_analytics(stream_id: str, req: Request):
    """Get real-time analytics for a stream (for host overlay)"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Get stream data
        stream = await db.streams.find_one({"id": stream_id})
        if not stream:
            raise HTTPException(status_code=404, detail="Stream not found")
        
        # Calculate analytics
        current_viewers = stream.get("viewer_count", 0)
        
        # Get message count
        total_messages = await db.stream_messages.count_documents({"stream_id": stream_id})
        
        # Get recent message rate (last 1 minute)
        one_min_ago = datetime.now(timezone.utc) - timedelta(minutes=1)
        recent_messages = await db.stream_messages.count_documents({
            "stream_id": stream_id,
            "created_at": {"$gte": one_min_ago}
        })
        
        # Get gift stats
        gift_pipeline = [
            {"$match": {"stream_id": stream_id}},
            {"$group": {
                "_id": None,
                "total_gifts": {"$sum": 1},
                "total_revenue": {"$sum": "$gift_price"}
            }}
        ]
        
        gift_stats = await db.gifts.aggregate(gift_pipeline).to_list(1)
        total_gifts = gift_stats[0]["total_gifts"] if gift_stats else 0
        total_revenue = gift_stats[0]["total_revenue"] if gift_stats else 0
        
        # Get reaction stats for sentiment
        reaction_stats = await db.stream_stats.find_one({"stream_id": stream_id})
        sentiment_score = 0.0
        if reaction_stats:
            roast_meter = reaction_stats.get("roast_meter", 0)
            sentiment_score = roast_meter / 100  # Convert to -1 to +1
        
        # Calculate engagement rate
        engagement_rate = 0.0
        if current_viewers > 0:
            active_users = total_messages + total_gifts
            engagement_rate = (active_users / current_viewers) * 100
        
        return {
            "stream_id": stream_id,
            "current_viewers": current_viewers,
            "peak_viewers": stream.get("peak_viewers", current_viewers),
            "avg_viewers": stream.get("avg_viewers", current_viewers),
            "total_messages": total_messages,
            "messages_per_minute": recent_messages,
            "total_gifts": total_gifts,
            "total_revenue": total_revenue,
            "sentiment_score": sentiment_score,
            "trending_topics": [],  # TODO: Extract from chat
            "engagement_rate": round(engagement_rate, 2),
            "new_followers": 0  # TODO: Track follower growth
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stream/{stream_id}/milestones")
async def get_stream_milestones(stream_id: str):
    """Get triggered milestones for a stream"""
    from server import db
    
    try:
        milestones = await db.milestones.find(
            {"stream_id": stream_id},
            {"_id": 0}
        ).sort("triggered_at", -1).to_list(10)
        
        return {"milestones": milestones}
        
    except Exception as e:
        logger.error(f"Get milestones error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
