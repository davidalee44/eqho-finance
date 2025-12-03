import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    Building2,
    Eye,
    Loader2,
    Search,
    User,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Modal selector for admin impersonation
 * Fetches user list from backend and allows admin to select a user to impersonate
 */
export function ImpersonationSelector({ 
  trigger, 
  className,
  onImpersonationStart 
}) {
  const { isAdmin, startImpersonation, isImpersonating } = useAuth();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users when dialog opens
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users?exclude_admins=true`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch users: ${errorText}`);
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('[ImpersonationSelector] Failed to fetch users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (open && isAdmin) {
      fetchUsers();
    }
  }, [open, isAdmin, fetchUsers]);

  // Filter users by search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.company?.toLowerCase().includes(query)
    );
  });

  const handleSelectUser = async (user) => {
    await startImpersonation(user);
    setOpen(false);
    onImpersonationStart?.(user);
  };

  // Don't render for non-admins
  if (!isAdmin) {
    return null;
  }

  // Don't show trigger if already impersonating
  if (isImpersonating) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-2", className)}
          >
            <Eye className="h-4 w-4" />
            View As
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            View As Investor
          </DialogTitle>
          <DialogDescription>
            Select an investor to see the app from their perspective. 
            Your admin access will be hidden.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] -mx-2 px-2">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading users...
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-32 text-destructive gap-2">
                <AlertCircle className="h-6 w-6" />
                <p className="text-sm text-center">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchUsers}>
                  Retry
                </Button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <User className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? 'No users match your search' : 'No investors found'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-colors",
                      "hover:bg-accent focus:bg-accent focus:outline-none",
                      "border border-transparent hover:border-border"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {user.full_name || user.email.split('@')[0]}
                          </span>
                          <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-medium rounded uppercase">
                            {user.role}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </div>
                        {user.company && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Building2 className="h-3 w-3" />
                            {user.company}
                          </div>
                        )}
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer info */}
          <div className="text-xs text-muted-foreground border-t pt-3">
            <p>
              <strong>Note:</strong> You&apos;ll see exactly what {filteredUsers.length > 0 ? 'the selected investor' : 'an investor'} sees.
              Admin features will be hidden. Click &quot;Exit View&quot; in the banner to return to admin mode.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImpersonationSelector;

