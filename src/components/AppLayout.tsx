import React, { useState } from 'react';
import SwipeContainer from './SwipeContainer';
import MatchesView from './MatchesView';
import ChatView from './ChatView';
import ProfileView from './ProfileView';
import ResponsiveNavigation from './ResponsiveNavigation';
import AdvancedFilters from './AdvancedFilters';
import VideoChat from './VideoChat';
import SocialFeed from './SocialFeed';
import UserVerification from './UserVerification';
import NotificationCenter from './NotificationCenter';
import CalendarIntegration from './CalendarIntegration';
import { PrideHeader } from './PrideHeader';
import { ResponsiveWrapper } from './ResponsiveWrapper';
const AppLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('heroes');

  const handleMenuSelect = (action: string) => {
    switch (action) {
      case 'profile':
        setActiveTab('profile');
        break;
      case 'matches':
        setActiveTab('matches');
        break;
      case 'notifications':
        setActiveTab('notifications');
        break;
      case 'settings':
        setActiveTab('filters');
        break;
      case 'logout':
        // Handle logout logic here
        console.log('Logout clicked');
        break;
      default:
        break;
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'heroes':
        return <SwipeContainer />;
      case 'matches':
        return <MatchesView />;
      case 'social':
        return <SocialFeed />;
      case 'chat':
        return <ChatView />;
      case 'video':
        return <VideoChat />;
      case 'calendar':
        return <CalendarIntegration />;
      case 'notifications':
        return <NotificationCenter />;
      case 'verification':
        return <UserVerification />;
      case 'filters':
        return <AdvancedFilters />;
      case 'profile':
        return <ProfileView />;
      default:
        return <SwipeContainer />;
    }
  };

  return (
    <div className="page-gradient min-h-screen flex flex-col relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-pink-400/20 rounded-full floating-orb blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-400/20 rounded-full floating-orb blur-lg" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 bg-indigo-400/20 rounded-full floating-orb blur-xl" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-20 right-10 w-20 h-20 bg-cyan-400/20 rounded-full floating-orb blur-lg" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        <ResponsiveWrapper maxWidth="2xl" className="h-full">
          <PrideHeader showLogo={false} className="relative" onMenuSelect={handleMenuSelect} />
          <div className="glass-pride rounded-2xl overflow-hidden">
            {renderActiveView()}
          </div>
        </ResponsiveWrapper>
      </div>

      {/* Responsive Navigation */}
      <div className="relative z-20">
        <ResponsiveNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default AppLayout;
