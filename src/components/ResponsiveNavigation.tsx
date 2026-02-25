import React, { useState } from 'react';
import { Heart, MessageCircle, Users, User, Filter, Video, Calendar, Bell, Shield, Menu, X } from 'lucide-react';

interface ResponsiveNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({ activeTab, onTabChange }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { id: 'heroes', icon: Shield, label: 'Heroes' },

    { id: 'matches', icon: MessageCircle, label: 'Matches' },
    { id: 'social', icon: Users, label: 'Social' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'video', icon: Video, label: 'Video' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'notifications', icon: Bell, label: 'Alerts' },
    { id: 'verification', icon: Shield, label: 'Verify' },
    { id: 'filters', icon: Filter, label: 'Filters' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-t border-gray-200 px-2 py-2 safe-area-bottom">
        <div className="flex justify-between items-center">
          {/* Primary tabs for mobile */}
          {tabs.slice(0, 4).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              className={`flex flex-col items-center py-2 px-2 rounded-xl transition-all duration-200 ${
                activeTab === id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{label.split(' ')[1]}</span>
            </button>
          ))}
          
          {/* Menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex flex-col items-center py-2 px-2 rounded-xl text-gray-500 hover:text-gray-700"
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:block bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex justify-center items-center space-x-2 max-w-6xl mx-auto">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              className={`flex flex-col items-center py-3 px-4 rounded-xl transition-all duration-200 ${
                activeTab === id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg transform scale-105'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 wedding-heading">Navigation</h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {tabs.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
                    activeTab === id
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResponsiveNavigation;
