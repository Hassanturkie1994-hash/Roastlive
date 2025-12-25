from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import openai
from agora_token_builder import RtcTokenBuilder
import time

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI client for moderation
openai.api_key = os.environ['OPENAI_API_KEY']

# Agora credentials
AGORA_APP_ID = os.environ['AGORA_APP_ID']
AGORA_APP_CERTIFICATE = os.environ['AGORA_APP_CERTIFICATE']

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class ModerationRequest(BaseModel):
    text: str
    userId: str
    contentType: str

class ModerationResult(BaseModel):
    flagged: bool
    action: str
    categories: dict
    categoryScores: dict

class AgoraTokenRequest(BaseModel):
    channelName: str
    uid: int
    role: str  # 'host' or 'audience'

class AgoraTokenResponse(BaseModel):
    token: str
    channelName: str
    uid: int
    appId: str

class CreateStreamRequest(BaseModel):
    hostId: str
    title: str
    channelName: str

class StreamResponse(BaseModel):
    id: str
    hostId: str
    title: str
    channelName: str
    isLive: bool
    viewerCount: int
    createdAt: str

# Moderation thresholds
THRESHOLDS = {
    'username': {'harassment': 0.3, 'hate': 0.2, 'sexual': 0.2, 'violence': 0.3},
    'bio': {'harassment': 0.35, 'hate': 0.25, 'sexual': 0.3, 'violence': 0.4},
    'message': {'harassment': 0.5, 'hate': 0.4, 'sexual': 0.4, 'violence': 0.6},
}

# Basic routes
@api_router.get("/")
async def root():
    return {"message": "Roast Live API - Phase 4-5: Live Streaming"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find(
        {}, {"_id": 0, "id": 1, "client_name": 1, "timestamp": 1}
    ).to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# AI Moderation
@api_router.post("/moderate/text", response_model=ModerationResult)
async def moderate_text(request: ModerationRequest):
    """Moderate text content using OpenAI Moderation API"""
    try:
        response = openai.moderations.create(
            model="omni-moderation-latest",
            input=request.text
        )
        
        result = response.results[0]
        flagged = result.flagged
        thresholds = THRESHOLDS.get(request.contentType, THRESHOLDS['message'])
        
        action = 'allow'
        for category, threshold in thresholds.items():
            score = result.category_scores.get(category, 0)
            if score > threshold:
                if request.contentType in ['username', 'bio']:
                    action = 'block'
                elif score > threshold + 0.2:
                    action = 'block'
                else:
                    action = 'flag_for_review'
                break
        
        moderation_record = {
            "user_id": request.userId,
            "content_type": request.contentType,
            "original_content": request.text,
            "flagged": flagged,
            "action": action,
            "categories": dict(result.categories),
            "category_scores": dict(result.category_scores),
            "timestamp": datetime.utcnow()
        }
        await db.moderation_results.insert_one(moderation_record)
        
        return ModerationResult(
            flagged=flagged,
            action=action,
            categories=dict(result.categories),
            categoryScores=dict(result.category_scores)
        )
    except Exception as e:
        logging.error(f"Moderation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Agora Token Generation
@api_router.post("/streams/token", response_model=AgoraTokenResponse)
async def generate_agora_token(request: AgoraTokenRequest):
    """Generate Agora RTC token for streaming"""
    try:
        # Token expiration time (24 hours)
        expiration_time_in_seconds = 3600 * 24
        current_timestamp = int(time.time())
        privilege_expired_ts = current_timestamp + expiration_time_in_seconds
        
        # Role: 1 for host (publisher), 2 for audience (subscriber)
        role = 1 if request.role == 'host' else 2
        
        # Generate token
        token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            AGORA_APP_CERTIFICATE,
            request.channelName,
            request.uid,
            role,
            privilege_expired_ts
        )
        
        return AgoraTokenResponse(
            token=token,
            channelName=request.channelName,
            uid=request.uid,
            appId=AGORA_APP_ID
        )
    except Exception as e:
        logging.error(f"Token generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Stream Management
@api_router.post("/streams/create", response_model=StreamResponse)
async def create_stream(request: CreateStreamRequest):
    """Create a new live stream"""
    try:
        stream_id = str(uuid.uuid4())
        stream_data = {
            "id": stream_id,
            "host_id": request.hostId,
            "title": request.title,
            "channel_name": request.channelName,
            "is_live": True,
            "viewer_count": 0,
            "max_participants": 10,
            "started_at": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat(),
        }
        
        await db.streams.insert_one(stream_data)
        
        return StreamResponse(
            id=stream_id,
            hostId=request.hostId,
            title=request.title,
            channelName=request.channelName,
            isLive=True,
            viewerCount=0,
            createdAt=stream_data["created_at"]
        )
    except Exception as e:
        logging.error(f"Create stream error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/streams/{stream_id}/end")
async def end_stream(stream_id: str):
    """End a live stream"""
    try:
        result = await db.streams.update_one(
            {"id": stream_id},
            {
                "$set": {
                    "is_live": False,
                    "ended_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Stream not found")
        
        return {"message": "Stream ended successfully"}
    except Exception as e:
        logging.error(f"End stream error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/streams/active")
async def get_active_streams():
    """Get all active live streams"""
    try:
        streams = await db.streams.find(
            {"is_live": True},
            {"_id": 0}
        ).to_list(100)
        return {"streams": streams}
    except Exception as e:
        logging.error(f"Get active streams error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/streams/{stream_id}/viewer-count")
async def update_viewer_count(stream_id: str, count: int):
    """Update viewer count for a stream"""
    try:
        await db.streams.update_one(
            {"id": stream_id},
            {"$set": {"viewer_count": count}}
        )
        return {"message": "Viewer count updated"}
    except Exception as e:
        logging.error(f"Update viewer count error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
