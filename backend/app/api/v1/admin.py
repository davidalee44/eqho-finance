"""
Admin endpoints for user management and impersonation
Restricted to admin and super_admin roles only
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from ...services.auth import require_admin
from ...services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


class UserProfile(BaseModel):
    """User profile for impersonation selection"""
    id: str
    email: str
    full_name: Optional[str] = None
    company: Optional[str] = None
    role: str
    app_access: Optional[list[str]] = None
    created_at: Optional[datetime] = None


class UsersListResponse(BaseModel):
    """Response for user listing endpoint"""
    users: list[UserProfile]
    total: int


@router.get("/users", response_model=UsersListResponse)
async def list_users(
    role_filter: Optional[str] = Query(None, description="Filter by role (investor, sales, admin)"),
    exclude_admins: bool = Query(True, description="Exclude admin/super_admin users from results"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of users to return"),
    admin_user_id: str = Depends(require_admin)
):
    """
    List all users for impersonation selection
    Admin only - returns user profiles without sensitive data
    
    By default excludes admin users (you don't need to impersonate yourself)
    """
    client = SupabaseService.client
    if not client:
        SupabaseService.connect()
        client = SupabaseService.client
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection unavailable"
        )

    try:
        # Query auth.users table using admin API
        # This requires service_role key which Supabase Python client uses
        logger.info(f"Admin {admin_user_id} requesting user list")
        
        # Use Supabase admin API to list users
        users_response = client.auth.admin.list_users()
        
        if not users_response:
            return UsersListResponse(users=[], total=0)
        
        users = []
        for user in users_response:
            user_meta = user.user_metadata or {}
            role = user_meta.get('role', 'investor')
            
            # Filter by role if specified
            if role_filter and role != role_filter:
                continue
            
            # Exclude admins if requested (default behavior for impersonation)
            if exclude_admins and role in ['admin', 'super_admin']:
                continue
            
            users.append(UserProfile(
                id=str(user.id),
                email=user.email,
                full_name=user_meta.get('full_name'),
                company=user_meta.get('company'),
                role=role,
                app_access=user_meta.get('app_access', ['investor-deck']),
                created_at=user.created_at
            ))
        
        # Sort by email for consistent ordering
        users.sort(key=lambda u: u.email.lower())
        
        # Apply limit
        users = users[:limit]
        
        logger.info(f"Returning {len(users)} users to admin {admin_user_id}")
        return UsersListResponse(users=users, total=len(users))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list users: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )


@router.get("/users/{user_id}", response_model=UserProfile)
async def get_user(
    user_id: str,
    admin_user_id: str = Depends(require_admin)
):
    """
    Get a single user's profile by ID
    Admin only
    """
    client = SupabaseService.client
    if not client:
        SupabaseService.connect()
        client = SupabaseService.client
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection unavailable"
        )

    try:
        logger.info(f"Admin {admin_user_id} requesting user {user_id}")
        
        # Get user by ID using admin API
        user = client.auth.admin.get_user_by_id(user_id)
        
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_data = user.user
        user_meta = user_data.user_metadata or {}
        
        return UserProfile(
            id=str(user_data.id),
            email=user_data.email,
            full_name=user_meta.get('full_name'),
            company=user_meta.get('company'),
            role=user_meta.get('role', 'investor'),
            app_access=user_meta.get('app_access', ['investor-deck']),
            created_at=user_data.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user: {str(e)}"
        )

