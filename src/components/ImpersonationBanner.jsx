import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Eye, X, User, Building2 } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Banner displayed when an admin is impersonating an investor
 * Shows who they're viewing as and provides an exit button
 */
export function ImpersonationBanner({ className }) {
  const { isImpersonating, impersonatedUser, stopImpersonation, user } = useAuth();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2',
        'flex items-center justify-between gap-4 shadow-md',
        'animate-in slide-in-from-top duration-300',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-2 px-2 py-1 bg-amber-400/50 rounded-md">
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span className="font-semibold text-sm">Viewing As</span>
        </div>
        
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 flex-shrink-0 text-amber-700" />
            <span className="font-medium truncate">
              {impersonatedUser.full_name || impersonatedUser.email}
            </span>
            {impersonatedUser.full_name && (
              <span className="text-amber-700 text-sm truncate hidden sm:inline">
                ({impersonatedUser.email})
              </span>
            )}
          </div>
          
          {impersonatedUser.company && (
            <div className="hidden md:flex items-center gap-1 text-amber-700">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-sm">{impersonatedUser.company}</span>
            </div>
          )}
          
          <span className="px-2 py-0.5 bg-amber-600/20 rounded text-xs font-medium uppercase tracking-wide">
            {impersonatedUser.role}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-amber-700 hidden lg:inline">
          Signed in as: {user?.email}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={stopImpersonation}
          className="bg-amber-600 hover:bg-amber-700 text-white hover:text-white gap-1.5 h-8"
        >
          <X className="h-4 w-4" />
          <span>Exit View</span>
        </Button>
      </div>
    </div>
  );
}

export default ImpersonationBanner;

