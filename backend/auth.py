from fastapi import APIRouter, HTTPException, Request, Response, Depends, BackgroundTasks
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from typing import Optional
import httpx
import secrets
import logging
import os
from email_service import send_welcome_email, EmailDeliveryError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# Models
class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str]
    session_token: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

# Helper functions
async def exchange_session_id(session_id: str) -> dict:
    """Exchange session_id for session data from Emergent Auth API."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to exchange session_id: {e}")
            raise HTTPException(status_code=401, detail="Invalid session")

async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from session token (cookie or header)."""
    from server import db
    
    # Try to get token from cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    # Find session in database
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        return None
    
    # Check if session is expired (normalize timezone-naive datetimes)
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at <= datetime.now(timezone.utc):
        return None
    
    # Get user data
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if user_doc:
        return User(**user_doc)
    return None

# Routes
@router.post("/session")
async def create_session(request: Request, response: Response, background_tasks: BackgroundTasks):
    """
    Exchange session_id for user data and create session.
    Called by frontend after OAuth redirect.
    """
    from server import db
    
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id for user data
    user_data = await exchange_session_id(session_id)
    
    # IMPORTANT: session_token is already in user_data, don't add it again
    session_response = SessionDataResponse(**user_data)
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": session_response.email},
        {"_id": 0}
    )
    
    is_new_user = False
    if not existing_user:
        # Create new user with custom user_id
        user_id = f"user_{secrets.token_hex(12)}"
        user_doc = {
            "user_id": user_id,
            "email": session_response.email,
            "name": session_response.name,
            "picture": session_response.picture,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
        is_new_user = True
        
        # Send welcome email in background
        background_tasks.add_task(send_welcome_email, session_response.email, session_response.name)
    else:
        user_id = existing_user["user_id"]
    
    # Create session in database
    session_doc = {
        "user_id": user_id,
        "session_token": session_response.session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    
    # Upsert session (replace if exists)
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": session_doc},
        upsert=True
    )
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_response.session_token,
        max_age=7 * 24 * 60 * 60,  # 7 days
        httponly=True,
        secure=True,  # In production with HTTPS
        samesite="none",
        path="/"
    )
    
    return {
        "user_id": user_id,
        "email": session_response.email,
        "name": session_response.name,
        "picture": session_response.picture,
        "session_token": session_response.session_token,
        "is_new_user": is_new_user
    }

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return current_user

@router.post("/logout")
async def logout(request: Request, response: Response, current_user: User = Depends(get_current_user)):
    """Logout and clear session."""
    from server import db
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Delete session from database
    await db.user_sessions.delete_many({"user_id": current_user.user_id})
    
    # Clear cookie
    response.delete_cookie("session_token", path="/")
    
    return {"message": "Logged out successfully"}

@router.get("/check")
async def check_session(current_user: Optional[User] = Depends(get_current_user)):
    """Check if user is authenticated."""
    if current_user:
        return {"authenticated": True, "user": current_user}
    return {"authenticated": False}
