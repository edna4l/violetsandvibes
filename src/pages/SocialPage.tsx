import React from 'react';
import SocialFeed from '@/components/SocialFeed';

const SocialPage: React.FC = () => {
  return (
    <div className="page-gradient h-full flex flex-col relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-pink-400/20 rounded-full floating-orb blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-400/20 rounded-full floating-orb blur-lg" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 bg-indigo-400/20 rounded-full floating-orb blur-xl" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-20 right-10 w-20 h-20 bg-cyan-400/20 rounded-full floating-orb blur-lg" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative z-10 px-2 sm:px-4 md:px-6 pb-2">
        <div className="glass-pride rounded-2xl overflow-hidden h-full max-w-7xl mx-auto">
          <SocialFeed />
        </div>
      </div>
    </div>
  );
};

export default SocialPage;
