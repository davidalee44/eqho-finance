"""
API endpoints for snapshot/version control functionality
"""
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.snapshot_service import SnapshotService

router = APIRouter()


class CreateSnapshotRequest(BaseModel):
    """Request model for creating a snapshot"""

    user_id: str
    snapshot_type: str  # 'financial_report', 'metrics', 'custom'
    snapshot_name: str
    data: Dict
    description: Optional[str] = None
    metadata: Optional[Dict] = None
    screenshot_url: Optional[str] = None


class UpdateSnapshotRequest(BaseModel):
    """Request model for updating a snapshot"""

    snapshot_name: Optional[str] = None
    description: Optional[str] = None
    data: Optional[Dict] = None
    metadata: Optional[Dict] = None
    screenshot_url: Optional[str] = None


@router.post("/", response_model=Dict)
async def create_snapshot(request: CreateSnapshotRequest):
    """
    Create a new snapshot for version control

    This allows users to save a point-in-time snapshot of their financial reports
    """
    try:
        snapshot = SnapshotService.create_snapshot(
            user_id=request.user_id,
            snapshot_type=request.snapshot_type,
            snapshot_name=request.snapshot_name,
            data=request.data,
            description=request.description,
            metadata=request.metadata,
            screenshot_url=request.screenshot_url,
        )
        return snapshot
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create snapshot: {str(e)}"
        )


@router.get("/", response_model=List[Dict])
async def get_snapshots(
    user_id: str = Query(..., description="User ID"),
    snapshot_type: Optional[str] = Query(None, description="Filter by snapshot type"),
    limit: int = Query(50, description="Maximum number of snapshots to return"),
):
    """
    Get all snapshots for a user

    Returns a list of snapshots, optionally filtered by type
    """
    try:
        snapshots = SnapshotService.get_snapshots(
            user_id=user_id, snapshot_type=snapshot_type, limit=limit
        )
        return snapshots
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch snapshots: {str(e)}"
        )


@router.get("/{snapshot_id}", response_model=Dict)
async def get_snapshot(
    snapshot_id: str,
    user_id: str = Query(..., description="User ID for security check"),
):
    """
    Get a specific snapshot by ID
    """
    try:
        snapshot = SnapshotService.get_snapshot(snapshot_id, user_id)
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        return snapshot
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch snapshot: {str(e)}"
        )


@router.patch("/{snapshot_id}", response_model=Dict)
async def update_snapshot(
    snapshot_id: str,
    request: UpdateSnapshotRequest,
    user_id: str = Query(..., description="User ID for security check"),
):
    """
    Update a snapshot (name, description, etc.)
    """
    try:
        updates = request.dict(exclude_unset=True)
        snapshot = SnapshotService.update_snapshot(snapshot_id, user_id, updates)
        if not snapshot:
            raise HTTPException(
                status_code=404, detail="Snapshot not found or update failed"
            )
        return snapshot
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update snapshot: {str(e)}"
        )


@router.delete("/{snapshot_id}")
async def delete_snapshot(
    snapshot_id: str,
    user_id: str = Query(..., description="User ID for security check"),
):
    """
    Delete a snapshot
    """
    try:
        success = SnapshotService.delete_snapshot(snapshot_id, user_id)
        if not success:
            raise HTTPException(
                status_code=404, detail="Snapshot not found or delete failed"
            )
        return {"message": "Snapshot deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete snapshot: {str(e)}"
        )


@router.get("/stats/summary", response_model=Dict)
async def get_snapshot_stats(
    user_id: str = Query(..., description="User ID"),
):
    """
    Get statistics about user's snapshots
    """
    try:
        stats = SnapshotService.get_snapshot_stats(user_id)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch stats: {str(e)}"
        )

