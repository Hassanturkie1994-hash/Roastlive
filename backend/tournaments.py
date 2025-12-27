from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List, Literal
import logging
import secrets

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])

# Models
class CreateTournament(BaseModel):
    name: str
    format: Literal["single_elimination", "double_elimination", "round_robin"]
    max_participants: int
    prize_pool: int = 0
    start_time: str

class JoinTournament(BaseModel):
    tournament_id: str
    user_id: str

class SubmitVote(BaseModel):
    match_id: str
    voted_for: str  # user_id

# Routes
@router.post("/create")
async def create_tournament(tournament: CreateTournament, req: Request):
    """Create a new roast battle tournament"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        tournament_id = f"tournament_{secrets.token_hex(8)}"
        
        tournament_doc = {
            "tournament_id": tournament_id,
            "name": tournament.name,
            "format": tournament.format,
            "max_participants": tournament.max_participants,
            "prize_pool": tournament.prize_pool,
            "start_time": tournament.start_time,
            "status": "registration",
            "current_participants": 0,
            "created_by": current_user.user_id,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.tournaments.insert_one(tournament_doc)
        
        logger.info(f"Tournament created: {tournament_id} - {tournament.name}")
        
        return {
            "success": True,
            "tournament_id": tournament_id,
            "registration_open": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create tournament error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/join")
async def join_tournament(join: JoinTournament, req: Request):
    """Join a tournament"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user or current_user.user_id != join.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Check tournament exists and is open
        tournament = await db.tournaments.find_one({"tournament_id": join.tournament_id})
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        
        if tournament["status"] != "registration":
            raise HTTPException(status_code=400, detail="Registration closed")
        
        if tournament["current_participants"] >= tournament["max_participants"]:
            raise HTTPException(status_code=400, detail="Tournament full")
        
        # Add participant
        participant_doc = {
            "tournament_id": join.tournament_id,
            "user_id": join.user_id,
            "status": "registered",
            "seed": tournament["current_participants"] + 1,
            "joined_at": datetime.now(timezone.utc)
        }
        
        await db.tournament_participants.insert_one(participant_doc)
        
        # Update participant count
        await db.tournaments.update_one(
            {"tournament_id": join.tournament_id},
            {"$inc": {"current_participants": 1}}
        )
        
        logger.info(f"User {join.user_id} joined tournament {join.tournament_id}")
        
        return {"success": True, "message": "Joined tournament"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Join tournament error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/active")
async def get_active_tournaments():
    """Get all active/upcoming tournaments"""
    from server import db
    
    try:
        tournaments = await db.tournaments.find(
            {"status": {"$in": ["registration", "in_progress"]}},
            {"_id": 0}
        ).to_list(50)
        
        return {"tournaments": tournaments}
        
    except Exception as e:
        logger.error(f"Get tournaments error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
