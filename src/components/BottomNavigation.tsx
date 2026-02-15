import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNotifications } from "@/hooks/useNotifications";
import { 
  Compass, 
  Heart, 
  MessageCircle, 
  User, 
  Calendar,
  Users,
  Bell
} from 'lucide-react';

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const navItems = [
    { path: '/', icon: Compass, label: 'Discover' },
    { path: '/matches', icon: Heart, label: 'Matches' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/social', icon: Users, label: 'Social' },
    { path: '/notifications', icon: Bell, label: 'Alerts' },
    { path: '/events', icon: Calendar, label: 'Events' },
    { path: '/profile', icon: User, label: 'Profile' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className={`fixed bottom-0 left-0 right-0 glass-pride-strong border-t border-white/20 z-40 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      <div className="flex justify-around items-center py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'text-white scale-110' 
                  : 'text-white/60 hover:text-white hover:scale-105'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-pink-400' : ''}`} />
                {path === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </div>
              <span className="text-xs mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
export { BottomNavigation };
