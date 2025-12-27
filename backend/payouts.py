from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from typing import Optional
import stripe
import os
import logging
from email_service import send_payout_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payouts", tags=["payouts"])

# Configure Stripe (using test mode for now)
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', 'sk_test_MOCK_KEY')
stripe.api_key = STRIPE_SECRET_KEY

# MOCK MODE if no real key
MOCK_MODE = STRIPE_SECRET_KEY == 'sk_test_MOCK_KEY'

# Models
class CreatorOnboarding(BaseModel):
    email: EmailStr
    country: str = "US"
    business_type: str = "individual"  # individual or company

class PaymentRequest(BaseModel):
    creator_id: str
    amount_cents: int
    currency: str = "usd"
    customer_email: str
    description: str

class PayoutRequest(BaseModel):
    creator_id: str

# Helper functions
async def get_creator_from_db(creator_id: str):
    """Get creator from database."""
    from server import db
    creator = await db.creators.find_one(
        {"platform_user_id": creator_id},
        {"_id": 0}
    )
    return creator

# Routes
@router.post("/creators/register")
async def register_creator(onboarding: CreatorOnboarding, request: Request):
    """Register a new creator and create Stripe Connect account."""
    from auth import get_current_user
    from server import db
    
    try:
        # Get current user
        current_user = await get_current_user(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Check if creator already exists
        existing = await db.creators.find_one({
            "platform_user_id": current_user.user_id
        })
        if existing:
            raise HTTPException(status_code=400, detail="Creator already registered")
        
        if MOCK_MODE:
            # MOCK: Simulate Stripe account creation
            account_id = f"acct_MOCK_{current_user.user_id}"
            logger.info(f"📊 MOCK: Created Stripe Connect account {account_id}")
        else:
            # Create Stripe Connect account
            account = stripe.Account.create(
                type="express",
                country=onboarding.country,
                email=onboarding.email,
                business_type=onboarding.business_type,
            )
            account_id = account.id
        
        # Store creator record
        creator_doc = {
            "platform_user_id": current_user.user_id,
            "email": onboarding.email,
            "stripe_connect_account_id": account_id,
            "onboarding_completed": MOCK_MODE,  # Auto-complete in mock mode
            "charges_enabled": MOCK_MODE,
            "payouts_enabled": MOCK_MODE,
            "country": onboarding.country,
            "business_type": onboarding.business_type,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        result = await db.creators.insert_one(creator_doc)
        
        logger.info(f"Creator registered: {current_user.user_id}")
        
        return {
            "creator_id": current_user.user_id,
            "stripe_account_id": account_id,
            "onboarding_url": f"/api/payouts/creators/{account_id}/onboard" if not MOCK_MODE else None,
            "mock_mode": MOCK_MODE
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Creator registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/creators/{account_id}/onboard")
async def start_onboarding(account_id: str):
    """Start Stripe Connect onboarding flow."""
    if MOCK_MODE:
        return {"message": "MOCK: Onboarding auto-completed", "mock_mode": True}
    
    try:
        # Create account link for hosted onboarding
        account_link = stripe.AccountLink.create(
            account=account_id,
            type="account_onboarding",
            refresh_url=f"{os.getenv('API_URL', 'http://localhost:8000')}/api/payouts/creators/{account_id}/refresh",
            return_url=f"{os.getenv('API_URL', 'http://localhost:8000')}/api/payouts/creators/{account_id}/complete"
        )
        
        return {"onboarding_url": account_link.url}
        
    except Exception as e:
        logger.error(f"Onboarding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payments/create")
async def create_payment(payment_request: PaymentRequest, request: Request):
    """Create a payment intent for a creator."""
    from server import db
    
    try:
        # Verify creator exists and onboarding is complete
        creator = await get_creator_from_db(payment_request.creator_id)
        if not creator or not creator.get("charges_enabled"):
            raise HTTPException(status_code=400, detail="Creator not ready to receive payments")
        
        connected_account_id = creator["stripe_connect_account_id"]
        
        if MOCK_MODE:
            # MOCK: Simulate payment creation
            payment_intent_id = f"pi_MOCK_{datetime.now().timestamp()}"
            charge_id = f"ch_MOCK_{datetime.now().timestamp()}"
            
            # Calculate fee split
            platform_fee_percent = 0.15  # 15% platform fee
            platform_fee = int(payment_request.amount_cents * platform_fee_percent)
            creator_amount = payment_request.amount_cents - platform_fee
            
            logger.info(f"💰 MOCK PAYMENT: ${payment_request.amount_cents/100:.2f}")
            logger.info(f"   Platform Fee: ${platform_fee/100:.2f}")
            logger.info(f"   Creator Gets: ${creator_amount/100:.2f}")
            
            # Record payment in database
            payment_doc = {
                "creator_id": payment_request.creator_id,
                "amount_cents": payment_request.amount_cents,
                "currency": payment_request.currency,
                "stripe_charge_id": charge_id,
                "stripe_payment_intent_id": payment_intent_id,
                "status": "succeeded",
                "customer_email": payment_request.customer_email,
                "platform_fee_cents": platform_fee,
                "creator_amount_cents": creator_amount,
                "metadata": payment_request.dict(),
                "created_at": datetime.now(timezone.utc),
                "mock_mode": True
            }
            
            await db.payments.insert_one(payment_doc)
            
            return {
                "payment_id": str(payment_doc["_id"]),
                "stripe_payment_intent_id": payment_intent_id,
                "amount": payment_request.amount_cents,
                "currency": payment_request.currency,
                "status": "succeeded",
                "mock_mode": True
            }
        
        # Real Stripe integration
        payment_intent = stripe.PaymentIntent.create(
            amount=payment_request.amount_cents,
            currency=payment_request.currency,
            description=payment_request.description,
            metadata={
                "creator_id": payment_request.creator_id,
                "platform": "roast_live"
            },
            transfer_data={
                "destination": connected_account_id
            }
        )
        
        # Record payment
        payment_doc = {
            "creator_id": payment_request.creator_id,
            "amount_cents": payment_request.amount_cents,
            "currency": payment_request.currency,
            "stripe_payment_intent_id": payment_intent.id,
            "status": "requires_payment_method",
            "customer_email": payment_request.customer_email,
            "metadata": payment_request.dict(),
            "created_at": datetime.now(timezone.utc)
        }
        
        result = await db.payments.insert_one(payment_doc)
        
        return {
            "payment_id": str(result.inserted_id),
            "client_secret": payment_intent.client_secret,
            "stripe_payment_intent_id": payment_intent.id,
            "amount": payment_request.amount_cents,
            "currency": payment_request.currency
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/creators/{creator_id}/earnings")
async def get_creator_earnings(creator_id: str, request: Request):
    """Get earnings summary for a creator."""
    from auth import get_current_user
    from server import db
    
    try:
        # Verify user is the creator or admin
        current_user = await get_current_user(request)
        if not current_user or current_user.user_id != creator_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Aggregate successful payments
        pipeline = [
            {
                "$match": {
                    "creator_id": creator_id,
                    "status": "succeeded"
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount_cents"},
                    "total_creator_amount": {"$sum": "$creator_amount_cents"},
                    "total_platform_fee": {"$sum": "$platform_fee_cents"},
                    "count": {"$sum": 1}
                }
            }
        ]
        
        result = await db.payments.aggregate(pipeline).to_list(1)
        total_earnings = result[0]["total_creator_amount"] if result else 0
        total_revenue = result[0]["total"] if result else 0
        total_fees = result[0]["total_platform_fee"] if result else 0
        count = result[0]["count"] if result else 0
        
        # Get recent payments (exclude MongoDB _id field)
        recent_payments = await db.payments.find({
            "creator_id": creator_id,
            "status": "succeeded"
        }, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
        
        return {
            "creator_id": creator_id,
            "total_earnings_cents": total_earnings,
            "total_revenue_cents": total_revenue,
            "total_platform_fees_cents": total_fees,
            "payment_count": count,
            "recent_payments": recent_payments
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Earnings fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/creators/{creator_id}/request-payout")
async def request_payout(creator_id: str, request: Request, background_tasks: BackgroundTasks):
    """Request a payout to bank account."""
    from auth import get_current_user
    from server import db
    
    try:
        # Verify user is the creator
        current_user = await get_current_user(request)
        if not current_user or current_user.user_id != creator_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        creator = await get_creator_from_db(creator_id)
        if not creator or not creator.get("payouts_enabled"):
            raise HTTPException(status_code=400, detail="Payouts not enabled")
        
        # Get earnings
        earnings_data = await get_creator_earnings(creator_id, request)
        available_amount = earnings_data["total_earnings_cents"]
        
        if available_amount <= 0:
            raise HTTPException(status_code=400, detail="No funds available for payout")
        
        if MOCK_MODE:
            # MOCK: Simulate payout
            payout_id = f"po_MOCK_{datetime.now().timestamp()}"
            
            logger.info(f"💸 MOCK PAYOUT: ${available_amount/100:.2f} to {creator['email']}")
            
            # Send notification email
            background_tasks.add_task(
                send_payout_notification,
                creator["email"],
                current_user.name,
                available_amount / 100,
                "USD"
            )
            
            return {
                "payout_id": payout_id,
                "status": "paid",
                "amount": available_amount,
                "currency": "usd",
                "mock_mode": True
            }
        
        # Real payout
        payout = stripe.Payout.create(
            amount=available_amount,
            currency="usd",
            stripe_account=creator["stripe_connect_account_id"]
        )
        
        # Send notification
        background_tasks.add_task(
            send_payout_notification,
            creator["email"],
            current_user.name,
            available_amount / 100,
            "USD"
        )
        
        return {
            "payout_id": payout.id,
            "status": payout.status,
            "amount": payout.amount,
            "currency": payout.currency
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payout request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_payout_status(request: Request):
    """Get payout status for current user."""
    from auth import get_current_user
    
    try:
        current_user = await get_current_user(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        creator = await get_creator_from_db(current_user.user_id)
        
        if not creator:
            return {
                "is_registered": False,
                "onboarding_completed": False,
                "can_receive_payments": False
            }
        
        return {
            "is_registered": True,
            "onboarding_completed": creator.get("onboarding_completed", False),
            "charges_enabled": creator.get("charges_enabled", False),
            "payouts_enabled": creator.get("payouts_enabled", False),
            "can_receive_payments": creator.get("charges_enabled", False),
            "stripe_account_id": creator.get("stripe_connect_account_id"),
            "mock_mode": MOCK_MODE
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payout status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
