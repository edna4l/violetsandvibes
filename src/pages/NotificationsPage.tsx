import React from 'react';
import NotificationCenter from '@/components/NotificationCenter';

const NotificationsPage: React.FC = () => (
  <div className="h-full flex flex-col">
    <div className="flex-1 overflow-auto px-2 sm:px-4 md:px-6 pb-2">
      <div className="glass-pride rounded-2xl overflow-hidden max-w-5xl mx-auto">
        <NotificationCenter />
      </div>
    </div>
  </div>
);

export default NotificationsPage;
