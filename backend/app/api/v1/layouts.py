"""
Card layout management endpoints
Handles fetching and updating dashboard card layouts
"""
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ...services.auth import get_current_user, require_admin
from ...services.supabase_service import SupabaseService

router = APIRouter(prefix="/layouts", tags=["layouts"])


class LayoutData(BaseModel):
    layout_data: list[dict[str, Any]]


class LayoutResponse(BaseModel):
    id: str
    layout_data: list[dict[str, Any]]
    updated_by: Optional[str]
    updated_at: datetime
    created_at: datetime


@router.get("", response_model=LayoutResponse)
async def get_layout(user_id: str = Depends(get_current_user)):
    """
    Fetch the current card layout configuration
    Available to all authenticated users
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
        # Fetch the single layout row (should only be one)
        response = client.table("card_layouts").select("*").limit(1).execute()

        if not response.data or len(response.data) == 0:
            # If no layout exists, create default empty layout
            default_layout = {"layout_data": []}
            insert_response = client.table("card_layouts").insert(default_layout).execute()
            return LayoutResponse(**insert_response.data[0])

        return LayoutResponse(**response.data[0])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch layout: {str(e)}"
        )


@router.put("", response_model=LayoutResponse)
async def update_layout(
    layout: LayoutData,
    user_id: str = Depends(require_admin)
):
    """
    Update the card layout configuration
    Admin only - changes apply to all users
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
        # Get the current layout ID (should only be one row)
        current = client.table("card_layouts").select("id").limit(1).execute()

        if not current.data or len(current.data) == 0:
            # Create new layout if none exists
            insert_data = {
                "layout_data": layout.layout_data,
                "updated_by": user_id
            }
            response = client.table("card_layouts").insert(insert_data).execute()
        else:
            # Update existing layout
            layout_id = current.data[0]["id"]
            update_data = {
                "layout_data": layout.layout_data,
                "updated_by": user_id,
                "updated_at": datetime.utcnow().isoformat()
            }
            response = client.table("card_layouts").update(update_data).eq("id", layout_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update layout"
            )

        return LayoutResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update layout: {str(e)}"
        )

