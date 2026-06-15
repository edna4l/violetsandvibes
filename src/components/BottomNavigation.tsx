import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { useChatUnread } from '@/hooks/useChatUnread';
import { Compass, Heart, MessageCircle, User, Users, Bell, Play } from 'lucide-react';

type NavItem = {
  path: string;
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
};

const navItems: NavItem[] = [
  { path: '/discover',       icon: Compass,        label: 'Discover' },
  { path: '/matches',        icon: Heart,          label: 'Violets'  },
  { path: '/vibes',          icon: Play,           label: 'Vibes'    },
  { path: '/chat',           icon: MessageCircle,  label: 'Chat'     },
  { path: '/social',         icon: Users,          label: 'Social'   },
  { path: '/notifications',  icon: Bell,           label: 'Alerts'   },
  { path: '/profile',        icon: User,           label: 'Profile'  },
];

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { unreadCount: notifUnread } = useNotifications();
  const { unreadCount: chatUnread } = useChatUnread();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y < lastScrollY || y <= 100) setIsVisible(true);
      else setIsVisible(false);
      setLastScrollY(y);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onVibesNavigate = () => {
      setIsVisible(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsVisible(true), 2500);
    };
    window.addEventListener('vibes-navigate', onVibesNavigate);
    return () => { window.removeEventListener('vibes-navigate', onVibesNavigate); clearTimeout(timer); };
  }, []);

  return (
    <div
      className={`vv-bottom-nav transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {navItems.map(({ path, icon: Icon, label }) => {
        const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
        const badge = path === '/notifications' ? notifUnread : path === '/chat' ? chatUnread : 0;

        return (
          <Link
            key={path}
            to={path}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={`vv-nav-tab ${isActive ? 'vv-nav-tab--active' : ''}`}
          >
            <div className="vv-nav-icon-wrap">
              {isActive && <div aria-hidden className="vv-nav-active-bg" />}
              <Icon size={20} aria-hidden className="relative z-[1]" />
              {badge > 0 && (
                <span className="vv-nav-badge">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNavigation;
export { BottomNavigation };
