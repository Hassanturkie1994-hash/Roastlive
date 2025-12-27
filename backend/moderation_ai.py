from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Literal, Optional
import logging
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/moderation", tags=["moderation"])

# Models
class ModerationSettings(BaseModel):
    creator_id: str
    strictness_level: Literal["strict", "moderate", "relaxed"] = "moderate"
    allowed_topics: list = []  # Topics the creator is okay with
    blocked_words: list = []  # Custom blocked words
    auto_timeout_enabled: bool = True
    
class SafeWordTrigger(BaseModel):
    stream_id: str
    triggered_by: str  # user_id who triggered
    reason: Optional[str] = None

class ModerationAction(BaseModel):
    stream_id: str
    user_id: str
    content: str
    action: Literal["allow", "warn", "timeout", "ban"]
    ai_score: float
    reason: str

# Helper functions
def get_strictness_thresholds(level: str) -> dict:
    """Get moderation thresholds based on strictness level"""
    thresholds = {
        "strict": {"harassment": 0.3, "hate": 0.2, "sexual": 0.2, "violence": 0.3},
        "moderate": {"harassment": 0.5, "hate": 0.4, "sexual": 0.4, "violence": 0.5},
        "relaxed": {"harassment": 0.7, "hate": 0.6, "sexual": 0.6, "violence": 0.7}
    }
    return thresholds.get(level, thresholds["moderate"])

async def moderate_content_ai(content: str, strictness: str = "moderate") -> dict:
    """AI-powered content moderation with adjustable strictness"""
    try:
        EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
        
        if not EMERGENT_LLM_KEY:
            logger.warning("No LLM key - using permissive moderation")
            return {"action": "allow", "score": 0.0, "reason": "No AI available"}
        
        # Use LLM for intelligent moderation
        llm = LlmChat(api_key=EMERGENT_LLM_KEY, model="gpt-4o-mini")
        
        prompt = f"""Analyze this message for a comedy roast stream with {strictness} moderation.
Message: "{content}"

Rate toxicity 0-1 and determine if it should be:
- allow (friendly roast/banter)
- warn (borderline)
- timeout (clearly offensive)
- ban (hate speech/harassment)

Respond in format: action|score|reason"""
        
        response = llm.send_message_sync(UserMessage(content=prompt))
        parts = response.strip().split('|')
        
        if len(parts) >= 3:
            action = parts[0].strip()
            score = float(parts[1].strip())
            reason = parts[2].strip()
        else:
            action = "allow"
            score = 0.0
            reason = "AI analysis inconclusive"
        
        return {"action": action, "score": score, "reason": reason}
        
    except Exception as e:
        logger.error(f"AI moderation error: {e}")
        return {"action": "allow", "score": 0.0, "reason": "Error in AI"}

# Routes
@router.post("/settings/update")
async def update_moderation_settings(settings: ModerationSettings, req: Request):
    """Update moderation settings for a creator"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user or current_user.user_id != settings.creator_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        settings_doc = {
            "creator_id": settings.creator_id,
            "strictness_level": settings.strictness_level,
            "allowed_topics": settings.allowed_topics,
            "blocked_words": settings.blocked_words,
            "auto_timeout_enabled": settings.auto_timeout_enabled,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.moderation_settings.update_one(
            {"creator_id": settings.creator_id},
            {"$set": settings_doc},
            upsert=True
        )
        
        logger.info(f"Moderation settings updated for creator {settings.creator_id}: {settings.strictness_level}")
        
        return {"success": True, "message": "Moderation settings updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update moderation settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings/{creator_id}")
async def get_moderation_settings(creator_id: str, req: Request):
    """Get moderation settings for a creator"""
    from server import db
    
    try:
        settings = await db.moderation_settings.find_one(
            {"creator_id": creator_id},
            {"_id": 0}
        )
        
        if not settings:
            # Return defaults
            return {
                "creator_id": creator_id,
                "strictness_level": "moderate",
                "allowed_topics": [],
                "blocked_words": [],
                "auto_timeout_enabled": True
            }
        
        return settings
        
    except Exception as e:
        logger.error(f"Get moderation settings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/safeword/trigger")
async def trigger_safeword(trigger: SafeWordTrigger, req: Request):
    """Trigger safe-word system during stream"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Record safe-word trigger
        safeword_doc = {
            "stream_id": trigger.stream_id,
            "triggered_by": trigger.triggered_by,
            "reason": trigger.reason,
            "triggered_at": datetime.now(timezone.utc)
        }
        
        await db.safeword_triggers.insert_one(safeword_doc)
        
        logger.info(f"🛑 SAFE-WORD TRIGGERED in stream {trigger.stream_id} by {trigger.triggered_by}")
        
        # Return response with suggested actions
        return {
            "success": True,
            "message": "Safe-word activated",
            "suggested_action": "cooldown",
            "display_message": "🔥🔥 Roast cooldown activated – let's keep it fun! 🔥🔥"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Safe-word trigger error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/moderate/chat")
async def moderate_chat_message(content: str, stream_id: str, user_id: str):
    """Moderate a chat message with AI"""
    from server import db
    
    try:
        # Get creator's moderation settings
        stream = await db.streams.find_one({"id": stream_id})
        if not stream:
            raise HTTPException(status_code=404, detail="Stream not found")
        
        creator_id = stream["host_id"]
        settings = await db.moderation_settings.find_one({"creator_id": creator_id})
        
        strictness = settings["strictness_level"] if settings else "moderate"
        
        # AI moderation
        result = await moderate_content_ai(content, strictness)
        
        # Log moderation action
        action_doc = {
            "stream_id": stream_id,
            "user_id": user_id,
            "content": content,
            "action": result["action"],
            "ai_score": result["score"],
            "reason": result["reason"],
            "strictness_level": strictness,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.moderation_actions.insert_one(action_doc)
        
        if result["action"] in ["timeout", "ban"]:
            logger.warning(f"Content moderated: {result['action']} - {user_id} - {result['reason']}")
        
        return {
            "action": result["action"],
            "score": result["score"],
            "reason": result["reason"],
            "allowed": result["action"] in ["allow", "warn"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat moderation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
