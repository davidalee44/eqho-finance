"""
Authentication and authorization service
Handles user role verification and JWT token validation
"""
import logging
from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from supabase import Client
from app.services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """
    Extract and validate user ID from JWT token
    
    Args:
        authorization: Bearer token from Authorization header
    
    Returns:
        user_id: The authenticated user's ID
    
    Raises:
        HTTPException: If token is invalid or missing
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # Verify token with Supabase
        client = SupabaseService.client
        if not client:
            SupabaseService.connect()
            client = SupabaseService.client
        
        if not client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection unavailable"
            )
        
        # Get user from token
        user = client.auth.get_user(token)
        
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        return user.user.id
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


async def get_user_role(user_id: str) -> Optional[str]:
    """
    Get user role from user metadata
    
    Args:
        user_id: The user's ID
    
    Returns:
        role: User role (admin, super_admin, investor, office) or None
    """
    try:
        client = SupabaseService.client
        if not client:
            SupabaseService.connect()
            client = SupabaseService.client
        
        if not client:
            return None
        
        # Fetch user metadata
        user = client.auth.admin.get_user_by_id(user_id)
        
        if user and user.user:
            return user.user.user_metadata.get('role')
        
        return None
    
    except Exception as e:
        logger.error(f"Error fetching user role: {e}")
        return None


async def require_admin(user_id: str = Depends(get_current_user)) -> str:
    """
    Dependency that requires admin or super_admin role
    
    Args:
        user_id: The authenticated user's ID (from get_current_user)
    
    Returns:
        user_id: The authenticated admin user's ID
    
    Raises:
        HTTPException: If user is not an admin
    """
    role = await get_user_role(user_id)
    
    if role not in ['admin', 'super_admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return user_id


def is_admin_role(role: Optional[str]) -> bool:
    """
    Check if a role is an admin role
    
    Args:
        role: User role string
    
    Returns:
        bool: True if role is admin or super_admin
    """
    return role in ['admin', 'super_admin']

