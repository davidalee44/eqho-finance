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
        logger.warning("Authentication attempt with missing or invalid authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    logger.debug(f"Attempting to validate JWT token (length: {len(token)})")
    
    try:
        # Verify token with Supabase
        client = SupabaseService.client
        if not client:
            logger.info("Supabase client not initialized, attempting connection")
            SupabaseService.connect()
            client = SupabaseService.client
        
        if not client:
            logger.error("Failed to establish Supabase connection for auth")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection unavailable"
            )
        
        # Get user from token
        logger.debug("Fetching user from Supabase with token")
        user = client.auth.get_user(token)
        
        if not user or not user.user:
            logger.warning("Token validation failed: invalid or expired token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        logger.info(f"Successfully authenticated user: {user.user.id}")
        return user.user.id
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating token: {e}", exc_info=True)
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
    logger.debug(f"Fetching role for user: {user_id}")
    try:
        client = SupabaseService.client
        if not client:
            logger.info("Supabase client not initialized, attempting connection")
            SupabaseService.connect()
            client = SupabaseService.client
        
        if not client:
            logger.error("Failed to establish Supabase connection for role fetch")
            return None
        
        # Fetch user metadata
        user = client.auth.admin.get_user_by_id(user_id)
        
        if user and user.user:
            role = user.user.user_metadata.get('role')
            logger.info(f"User {user_id} has role: {role}")
            return role
        
        logger.warning(f"No user found for ID: {user_id}")
        return None
    
    except Exception as e:
        logger.error(f"Error fetching user role for {user_id}: {e}", exc_info=True)
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
    logger.debug(f"Checking admin access for user: {user_id}")
    role = await get_user_role(user_id)
    
    if role not in ['admin', 'super_admin']:
        logger.warning(f"User {user_id} attempted admin access with insufficient role: {role}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    logger.info(f"Admin access granted to user {user_id} with role: {role}")
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

