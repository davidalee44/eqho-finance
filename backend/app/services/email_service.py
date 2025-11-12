"""
Email Service using Resend API
Handles all transactional emails for Eqho Investor Deck
"""

import os
import requests
from typing import Optional, Dict, Any


class EmailService:
    """Service for sending emails via Resend API"""
    
    RESEND_API_KEY = os.getenv('RESEND_API_KEY')
    RESEND_API_URL = 'https://api.resend.com/emails'
    FROM_EMAIL = 'Eqho Investor Relations <investors@eqho.ai>'
    
    @classmethod
    def send_investor_invite(
        cls,
        to_email: str,
        investor_name: str,
        invite_url: str
    ) -> Dict[str, Any]:
        """
        Send investor invitation email with access link
        
        Args:
            to_email: Investor's email address
            investor_name: Investor's full name
            invite_url: Link to create account / sign in
        """
        subject = "You're Invited: Eqho $500K Seed Round"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🚀 Eqho</h1>
                <p style="color: white; margin: 10px 0 0 0;">Investor Relations</p>
            </div>
            
            <div style="background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Hi {investor_name},</h2>
                
                <p>You've been invited to review Eqho's confidential investor deck for our <strong>$500K seed round</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #667eea; margin-top: 0;">Investment Opportunity Highlights:</h3>
                    <ul style="color: #555;">
                        <li><strong>$500K Seed Round</strong> | $4M pre-money valuation</li>
                        <li><strong>TowPilot Product:</strong> $831 CAC, $14.1K LTV, 17x ratio</li>
                        <li><strong>Growth:</strong> 10% M/M to 6-month breakeven</li>
                        <li><strong>Margins:</strong> 69% → 82% gross margin trajectory</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{invite_url}" 
                       style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Access Investor Deck →
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    This is a confidential invitation. Please do not share this link.
                </p>
                
                <div style="border-top: 2px solid #ddd; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
                    <p>Eqho, LLC | Confidential Investment Opportunity</p>
                    <p>If you have questions, reply to this email or contact us at investors@eqho.ai</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return cls._send_email(to_email, subject, html_content)
    
    @classmethod
    def send_welcome_email(
        cls,
        to_email: str,
        user_name: str
    ) -> Dict[str, Any]:
        """
        Send welcome email after successful signup
        
        Args:
            to_email: User's email address
            user_name: User's full name
        """
        subject = "Welcome to Eqho Investor Portal"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to Eqho, {user_name}!</h2>
            
            <p>Your account has been successfully created. You now have access to our confidential investor deck.</p>
            
            <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">What's Inside:</h3>
                <ul>
                    <li><strong>Executive Summary</strong> - Company overview and key metrics</li>
                    <li><strong>Financial Performance</strong> - Revenue, margins, and projections</li>
                    <li><strong>Market Position</strong> - Competitive analysis</li>
                    <li><strong>Growth Strategy</strong> - 6-month path to breakeven</li>
                    <li><strong>Product Roadmap</strong> - TowPilot feature pipeline</li>
                    <li><strong>Investment Terms</strong> - $500K seed round details</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://eqho-due-diligence.vercel.app" 
                   style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    View Investor Deck →
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                This information is confidential. Please do not share without authorization.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
                Questions? Contact us at investors@eqho.ai
            </p>
        </body>
        </html>
        """
        
        return cls._send_email(to_email, subject, html_content)
    
    @classmethod
    def send_deck_access_notification(
        cls,
        admin_email: str,
        user_email: str,
        user_name: str,
        user_role: str
    ) -> Dict[str, Any]:
        """
        Notify admin when someone accesses the deck
        
        Args:
            admin_email: Admin's email address
            user_email: User who accessed the deck
            user_name: User's full name
            user_role: User's role (investor/sales/admin)
        """
        subject = f"New Access: {user_name} viewed Investor Deck"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>🔔 Investor Deck Access Notification</h2>
            
            <p>A user has accessed the Eqho Investor Deck:</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Name:</strong> {user_name}</p>
                <p><strong>Email:</strong> {user_email}</p>
                <p><strong>Role:</strong> {user_role}</p>
                <p><strong>Time:</strong> {cls._get_timestamp()}</p>
            </div>
            
            <p>View all access logs in <a href="https://supabase.com/dashboard/project/yindsqbhygvskolbccqq/auth/users">Supabase Dashboard</a></p>
        </body>
        </html>
        """
        
        return cls._send_email(admin_email, subject, html_content)
    
    @classmethod
    def send_deal_update(
        cls,
        to_email: str,
        update_title: str,
        update_content: str
    ) -> Dict[str, Any]:
        """
        Send deal update to investors
        
        Args:
            to_email: Investor's email
            update_title: Update title
            update_content: Update content (supports HTML)
        """
        subject = f"Eqho Update: {update_title}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #667eea; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">Eqho Investor Update</h1>
            </div>
            
            <div style="background: #f7f7f7; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #333;">{update_title}</h2>
                
                <div style="color: #555;">
                    {update_content}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://eqho-due-diligence.vercel.app" 
                       style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        View Latest Deck →
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    Eqho, LLC | investors@eqho.ai
                </p>
            </div>
        </body>
        </html>
        """
        
        return cls._send_email(to_email, subject, html_content)
    
    @classmethod
    def _send_email(
        cls,
        to: str,
        subject: str,
        html: str
    ) -> Dict[str, Any]:
        """
        Internal method to send email via Resend API
        
        Args:
            to: Recipient email address
            subject: Email subject
            html: HTML content
        
        Returns:
            API response dict
        """
        if not cls.RESEND_API_KEY:
            raise ValueError("RESEND_API_KEY not set in environment")
        
        headers = {
            'Authorization': f'Bearer {cls.RESEND_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'from': cls.FROM_EMAIL,
            'to': [to],
            'subject': subject,
            'html': html
        }
        
        try:
            response = requests.post(
                cls.RESEND_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error sending email: {e}")
            return {'error': str(e)}
    
    @classmethod
    def _get_timestamp(cls) -> str:
        """Get formatted timestamp for emails"""
        from datetime import datetime
        return datetime.now().strftime('%B %d, %Y at %I:%M %p')

