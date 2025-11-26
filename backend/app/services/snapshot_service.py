"""
Snapshot Service for Version Control
Handles saving, retrieving, and managing report snapshots
"""
import logging
from typing import Any, Dict, List, Optional

from app.services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)


class SnapshotService:
    """Service for managing report snapshots and version control"""

    @classmethod
    def create_snapshot(
        cls,
        user_id: str,
        snapshot_type: str,
        snapshot_name: str,
        data: Dict[str, Any],
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        screenshot_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new snapshot

        Args:
            user_id: User ID creating the snapshot
            snapshot_type: Type of snapshot ('financial_report', 'metrics', 'custom')
            snapshot_name: Name/title for the snapshot
            data: The actual report data to snapshot
            description: Optional description
            metadata: Optional metadata (filters, parameters, etc.)
            screenshot_url: Optional URL to screenshot in storage

        Returns:
            Dict containing the created snapshot
        """
        if not SupabaseService.client:
            SupabaseService.connect()

        if not SupabaseService.client:
            raise Exception("Supabase client not available")

        try:
            snapshot = {
                "user_id": user_id,
                "snapshot_type": snapshot_type,
                "snapshot_name": snapshot_name,
                "data": data,
                "description": description,
                "metadata": metadata or {},
                "screenshot_url": screenshot_url,
            }

            response = (
                SupabaseService.client.table("report_snapshots")
                .insert(snapshot)
                .execute()
            )

            if response.data:
                logger.info(f"✅ Created snapshot: {snapshot_name} for user {user_id}")
                return response.data[0]
            else:
                raise Exception("Failed to create snapshot")

        except Exception as e:
            logger.error(f"❌ Error creating snapshot: {e}")
            raise

    @classmethod
    def get_snapshots(
        cls,
        user_id: str,
        snapshot_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Get snapshots for a user

        Args:
            user_id: User ID
            snapshot_type: Optional filter by snapshot type
            limit: Maximum number of snapshots to return

        Returns:
            List of snapshots
        """
        if not SupabaseService.client:
            SupabaseService.connect()

        if not SupabaseService.client:
            return []

        try:
            query = (
                SupabaseService.client.table("report_snapshots")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
            )

            if snapshot_type:
                query = query.eq("snapshot_type", snapshot_type)

            response = query.execute()
            return response.data or []

        except Exception as e:
            logger.error(f"❌ Error fetching snapshots: {e}")
            return []

    @classmethod
    def get_snapshot(cls, snapshot_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific snapshot by ID

        Args:
            snapshot_id: Snapshot ID
            user_id: User ID (for security check)

        Returns:
            Snapshot data or None
        """
        if not SupabaseService.client:
            SupabaseService.connect()

        if not SupabaseService.client:
            return None

        try:
            response = (
                SupabaseService.client.table("report_snapshots")
                .select("*")
                .eq("id", snapshot_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )

            return response.data

        except Exception as e:
            logger.error(f"❌ Error fetching snapshot {snapshot_id}: {e}")
            return None

    @classmethod
    def update_snapshot(
        cls,
        snapshot_id: str,
        user_id: str,
        updates: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Update a snapshot

        Args:
            snapshot_id: Snapshot ID
            user_id: User ID (for security check)
            updates: Fields to update

        Returns:
            Updated snapshot or None
        """
        if not SupabaseService.client:
            SupabaseService.connect()

        if not SupabaseService.client:
            return None

        try:
            # Filter allowed update fields
            allowed_fields = [
                "snapshot_name",
                "description",
                "data",
                "metadata",
                "screenshot_url",
            ]
            filtered_updates = {
                k: v for k, v in updates.items() if k in allowed_fields
            }

            response = (
                SupabaseService.client.table("report_snapshots")
                .update(filtered_updates)
                .eq("id", snapshot_id)
                .eq("user_id", user_id)
                .execute()
            )

            if response.data:
                logger.info(f"✅ Updated snapshot: {snapshot_id}")
                return response.data[0]
            return None

        except Exception as e:
            logger.error(f"❌ Error updating snapshot {snapshot_id}: {e}")
            return None

    @classmethod
    def delete_snapshot(cls, snapshot_id: str, user_id: str) -> bool:
        """
        Delete a snapshot

        Args:
            snapshot_id: Snapshot ID
            user_id: User ID (for security check)

        Returns:
            True if deleted successfully
        """
        if not SupabaseService.client:
            SupabaseService.connect()

        if not SupabaseService.client:
            return False

        try:
            # First get the snapshot to check for screenshot
            snapshot = cls.get_snapshot(snapshot_id, user_id)
            if snapshot and snapshot.get("screenshot_url"):
                # Delete screenshot from storage
                try:
                    # Extract path from URL
                    path = snapshot["screenshot_url"].split("/")[-1]
                    SupabaseService.client.storage.from_("report-screenshots").remove(
                        [f"{user_id}/{path}"]
                    )
                except Exception as e:
                    logger.warning(f"Failed to delete screenshot: {e}")

            # Delete snapshot record
            response = (
                SupabaseService.client.table("report_snapshots")
                .delete()
                .eq("id", snapshot_id)
                .eq("user_id", user_id)
                .execute()
            )

            logger.info(f"✅ Deleted snapshot: {snapshot_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Error deleting snapshot {snapshot_id}: {e}")
            return False

    @classmethod
    def get_snapshot_stats(cls, user_id: str) -> Dict[str, Any]:
        """
        Get statistics about user's snapshots

        Args:
            user_id: User ID

        Returns:
            Dictionary with stats
        """
        if not SupabaseService.client:
            SupabaseService.connect()

        if not SupabaseService.client:
            return {}

        try:
            # Get total count
            response = (
                SupabaseService.client.table("report_snapshots")
                .select("*", count="exact")
                .eq("user_id", user_id)
                .execute()
            )

            total_count = response.count or 0

            # Get counts by type
            types_response = (
                SupabaseService.client.table("report_snapshots")
                .select("snapshot_type")
                .eq("user_id", user_id)
                .execute()
            )

            type_counts = {}
            if types_response.data:
                for item in types_response.data:
                    snapshot_type = item.get("snapshot_type", "unknown")
                    type_counts[snapshot_type] = type_counts.get(snapshot_type, 0) + 1

            return {
                "total_snapshots": total_count,
                "by_type": type_counts,
            }

        except Exception as e:
            logger.error(f"❌ Error fetching snapshot stats: {e}")
            return {}

