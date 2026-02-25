import React from 'react';
import ChatView from '@/components/ChatView';

const ChatPage: React.FC = () => {
  return (
    <div className="page-gradient h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden relative z-10 px-2 sm:px-4 md:px-6 pb-2">
        <div className="glass-pride rounded-2xl overflow-hidden h-full max-w-6xl mx-auto">
          <ChatView />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
