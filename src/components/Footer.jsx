import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  const { user, role, isAdmin } = useAuth();
  
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 h-12 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-full items-center justify-between px-4 md:px-6">
        {/* Left side - Copyright and version */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="hidden sm:inline">
            © {new Date().getFullYear()} Eqho, LLC
          </span>
          <span className="text-xs opacity-70">v1.0.0</span>
        </div>
        
        {/* Center - User role badge */}
        {user && role && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Badge variant="default" className="gap-1 bg-blue-600">
                <Shield className="h-3 w-3" />
                <span className="hidden sm:inline">Admin</span>
              </Badge>
            )}
            {!isAdmin && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
            )}
          </div>
        )}
        
        {/* Right side - Admin links */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              asChild
            >
              <Link to="/audit-logs">
                <Shield className="mr-1 h-3 w-3" />
                <span className="hidden sm:inline">Audit Logs</span>
                <span className="sm:hidden">Logs</span>
              </Link>
            </Button>
          )}
          <span className="text-xs text-muted-foreground hidden md:inline">
            Secure Portal
          </span>
        </div>
      </div>
    </footer>
  );
}

