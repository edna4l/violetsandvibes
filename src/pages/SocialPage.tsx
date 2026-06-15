import React from 'react';
import SocialFeed from '@/components/SocialFeed';

const SocialPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto px-2 sm:px-4 md:px-6 pb-2">
        <div className="glass-pride rounded-2xl overflow-hidden max-w-7xl mx-auto">
          <SocialFeed />
        </div>
      </div>
    </div>
  );
};

export default SocialPage;
