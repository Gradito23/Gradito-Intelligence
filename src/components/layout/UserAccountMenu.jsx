import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function getInitials(user) {
  if (user?.display_name) {
    const parts = user.display_name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (user?.email) return user.email.slice(0, 2).toUpperCase();
  return 'U';
}

function getDisplayLabel(user) {
  if (user?.display_name) return user.display_name;
  if (user?.email) return user.email.split('@')[0];
  return 'User';
}

export default function UserAccountMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (!user) return null;

  return (
    <div className="p-3 mx-3 mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors text-left"
          >
            <Avatar className="h-9 w-9 border border-sidebar-foreground/10">
              <AvatarImage src={user.avatar_url ?? undefined} alt={getDisplayLabel(user)} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-semibold">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{getDisplayLabel(user)}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate capitalize">{user.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-sidebar-foreground/50 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-52">
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onClick={() => navigate('/admin')}>
              <Settings className="mr-2 h-4 w-4" />
              Admin Panel
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout(true)}>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
