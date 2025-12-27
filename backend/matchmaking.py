from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal
import logging
import secrets

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/matchmaking", tags=["matchmaking"])

# Models
class JoinQueueRequest(BaseModel):
    team_size: Literal["1v1", "2v2", "3v3", "4v4", "5v5"]
    region: str = "global"
    guest_ids: List[str] = []  # IDs of guests in the team

class QueueStatus(BaseModel):
    in_queue: bool
    team_size: Optional[str] = None
    position: Optional[int] = None
    wait_time_seconds: Optional[int] = None
    estimated_wait: Optional[str] = None

class MatchFoundResponse(BaseModel):
    match_id: str
    team: Literal["team_a", "team_b"]
    team_size: str
    teammates: List[dict]
    opponents: List[dict]
    battle_room_url: str

class BattleMatch(BaseModel):
    match_id: str
    team_size: str
    status: str
    team_a_score: int
    team_b_score: int
    duration_seconds: int
    started_at: Optional[datetime]
    ended_at: Optional[datetime]

# Helper functions
def parse_team_size(team_size: str) -> int:
    """Convert team size string (e.g. '3v3') to integer (3)"""
    return int(team_size.split('v')[0])

async def check_user_availability(user_id: str, db) -> bool:
    """Check if user is available for matchmaking (not in stream/battle)"""
    # Check if user is already in a queue
    in_queue = await db.matchmaking_queue.find_one({
        "user_id": user_id,
        "status": "waiting"
    })
    if in_queue:
        return False
    
    # Check if user is in an active battle
    in_battle = await db.battle_participants.find_one({
        "user_id": user_id,
        "status": {"$in": ["ready", "active"]}
    })
    if in_battle:
        return False
    
    return True

async def find_match(team_size: str, region: str, db):
    """Find a suitable match for the given criteria"""
    players_needed = parse_team_size(team_size) * 2  # Total players needed (both teams)
    
    # Get waiting players for this team size and region (FIFO - longest wait first)
    waiting_players = await db.matchmaking_queue.find({
        "team_size": team_size,
        "region": region,
        "status": "waiting"
    }).sort("joined_at", 1).limit(players_needed).to_list(players_needed)
    
    # If not enough players, try global region as fallback
    if len(waiting_players) < players_needed and region != "global":
        global_players = await db.matchmaking_queue.find({
            "team_size": team_size,
            "region": "global",
            "status": "waiting"
        }).sort("joined_at", 1).limit(players_needed - len(waiting_players)).to_list(players_needed)
        waiting_players.extend(global_players)
    
    # Check if we have enough players
    if len(waiting_players) >= players_needed:
        return waiting_players[:players_needed]
    
    return None

async def create_battle_match(players: List[dict], team_size: str, db):
    """Create a new battle match with the given players"""
    match_id = f"battle_{secrets.token_hex(8)}"
    team_per_side = parse_team_size(team_size)
    
    # Split players into two teams
    team_a = players[:team_per_side]
    team_b = players[team_per_side:]
    
    # Create battle match record
    match_doc = {
        "match_id": match_id,
        "team_size": team_size,
        "status": "forming",
        "team_a_score": 0,
        "team_b_score": 0,
        "duration_seconds": 180,  # 3 minutes default
        "region": players[0].get("region", "global"),
        "created_at": datetime.now(timezone.utc),
        "started_at": None,
        "ended_at": None
    }
    
    await db.battle_matches.insert_one(match_doc)
    
    # Create participant records
    participants = []
    
    for player in team_a:
        participants.append({
            "match_id": match_id,
            "user_id": player["user_id"],
            "team": "team_a",
            "status": "pending",
            "ready": False,
            "joined_at": datetime.now(timezone.utc)
        })
    
    for player in team_b:
        participants.append({
            "match_id": match_id,
            "user_id": player["user_id"],
            "team": "team_b",
            "status": "pending",
            "ready": False,
            "joined_at": datetime.now(timezone.utc)
        })
    
    if participants:
        await db.battle_participants.insert_many(participants)
    
    # Update queue entries to matched
    player_ids = [p["user_id"] for p in players]
    await db.matchmaking_queue.update_many(
        {"user_id": {"$in": player_ids}, "status": "waiting"},
        {"$set": {"status": "matched", "match_id": match_id, "matched_at": datetime.now(timezone.utc)}}
    )
    
    logger.info(f"Created battle match {match_id} with {len(team_a)} vs {len(team_b)}")
    
    return match_id

# Routes
@router.post("/queue/join")
async def join_queue(request: JoinQueueRequest, req: Request):
    """Join the matchmaking queue"""
    from auth import get_current_user
    from server import db
    
    try:
        # Get current user
        current_user = await get_current_user(req)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Check if user is available
        if not await check_user_availability(current_user.user_id, db):
            raise HTTPException(status_code=400, detail="Already in queue or battle")
        
        # Validate team size matches guest count
        team_per_side = parse_team_size(request.team_size)
        total_team_members = 1 + len(request.guest_ids)  # Host + guests
        
        if total_team_members > team_per_side:
            raise HTTPException(
                status_code=400,
                detail=f"Too many team members for {request.team_size} battle"
            )
        
        # Check if guests are available
        for guest_id in request.guest_ids:
            if not await check_user_availability(guest_id, db):
                raise HTTPException(
                    status_code=400,
                    detail=f"Guest {guest_id} is not available"
                )
        
        # Add host to queue
        queue_entry = {
            "user_id": current_user.user_id,
            "team_size": request.team_size,
            "region": request.region,
            "is_leader": True,
            "team_members": request.guest_ids,
            "status": "waiting",
            "joined_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(seconds=120)  # 2 min timeout
        }
        
        await db.matchmaking_queue.insert_one(queue_entry)
        
        # Add guests to queue
        for guest_id in request.guest_ids:
            guest_entry = {
                "user_id": guest_id,
                "team_size": request.team_size,
                "region": request.region,
                "is_leader": False,
                "leader_id": current_user.user_id,
                "status": "waiting",
                "joined_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(seconds=120)
            }
            await db.matchmaking_queue.insert_one(guest_entry)
        
        logger.info(f"User {current_user.user_id} joined {request.team_size} queue with {len(request.guest_ids)} guests")
        
        # Try to find match immediately
        match_players = await find_match(request.team_size, request.region, db)
        if match_players:
            match_id = await create_battle_match(match_players, request.team_size, db)
            # In real implementation, would send realtime notifications here
            logger.info(f"Match found immediately: {match_id}")
        
        return {
            "success": True,
            "message": "Joined matchmaking queue",
            "in_queue": True,
            "team_size": request.team_size
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Queue join error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/leave")
async def leave_queue(req: Request):
    """Leave the matchmaking queue"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Remove from queue
        result = await db.matchmaking_queue.delete_many({
            "$or": [
                {"user_id": current_user.user_id, "status": "waiting"},
                {"leader_id": current_user.user_id, "status": "waiting"}
            ]
        })
        
        logger.info(f"User {current_user.user_id} left queue, removed {result.deleted_count} entries")
        
        return {
            "success": True,
            "message": "Left matchmaking queue"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Queue leave error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queue/status")
async def get_queue_status(req: Request):
    """Get current queue status for user"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Check if in queue
        queue_entry = await db.matchmaking_queue.find_one({
            "user_id": current_user.user_id,
            "status": "waiting"
        })
        
        if not queue_entry:
            return QueueStatus(in_queue=False)
        
        # Calculate position and wait time
        wait_time = (datetime.now(timezone.utc) - queue_entry["joined_at"]).seconds
        
        # Count position (how many waiting before this user)
        position = await db.matchmaking_queue.count_documents({
            "team_size": queue_entry["team_size"],
            "region": queue_entry["region"],
            "status": "waiting",
            "joined_at": {"$lt": queue_entry["joined_at"]}
        })
        
        estimated_wait = "< 30s" if position < 2 else "< 60s" if position < 5 else "1-2 min"
        
        return QueueStatus(
            in_queue=True,
            team_size=queue_entry["team_size"],
            position=position + 1,
            wait_time_seconds=wait_time,
            estimated_wait=estimated_wait
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Queue status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/match/{match_id}")
async def get_match_details(match_id: str, req: Request):
    """Get details of a specific battle match"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Get match
        match = await db.battle_matches.find_one({"match_id": match_id}, {"_id": 0})
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Get participants
        participants = await db.battle_participants.find(
            {"match_id": match_id},
            {"_id": 0}
        ).to_list(100)
        
        # Organize by team
        team_a = [p for p in participants if p["team"] == "team_a"]
        team_b = [p for p in participants if p["team"] == "team_b"]
        
        # Find user's team
        user_team = None
        for p in participants:
            if p["user_id"] == current_user.user_id:
                user_team = p["team"]
                break
        
        return {
            "match": match,
            "your_team": user_team,
            "team_a": team_a,
            "team_b": team_b,
            "team_a_count": len(team_a),
            "team_b_count": len(team_b)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Match details error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/match/{match_id}/ready")
async def mark_ready(match_id: str, req: Request):
    """Mark player as ready for battle"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Update participant status
        result = await db.battle_participants.update_one(
            {"match_id": match_id, "user_id": current_user.user_id},
            {"$set": {"ready": True, "status": "ready"}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Check if all players are ready
        total_participants = await db.battle_participants.count_documents({"match_id": match_id})
        ready_participants = await db.battle_participants.count_documents(
            {"match_id": match_id, "ready": True}
        )
        
        all_ready = total_participants == ready_participants
        
        if all_ready:
            # Start the battle
            await db.battle_matches.update_one(
                {"match_id": match_id},
                {
                    "$set": {
                        "status": "in_progress",
                        "started_at": datetime.now(timezone.utc)
                    }
                }
            )
            logger.info(f"Battle {match_id} started - all players ready")
        
        return {
            "success": True,
            "ready": True,
            "all_ready": all_ready,
            "message": "Battle starting!" if all_ready else "Waiting for other players..."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mark ready error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/match/{match_id}/update-score")
async def update_score(match_id: str, team: str, points: int, req: Request):
    """Update battle score (when gifts are sent)"""
    from server import db
    
    try:
        # Validate team
        if team not in ["team_a", "team_b"]:
            raise HTTPException(status_code=400, detail="Invalid team")
        
        # Update score
        field = f"{team}_score"
        await db.battle_matches.update_one(
            {"match_id": match_id},
            {"$inc": {field: points}}
        )
        
        # Get updated match
        match = await db.battle_matches.find_one({"match_id": match_id}, {"_id": 0})
        
        return {
            "success": True,
            "team_a_score": match["team_a_score"],
            "team_b_score": match["team_b_score"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update score error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/match/{match_id}/end")
async def end_battle(match_id: str, req: Request):
    """End a battle and determine winner"""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(req)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Get match
        match = await db.battle_matches.find_one({"match_id": match_id})
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Determine winner
        team_a_score = match["team_a_score"]
        team_b_score = match["team_b_score"]
        
        if team_a_score > team_b_score:
            winner = "team_a"
        elif team_b_score > team_a_score:
            winner = "team_b"
        else:
            winner = "tie"
        
        # Update match
        await db.battle_matches.update_one(
            {"match_id": match_id},
            {
                "$set": {
                    "status": "completed",
                    "winner": winner,
                    "ended_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Update participants
        await db.battle_participants.update_many(
            {"match_id": match_id},
            {"$set": {"status": "completed"}}
        )
        
        # Get participants for XP update
        participants = await db.battle_participants.find({"match_id": match_id}).to_list(100)
        
        # Award XP to participants
        xp_awards = {
            "win": 100,
            "loss": 50,
            "tie": 75
        }
        
        for participant in participants:
            user_id = participant["user_id"]
            team = participant["team"]
            
            # Determine XP amount
            if winner == "tie":
                xp_amount = xp_awards["tie"]
                result = "tie"
            elif winner == team:
                xp_amount = xp_awards["win"]
                result = "win"
            else:
                xp_amount = xp_awards["loss"]
                result = "loss"
            
            # Award XP to user (assumes users collection exists with XP tracking)
            await db.users.update_one(
                {"user_id": user_id},
                {
                    "$inc": {
                        "total_xp": xp_amount,
                        "battle_wins": 1 if result == "win" else 0,
                        "battle_total": 1
                    }
                },
                upsert=True
            )
            
            logger.info(f"Awarded {xp_amount} XP to {user_id} for battle {result}")
        
        logger.info(f"Battle {match_id} ended, winner: {winner}")
        
        return {
            "success": True,
            "winner": winner,
            "final_score": {
                "team_a": team_a_score,
                "team_b": team_b_score
            },
            "xp_awarded": True,
            "message": "Battle completed!",
            "match_duration": (datetime.now(timezone.utc) - match["started_at"]).seconds if match.get("started_at") else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"End battle error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
