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
from datetime import datetime
import openai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI client for moderation
openai.api_key = os.environ['OPENAI_API_KEY']

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
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
    contentType: str  # 'username', 'bio', 'message'

class ModerationResult(BaseModel):
    flagged: bool
    action: str  # 'allow', 'block', 'flag_for_review'
    categories: dict
    categoryScores: dict

# Moderation thresholds
THRESHOLDS = {
    'username': {
        'harassment': 0.3,
        'hate': 0.2,
        'sexual': 0.2,
        'violence': 0.3,
    },
    'bio': {
        'harassment': 0.35,
        'hate': 0.25,
        'sexual': 0.3,
        'violence': 0.4,
    },
    'message': {
        'harassment': 0.5,
        'hate': 0.4,
        'sexual': 0.4,
        'violence': 0.6,
    },
}

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Roast Live API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Optimized query with projection to limit fields
    status_checks = await db.status_checks.find(
        {},
        {"_id": 0, "id": 1, "client_name": 1, "timestamp": 1}
    ).to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/moderate/text", response_model=ModerationResult)
async def moderate_text(request: ModerationRequest):
    """Moderate text content using OpenAI Moderation API"""
    try:
        # Call OpenAI Moderation API
        response = openai.moderations.create(
            model="omni-moderation-latest",
            input=request.text
        )
        
        result = response.results[0]
        flagged = result.flagged
        
        # Get thresholds for content type
        thresholds = THRESHOLDS.get(request.contentType, THRESHOLDS['message'])
        
        # Determine action based on scores
        action = 'allow'
        for category, threshold in thresholds.items():
            score = result.category_scores.get(category, 0)
            if score > threshold:
                if request.contentType in ['username', 'bio']:
                    action = 'block'  # Stricter for profiles
                elif score > threshold + 0.2:
                    action = 'block'
                else:
                    action = 'flag_for_review'
                break
        
        # Store moderation result
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
