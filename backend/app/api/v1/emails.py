"""
Email API endpoints
Handles sending transactional emails via Resend
"""


from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.services.email_service import EmailService

router = APIRouter()


class InvestorInviteRequest(BaseModel):
    """Request model for investor invitation"""
    to_email: EmailStr
    investor_name: str
    invite_url: str


class WelcomeEmailRequest(BaseModel):
    """Request model for welcome email"""
    to_email: EmailStr
    user_name: str


class DealUpdateRequest(BaseModel):
    """Request model for deal update"""
    to_email: EmailStr
    update_title: str
    update_content: str


class AccessNotificationRequest(BaseModel):
    """Request model for access notification"""
    admin_email: EmailStr
    user_email: EmailStr
    user_name: str
    user_role: str


@router.post("/invite-investor")
async def send_investor_invite(request: InvestorInviteRequest):
    """
    Send investor invitation email
    
    Example:
        POST /api/v1/emails/invite-investor
        {
            "to_email": "investor@vc-firm.com",
            "investor_name": "John Smith",
            "invite_url": "https://eqho-due-diligence.vercel.app"
        }
    """
    try:
        result = EmailService.send_investor_invite(
            to_email=request.to_email,
            investor_name=request.investor_name,
            invite_url=request.invite_url
        )

        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])

        return {
            "success": True,
            "message": f"Invitation sent to {request.to_email}",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/welcome")
async def send_welcome_email(request: WelcomeEmailRequest):
    """
    Send welcome email after successful signup
    
    Example:
        POST /api/v1/emails/welcome
        {
            "to_email": "investor@vc-firm.com",
            "user_name": "John Smith"
        }
    """
    try:
        result = EmailService.send_welcome_email(
            to_email=request.to_email,
            user_name=request.user_name
        )

        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])

        return {
            "success": True,
            "message": f"Welcome email sent to {request.to_email}",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/deal-update")
async def send_deal_update(request: DealUpdateRequest):
    """
    Send deal update to investor
    
    Example:
        POST /api/v1/emails/deal-update
        {
            "to_email": "investor@vc-firm.com",
            "update_title": "Q4 Growth Metrics",
            "update_content": "<p>We hit 15% M/M growth...</p>"
        }
    """
    try:
        result = EmailService.send_deal_update(
            to_email=request.to_email,
            update_title=request.update_title,
            update_content=request.update_content
        )

        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])

        return {
            "success": True,
            "message": f"Update sent to {request.to_email}",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/access-notification")
async def send_access_notification(request: AccessNotificationRequest):
    """
    Notify admin when someone accesses the deck
    
    Example:
        POST /api/v1/emails/access-notification
        {
            "admin_email": "david@eqho.ai",
            "user_email": "investor@vc-firm.com",
            "user_name": "John Smith",
            "user_role": "investor"
        }
    """
    try:
        result = EmailService.send_deck_access_notification(
            admin_email=request.admin_email,
            user_email=request.user_email,
            user_name=request.user_name,
            user_role=request.user_role
        )

        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])

        return {
            "success": True,
            "message": f"Notification sent to {request.admin_email}",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test")
async def test_email():
    """
    Test endpoint to verify email service is working
    
    Returns API configuration status
    """
    return {
        "resend_configured": bool(EmailService.RESEND_API_KEY),
        "from_email": EmailService.FROM_EMAIL,
        "status": "Email service ready" if EmailService.RESEND_API_KEY else "RESEND_API_KEY not set"
    }

