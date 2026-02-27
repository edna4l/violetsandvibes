import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Menu, Settings, User, Heart, LogOut, Bell, Compass, MessageCircle, Users, Calendar, Video, Filter, Shield, Sparkles } from 'lucide-react';

interface HeaderDropdownProps {
  onMenuSelect?: (action: string) => void;
  user?: any;
}

export const HeaderDropdown: React.FC<HeaderDropdownProps> = ({ 
  onMenuSelect,
  user
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      // Auth service now handles redirect to /signin
      if (onMenuSelect) {
        onMenuSelect('logout');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  const handleMenuClick = (action: string, path?: string) => {
    if (action === 'logout') {
      handleSignOut();
      return;
    }
    
    if (path) {
      navigate(path);
    }
    if (onMenuSelect) {
      onMenuSelect(action);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="
            glass-pride 
            border-white/20 
            text-white 
            hover:bg-white/20 
            transition-all 
            duration-300
            scale-responsive
          "
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="
          bg-white
          border-gray-200 
          text-black 
          min-w-48
          scale-responsive
          shadow-lg
        "
        onCloseAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="text-black font-semibold">
          Violets & Vibes
        </DropdownMenuLabel>

        <DropdownMenuItem
          onClick={() => handleMenuClick('heroes', '/heroes')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Heroes
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('discover', '/discover')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Compass className="mr-2 h-4 w-4" />
          Discover
        </DropdownMenuItem>

        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('matches', '/matches')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Heart className="mr-2 h-4 w-4" />
          Matches
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('chat', '/chat')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Chat
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('social', '/social')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Users className="mr-2 h-4 w-4" />
          Social
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('calendar', '/calendar')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Calendar
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('video', '/video')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Video className="mr-2 h-4 w-4" />
          Video Chat
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-gray-200" />
        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('profile', '/profile')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          My Profile
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('notifications', '/notifications')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('filters', '/filters')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleMenuClick('settings', '/settings')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('verification', '/verification')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Shield className="mr-2 h-4 w-4" />
          Verification
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleMenuClick('safety-standards', '/terms#community-standards')}
          className="text-black hover:bg-gray-100 cursor-pointer"
        >
          <Shield className="mr-2 h-4 w-4" />
          Safety Standards
        </DropdownMenuItem>
        
        {user?.isAdmin && (
          <>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem 
              onClick={() => handleMenuClick('admin', '/admin')}
              className="text-black hover:bg-purple-100 cursor-pointer"
            >
              <Shield className="mr-2 h-4 w-4" />
              Admin Panel
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator className="bg-gray-200" />
        
        <DropdownMenuItem 
          onClick={() => handleMenuClick('logout', '/heroes')}
          className="text-black hover:bg-red-100 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeaderDropdown;
