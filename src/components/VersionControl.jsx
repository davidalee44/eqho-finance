import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Save, 
  History, 
  Download, 
  Camera, 
  Trash2, 
  Eye, 
  Calendar, 
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { apiFetch, API_BASE_URL } from '@/lib/api';

/**
 * VersionControl Component
 * Manages snapshots and version history for financial reports
 */
export const VersionControl = ({ 
  currentData, 
  onRestore, 
  userId = 'demo-user',
  snapshotType = 'financial_report' 
}) => {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (showHistory) {
      fetchSnapshots();
    }
  }, [showHistory, userId]);

  const fetchSnapshots = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch(
        `/api/v1/snapshots/?user_id=${userId}&snapshot_type=${snapshotType}&limit=20`
      );
      setSnapshots(data || []);
    } catch (err) {
      console.error('Error fetching snapshots:', err);
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const saveSnapshot = async () => {
    if (!snapshotName.trim()) {
      setError('Please enter a name for this snapshot');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        user_id: userId,
        snapshot_type: snapshotType,
        snapshot_name: snapshotName.trim(),
        description: snapshotDescription.trim() || null,
        data: currentData,
        metadata: {
          saved_at: new Date().toISOString(),
          browser: navigator.userAgent,
        },
      };

      await apiFetch('/api/v1/snapshots/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      setSuccess('Snapshot saved successfully!');
      setSnapshotName('');
      setSnapshotDescription('');
      
      // Refresh list
      if (showHistory) {
        await fetchSnapshots();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving snapshot:', err);
      setError('Failed to save snapshot');
    } finally {
      setSaving(false);
    }
  };

  const deleteSnapshot = async (snapshotId) => {
    if (!confirm('Are you sure you want to delete this snapshot? This cannot be undone.')) {
      return;
    }

    try {
      await apiFetch(`/api/v1/snapshots/${snapshotId}?user_id=${userId}`, {
        method: 'DELETE',
      });

      setSuccess('Snapshot deleted successfully');
      await fetchSnapshots();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting snapshot:', err);
      setError('Failed to delete snapshot');
    }
  };

  const restoreSnapshot = async (snapshot) => {
    if (!confirm(`Restore snapshot "${snapshot.snapshot_name}"? Your current unsaved changes will be lost.`)) {
      return;
    }

    try {
      if (onRestore && snapshot.data) {
        onRestore(snapshot.data);
        setSuccess(`Restored snapshot: ${snapshot.snapshot_name}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error restoring snapshot:', err);
      setError('Failed to restore snapshot');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Save Snapshot Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Current Version
          </CardTitle>
          <CardDescription>
            Create a snapshot of the current report to save your work and track changes over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="snapshot-name">Snapshot Name *</Label>
              <Input
                id="snapshot-name"
                placeholder="e.g., Q4 2025 Review"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                disabled={saving}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="snapshot-description">Description (Optional)</Label>
              <Input
                id="snapshot-description"
                placeholder="Add notes about this version..."
                value={snapshotDescription}
                onChange={(e) => setSnapshotDescription(e.target.value)}
                disabled={saving}
                className="mt-1"
              />
            </div>

            <Button
              onClick={saveSnapshot}
              disabled={saving || !snapshotName.trim()}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Snapshot
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version History Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Version History
              </CardTitle>
              <CardDescription>
                View and restore previous versions of your reports
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) {
                  fetchSnapshots();
                }
              }}
            >
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </div>
        </CardHeader>

        {showHistory && (
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading history...
              </div>
            ) : snapshots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No snapshots saved yet</p>
                <p className="text-sm">Save your first snapshot above to start tracking versions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{snapshot.snapshot_name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {snapshot.snapshot_type}
                          </Badge>
                        </div>
                        
                        {snapshot.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {snapshot.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(snapshot.created_at)}
                          </span>
                          {snapshot.screenshot_url && (
                            <Badge variant="secondary" className="text-xs">
                              <Camera className="h-3 w-3 mr-1" />
                              Screenshot
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreSnapshot(snapshot)}
                          title="Restore this version"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        
                        {snapshot.screenshot_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(snapshot.screenshot_url, '_blank')}
                            title="View screenshot"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSnapshot(snapshot.id)}
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          title="Delete snapshot"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default VersionControl;

