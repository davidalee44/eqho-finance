import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { ACTION_TYPES, exportAuditLogs, fetchAuditLogs } from '@/services/auditService';
import { Download, Filter, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AuditLogViewer() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 50,
    actionType: '',
    userId: '',
    startDate: '',
    endDate: '',
  });
  const [totalLogs, setTotalLogs] = useState(0);
  
  // Auto-refresh every 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  useEffect(() => {
    if (!isAdmin) return;
    
    loadLogs();
  }, [filters, isAdmin]);
  
  useEffect(() => {
    if (!autoRefresh || !isAdmin) return;
    
    const interval = setInterval(() => {
      loadLogs();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, filters, isAdmin]);
  
  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditLogs(filters);
      setLogs(data.logs);
      setTotalLogs(data.total);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = async () => {
    try {
      const blob = await exportAuditLogs(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };
  
  const getActionTypeBadge = (actionType) => {
    const variants = {
      login: 'default',
      logout: 'secondary',
      layout_change: 'destructive',
      report_export: 'outline',
      report_view: 'outline',
      snapshot_create: 'outline',
      snapshot_restore: 'destructive',
    };
    
    return (
      <Badge variant={variants[actionType] || 'default'} className="text-xs">
        {actionType.replace('_', ' ')}
      </Badge>
    );
  };
  
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You must be an administrator to view audit logs</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                System activity log - showing {logs.length} of {totalLogs} entries
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <Label className="text-sm font-medium">Filters</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="actionType" className="text-xs">Action Type</Label>
                <Select
                  value={filters.actionType}
                  onValueChange={(value) => setFilters({ ...filters, actionType: value, page: 1 })}
                >
                  <SelectTrigger id="actionType" className="h-9">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    {Object.values(ACTION_TYPES).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="endDate" className="text-xs">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="userId" className="text-xs">User ID</Label>
                <Input
                  id="userId"
                  placeholder="Filter by user..."
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value, page: 1 })}
                  className="h-9"
                />
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh (30s)
              </label>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({
                  page: 1,
                  pageSize: 50,
                  actionType: '',
                  userId: '',
                  startDate: '',
                  endDate: '',
                })}
              >
                Clear filters
              </Button>
            </div>
          </div>
          
          {/* Logs Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">User ID</TableHead>
                  <TableHead className="hidden lg:table-cell">IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-mono">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        {getActionTypeBadge(log.action_type)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">
                        {log.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {log.ip_address || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.action_data && Object.keys(log.action_data).length > 0 ? (
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {JSON.stringify(log.action_data).substring(0, 50)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalLogs > filters.pageSize && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {filters.page} of {Math.ceil(totalLogs / filters.pageSize)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page >= Math.ceil(totalLogs / filters.pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

