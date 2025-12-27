from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import pyotp
import qrcode
import io
import base64
import secrets
import hashlib
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/2fa", tags=["two-factor-auth"])

# Models
class TwoFactorSetup(BaseModel):
    secret: str
    backup_codes: List[str]
    qr_code_url: str

class TOTPVerification(BaseModel):
    otp_code: str

class BackupCodeVerification(BaseModel):
    backup_code: str

# Helper functions
def generate_backup_codes(count: int = 10) -> List[str]:
    """Generate secure backup codes for account recovery."""
    codes = set()
    while len(codes) < count:
        code = secrets.token_hex(4).upper()
        codes.add(code)
    return list(codes)

def hash_backup_code(code: str) -> str:
    """Hash backup code for secure storage."""
    return hashlib.sha256(code.encode()).hexdigest()

def verify_totp_with_tolerance(secret: str, code: str, tolerance: int = 1) -> bool:
    """Verify TOTP with time window tolerance."""
    totp = pyotp.TOTP(secret)
    current_time = int(pyotp.time.time() / 30)
    
    for time_offset in range(-tolerance, tolerance + 1):
        check_time = current_time + time_offset
        if totp.verify(code, time=check_time * 30):
            return True
    return False

# Routes
@router.post("/generate", response_model=TwoFactorSetup)
async def generate_2fa_secret(request: Request):
    """
    Generate TOTP secret and backup codes for the current user.
    Returns QR code and backup codes for setup in authenticator app.
    """
    from auth import get_current_user
    from server import db
    
    try:
        # Get current user
        current_user = await get_current_user(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Generate new secret
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        
        # Generate provisioning URI for QR code
        provisioning_uri = totp.provisioning_uri(
            name=current_user.email,
            issuer_name="RoastLive"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Convert to base64 for response
        qr_code_b64 = base64.b64encode(img_byte_arr.getvalue()).decode()
        qr_code_url = f"data:image/png;base64,{qr_code_b64}"
        
        # Generate backup codes
        backup_codes = generate_backup_codes(10)
        
        # Store temporary secret and backup codes (not yet activated)
        # These will be saved only after TOTP verification
        await db.temp_2fa_setup.update_one(
            {"user_id": current_user.user_id},
            {
                "$set": {
                    "secret": secret,
                    "backup_codes": backup_codes,
                    "created_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15)
                }
            },
            upsert=True
        )
        
        logger.info(f"2FA setup initiated for user {current_user.user_id}")
        
        return TwoFactorSetup(
            secret=secret,
            backup_codes=backup_codes,
            qr_code_url=qr_code_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate 2FA setup")

@router.post("/verify")
async def verify_totp_code(verification: TOTPVerification, request: Request):
    """
    Verify TOTP code during login or 2FA setup confirmation.
    Implements time window tolerance for clock skew compensation.
    """
    from auth import get_current_user
    from server import db
    
    try:
        # Get current user
        current_user = await get_current_user(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Get temporary setup data if during setup
        temp_setup = await db.temp_2fa_setup.find_one(
            {"user_id": current_user.user_id}
        )
        
        if temp_setup:
            secret = temp_setup["secret"]
            backup_codes = temp_setup["backup_codes"]
            
            # Verify expiration (normalize timezone-naive datetimes)
            expires_at = temp_setup["expires_at"]
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if datetime.now(timezone.utc) > expires_at:
                await db.temp_2fa_setup.delete_one(
                    {"user_id": current_user.user_id}
                )
                raise HTTPException(status_code=400, detail="2FA setup expired. Please restart.")
        else:
            # Get existing secret if already setup
            user_doc = await db.users.find_one(
                {"user_id": current_user.user_id},
                {"_id": 0}
            )
            if not user_doc or not user_doc.get("otp_secret"):
                raise HTTPException(status_code=400, detail="2FA not setup for this user")
            secret = user_doc["otp_secret"]
            backup_codes = user_doc.get("backup_codes", [])
        
        # Verify TOTP code with time window tolerance
        code_valid = verify_totp_with_tolerance(secret, verification.otp_code)
        
        if not code_valid:
            logger.warning(f"Invalid TOTP code attempt for user {current_user.user_id}")
            raise HTTPException(status_code=401, detail="Invalid TOTP code")
        
        # If this is the first verification (setup phase)
        if temp_setup:
            # Hash backup codes before storage
            hashed_codes = [hash_backup_code(code) for code in backup_codes]
            
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {
                    "$set": {
                        "otp_secret": secret,
                        "backup_codes": hashed_codes,
                        "backup_codes_used": [],
                        "is_2fa_enabled": True,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Clean up temporary setup
            await db.temp_2fa_setup.delete_one(
                {"user_id": current_user.user_id}
            )
            
            logger.info(f"2FA enabled successfully for user {current_user.user_id}")
            
            return {
                "message": "2FA enabled successfully",
                "backup_codes": backup_codes,
                "warning": "Store your backup codes in a secure location"
            }
        
        # If during login
        logger.info(f"TOTP verified successfully for user {current_user.user_id}")
        return {
            "message": "TOTP verified successfully",
            "2fa_verified": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TOTP verification error: {e}")
        raise HTTPException(status_code=500, detail="TOTP verification failed")

@router.post("/backup-code/verify")
async def verify_backup_code(verification: BackupCodeVerification, request: Request):
    """
    Verify backup code for authentication when primary device is unavailable.
    Each backup code can only be used once.
    """
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user_doc = await db.users.find_one(
            {"user_id": current_user.user_id},
            {"_id": 0}
        )
        
        if not user_doc or not user_doc.get("is_2fa_enabled"):
            raise HTTPException(status_code=400, detail="2FA not enabled for this user")
        
        backup_codes = user_doc.get("backup_codes", [])
        used_codes = user_doc.get("backup_codes_used", [])
        
        # Hash the provided code for comparison
        provided_code_hash = hash_backup_code(verification.backup_code.upper())
        
        # Check if code exists and hasn't been used
        if provided_code_hash not in backup_codes:
            logger.warning(f"Invalid backup code attempt for user {current_user.user_id}")
            raise HTTPException(status_code=401, detail="Invalid backup code")
        
        if provided_code_hash in used_codes:
            logger.warning(f"Backup code reuse attempt for user {current_user.user_id}")
            raise HTTPException(status_code=401, detail="Backup code already used")
        
        # Mark code as used
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {
                "$push": {"backup_codes_used": provided_code_hash},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        remaining_codes = len(backup_codes) - len(used_codes) - 1
        
        logger.info(f"Backup code verified for user {current_user.user_id}, {remaining_codes} remaining")
        
        return {
            "message": "Backup code verified successfully",
            "2fa_verified": True,
            "remaining_backup_codes": remaining_codes,
            "warning": "Only one backup code remaining" if remaining_codes == 1 else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Backup code verification error: {e}")
        raise HTTPException(status_code=500, detail="Backup code verification failed")

@router.post("/disable")
async def disable_2fa(request: Request):
    """Disable 2FA for the current user."""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Clear 2FA data
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {
                "$set": {
                    "is_2fa_enabled": False,
                    "updated_at": datetime.now(timezone.utc)
                },
                "$unset": {
                    "otp_secret": "",
                    "backup_codes": "",
                    "backup_codes_used": ""
                }
            }
        )
        
        logger.info(f"2FA disabled for user {current_user.user_id}")
        
        return {"message": "2FA disabled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA disable error: {e}")
        raise HTTPException(status_code=500, detail="Failed to disable 2FA")

@router.get("/status")
async def get_2fa_status(request: Request):
    """Check if 2FA is enabled for the current user."""
    from auth import get_current_user
    from server import db
    
    try:
        current_user = await get_current_user(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user_doc = await db.users.find_one(
            {"user_id": current_user.user_id},
            {"_id": 0, "is_2fa_enabled": 1, "backup_codes": 1, "backup_codes_used": 1}
        )
        
        is_enabled = user_doc.get("is_2fa_enabled", False) if user_doc else False
        
        remaining_codes = 0
        if is_enabled and user_doc:
            total_codes = len(user_doc.get("backup_codes", []))
            used_codes = len(user_doc.get("backup_codes_used", []))
            remaining_codes = total_codes - used_codes
        
        return {
            "is_2fa_enabled": is_enabled,
            "remaining_backup_codes": remaining_codes if is_enabled else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA status check error: {e}")
        raise HTTPException(status_code=500, detail="Failed to check 2FA status")
