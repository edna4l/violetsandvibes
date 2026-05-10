import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNotifications } from "@/hooks/useNotifications";
import { useChatUnread } from "@/hooks/useChatUnread";
import {
  Compass,
  Heart,
  MessageCircle,
  User,
  Users,
  Bell,
  Play
} from 'lucide-react';

type NavItem = {
  path: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  gradient: string;        // active circle gradient
  iconColor: string;       // icon color when active (inside circle)
  labelColor: string;      // label color when active
};

const navItems: NavItem[] = [
  {
    path: '/discover',
    icon: Compass,
    label: 'Discover',
    gradient: 'from-cyan-400 to-blue-500',
    iconColor: 'text-white',
    labelColor: 'text-cyan-300',
  },
  {
    path: '/matches',
    icon: Heart,
    label: 'Violets',
    gradient: 'from-violet-500 to-purple-600',
    iconColor: 'text-white',
    labelColor: 'text-violet-300',
  },
  {
    path: '/vibes',
    icon: Play,
    label: 'Vibes',
    gradient: 'from-pink-500 to-purple-600',
    iconColor: 'text-white',
    labelColor: 'text-pink-300',
  },
  {
    path: '/chat',
    icon: MessageCircle,
    label: 'Chat',
    gradient: 'from-emerald-400 to-teal-500',
    iconColor: 'text-white',
    labelColor: 'text-emerald-300',
  },
  {
    path: '/social',
    icon: Users,
    label: 'Social',
    gradient: 'from-orange-400 to-pink-500',
    iconColor: 'text-white',
    labelColor: 'text-orange-300',
  },
  {
    path: '/notifications',
    icon: Bell,
    label: 'Alerts',
    gradient: 'from-yellow-400 to-orange-500',
    iconColor: 'text-white',
    labelColor: 'text-yellow-300',
  },
  {
    path: '/profile',
    icon: User,
    label: 'Profile',
    gradient: 'from-rose-400 to-pink-600',
    iconColor: 'text-white',
    labelColor: 'text-rose-300',
  },
];

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChatUnread();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Hide when user navigates between vibes, show again after 2.5 s
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onVibesNavigate = () => {
      setIsVisible(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsVisible(true), 2500);
    };
    window.addEventListener('vibes-navigate', onVibesNavigate);
    return () => {
      window.removeEventListener('vibes-navigate', onVibesNavigate);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className={`fixed bottom-0 left-0 right-0 glass-pride-strong border-t border-white/20 z-40 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      <div className="flex justify-around items-center py-2">
        {navItems.map(({ path, icon: Icon, label, gradient, iconColor, labelColor }) => {
          const isActive =
            location.pathname === path || location.pathname.startsWith(path + '/');
          const isVibes = path === '/vibes';

          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center p-1.5 rounded-xl transition-all duration-200 ${
                isActive ? 'scale-110' : 'opacity-60 hover:opacity-90 hover:scale-105'
              }`}
            >
              <div className="relative">
                <div className={`flex items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
                  isVibes ? 'w-11 h-11' : 'w-9 h-9'
                } ${
                  isActive
                    ? `bg-gradient-to-br ${gradient}`
                    : 'bg-white/10'
                }`}>
                  <Icon className={`${isVibes ? 'w-5 h-5' : 'w-4 h-4'} ${isActive ? iconColor : 'text-white/70'}`} />
                </div>

                {path === '/notifications' && notificationUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white">
                    {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                  </span>
                )}
                {path === '/chat' && chatUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white">
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 font-medium transition-colors ${
                isActive ? labelColor : 'text-white/50'
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
export { BottomNavigation };
