import React from 'react';
import SocialFeed from '@/components/SocialFeed';
import BottomNavigation from '../components/BottomNavigation';
import { ResponsiveWrapper } from '@/components/ResponsiveWrapper';

const SocialPage: React.FC = () => {
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
        <ResponsiveWrapper maxWidth="full" className="h-full">
          <div className="glass-pride rounded-2xl overflow-hidden">
            <SocialFeed />
          </div>
        </ResponsiveWrapper>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default SocialPage;
