"""
Audit logging endpoints
Tracks user actions for security and compliance
"""
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ...services.auth import get_current_user, require_admin
from ...services.supabase_service import SupabaseService

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogCreate(BaseModel):
    action_type: str = Field(..., pattern="^(login|logout|layout_change|report_export|report_view|snapshot_create|snapshot_restore|impersonation_start|impersonation_end)$")
    action_data: Optional[dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    action_type: str
    action_data: Optional[dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime


class AuditLogsListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int
    page: int
    page_size: int


@router.post("/log", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
async def create_audit_log(
    log_data: AuditLogCreate,
    user_id: str = Depends(get_current_user)
):
    """
    Create an audit log entry
    Available to all authenticated users (for their own actions)
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
        insert_data = {
            "user_id": user_id,
            "action_type": log_data.action_type,
            "action_data": log_data.action_data,
            "ip_address": log_data.ip_address,
            "user_agent": log_data.user_agent
        }

        response = client.table("audit_logs").insert(insert_data).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create audit log"
            )

        return AuditLogResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create audit log: {str(e)}"
        )


@router.get("/logs", response_model=AuditLogsListResponse)
async def get_audit_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    user_id_filter: Optional[str] = Query(None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    admin_user_id: str = Depends(require_admin)
):
    """
    Fetch audit logs with pagination and filters
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
        # Build base query
        query = client.table("audit_logs").select("*", count="exact")

        # Apply filters
        if action_type:
            query = query.eq("action_type", action_type)

        if user_id_filter:
            query = query.eq("user_id", user_id_filter)

        if start_date:
            query = query.gte("created_at", start_date.isoformat())

        if end_date:
            query = query.lte("created_at", end_date.isoformat())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)

        response = query.execute()

        logs = [AuditLogResponse(**log) for log in response.data]
        total = response.count if hasattr(response, 'count') else len(logs)

        return AuditLogsListResponse(
            logs=logs,
            total=total,
            page=page,
            page_size=page_size
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audit logs: {str(e)}"
        )


@router.get("/logs/export")
async def export_audit_logs(
    action_type: Optional[str] = Query(None),
    user_id_filter: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    admin_user_id: str = Depends(require_admin)
):
    """
    Export audit logs as CSV
    Admin only
    """
    import csv
    import io

    from fastapi.responses import StreamingResponse

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
        # Build query (no pagination for export)
        query = client.table("audit_logs").select("*")

        # Apply filters
        if action_type:
            query = query.eq("action_type", action_type)
        if user_id_filter:
            query = query.eq("user_id", user_id_filter)
        if start_date:
            query = query.gte("created_at", start_date.isoformat())
        if end_date:
            query = query.lte("created_at", end_date.isoformat())

        query = query.order("created_at", desc=True)
        response = query.execute()

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=["id", "user_id", "action_type", "action_data", "ip_address", "user_agent", "created_at"]
        )
        writer.writeheader()

        for log in response.data:
            writer.writerow({
                "id": log["id"],
                "user_id": log["user_id"],
                "action_type": log["action_type"],
                "action_data": str(log.get("action_data", "")),
                "ip_address": log.get("ip_address", ""),
                "user_agent": log.get("user_agent", ""),
                "created_at": log["created_at"]
            })

        # Return CSV file
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export audit logs: {str(e)}"
        )

