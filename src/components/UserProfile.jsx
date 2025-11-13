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
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
      {/* User Info */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
          {userName.charAt(0).toUpperCase()}
        </div>
        
        {/* User Details */}
        <div className="hidden md:block">
          <p className="text-sm font-semibold text-white">{userName}</p>
          <p className="text-xs text-gray-400">{userEmail}</p>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleSignOut}
        className="px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
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

