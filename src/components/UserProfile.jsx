import React from 'react';
import { supabase } from '../lib/supabaseClient';

export const UserProfile = ({ userProfile }) => {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  const userEmail = userProfile?.email || 'User';
  const userName = userProfile?.full_name || userProfile?.name || userEmail.split('@')[0];

  return (
    <div className="flex items-center gap-3">
      {/* User Info */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="text-xs">
          <p className="font-medium text-foreground">{userName}</p>
          <p className="text-muted-foreground">{userEmail}</p>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleSignOut}
        className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors flex items-center gap-1.5"
        title="Sign out"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
          />
        </svg>
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
};

export default UserProfile;

