import React from 'react';
import { Heart, MessageCircle, Users, User, Filter, Video, Calendar, Bell, Shield } from 'lucide-react';
import NavigationLink from './NavigationLink';

const Navigation: React.FC = () => {
  const tabs = [
    { id: 'heroes', to: '/heroes', icon: Shield, label: 'Heroes' },

    { id: 'matches', to: '/matches', icon: MessageCircle, label: 'Matches' },
    { id: 'social', to: '/social', icon: Users, label: 'Social' },
    { id: 'chat', to: '/chat', icon: MessageCircle, label: 'Chat' },
    { id: 'video', to: '/video', icon: Video, label: 'Video' },
    { id: 'calendar', to: '/calendar', icon: Calendar, label: 'Calendar' },
    { id: 'notifications', to: '/notifications', icon: Bell, label: 'Alerts' },
    { id: 'verification', to: '/verification', icon: Shield, label: 'Verify' },
    { id: 'filters', to: '/filters', icon: Filter, label: 'Filters' },
    { id: 'profile', to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="glass-pride-strong border-t border-white/20 px-2 py-2 safe-area-bottom overflow-x-auto backdrop-blur-xl">
      <div className="flex justify-between items-center min-w-max space-x-1">
        {tabs.map(({ id, to, icon, label }) => (
          <NavigationLink key={id} to={to} icon={icon} label={label} />
        ))}
      </div>
    </div>
  );
};

export default Navigation;
