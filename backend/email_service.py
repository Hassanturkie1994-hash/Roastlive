from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class EmailDeliveryError(Exception):
    pass

# For testing, we'll use a mock mode if no API key is provided
SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY', 'TEST_MODE')
SENDER_EMAIL = os.getenv('SENDER_EMAIL', 'noreply@roastlive.app')

def send_email(to: str, subject: str, content: str, content_type: str = "html") -> bool:
    """
    Send email via SendGrid
    
    Args:
        to: Recipient email address
        subject: Email subject line
        content: Email content (HTML or plain text)
        content_type: "html" or "plain"
    """
    # MOCK MODE for testing
    if SENDGRID_API_KEY == 'TEST_MODE':
        logger.info(f"📧 MOCK EMAIL SENT:")
        logger.info(f"   To: {to}")
        logger.info(f"   Subject: {subject}")
        logger.info(f"   Content Preview: {content[:100]}...")
        return True
    
    message = Mail(
        from_email=SENDER_EMAIL,
        to_emails=to,
        subject=subject,
        html_content=content if content_type == "html" else None,
        plain_text_content=content if content_type == "plain" else None
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"Email sent successfully to {to}")
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise EmailDeliveryError(f"Failed to send email: {str(e)}")

def send_welcome_email(user_email: str, user_name: str) -> bool:
    """Send welcome email to new users"""
    subject = "Welcome to Roast Live! 🎉"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to Roast Live!</h1>
            </div>
            
            <div style="padding: 30px 20px;">
                <h2>Hey {user_name}! 👋</h2>
                
                <p>We're thrilled to have you join our community of creators and viewers!</p>
                
                <h3>Get Started:</h3>
                <ul style="line-height: 1.8;">
                    <li>🎥 <strong>Go Live:</strong> Start your first stream and connect with your audience</li>
                    <li>⚔️ <strong>Battle Mode:</strong> Challenge other streamers and compete for rankings</li>
                    <li>🎁 <strong>Send Gifts:</strong> Support your favorite creators with virtual gifts</li>
                    <li>🏆 <strong>Earn XP:</strong> Level up your profile and unlock exclusive badges</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://roastlive.app" 
                       style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Launch App
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    Need help? Reply to this email or check out our 
                    <a href="https://roastlive.app/help" style="color: #667eea;">Help Center</a>
                </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee;">
                <p>© 2025 Roast Live. All rights reserved.</p>
            </div>
        </body>
    </html>
    """
    
    return send_email(user_email, subject, html_content, "html")

def send_2fa_code_email(user_email: str, code: str) -> bool:
    """Send 2FA verification code email"""
    subject = "Your Roast Live Verification Code"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #667eea; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="color: white; margin: 0;">Security Verification</h1>
            </div>
            
            <div style="padding: 30px 20px;">
                <h2>Your Verification Code</h2>
                
                <p>Enter this code to complete your login:</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                    <h1 style="font-size: 48px; letter-spacing: 10px; margin: 0; color: #667eea;">{code}</h1>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    <strong>⏰ This code expires in 10 minutes.</strong>
                </p>
                
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                    If you didn't request this code, please ignore this email and ensure your account is secure.
                </p>
            </div>
        </body>
    </html>
    """
    
    return send_email(user_email, subject, html_content, "html")

def send_payout_notification(creator_email: str, creator_name: str, amount: float, currency: str = "USD") -> bool:
    """Send payout notification to creators"""
    subject = f"💰 Payout Processed: ${amount:.2f}"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #10B981; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="color: white; margin: 0;">💰 Payout Processed!</h1>
            </div>
            
            <div style="padding: 30px 20px;">
                <h2>Hey {creator_name}!</h2>
                
                <p>Good news! Your payout has been processed successfully.</p>
                
                <div style="background: #f0fdf4; border: 2px solid #10B981; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="margin: 0; color: #10B981;">Amount Transferred</h3>
                    <h1 style="margin: 10px 0; color: #047857;">${amount:.2f} {currency}</h1>
                </div>
                
                <p>The funds should arrive in your bank account within 2-5 business days.</p>
                
                <h3>Payment Details:</h3>
                <ul style="line-height: 1.8; color: #666;">
                    <li>Status: <strong style="color: #10B981;">Completed</strong></li>
                    <li>Processing Time: 2-5 business days</li>
                    <li>Method: Bank Transfer</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://roastlive.app/profile/earnings" 
                       style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        View Earnings Dashboard
                    </a>
                </div>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Questions about your payout? Contact our support team.
                </p>
            </div>
        </body>
    </html>
    """
    
    return send_email(creator_email, subject, html_content, "html")

def send_stream_notification(viewer_email: str, creator_name: str, stream_title: str) -> bool:
    """Notify followers when their favorite creator goes live"""
    subject = f"🔴 {creator_name} is LIVE!"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #EF4444; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="color: white; margin: 0;">🔴 LIVE NOW!</h1>
            </div>
            
            <div style="padding: 30px 20px;">
                <h2>{creator_name} just went live!</h2>
                
                <div style="background: #fef2f2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
                    <h3 style="margin: 0; color: #991b1b;">{stream_title}</h3>
                </div>
                
                <p>Don't miss out! Join the stream now and be part of the action.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://roastlive.app/live" 
                       style="background: #EF4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        🎥 Watch Stream
                    </a>
                </div>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Don't want these notifications? You can manage your preferences in app settings.
                </p>
            </div>
        </body>
    </html>
    """
    
    return send_email(viewer_email, subject, html_content, "html")
