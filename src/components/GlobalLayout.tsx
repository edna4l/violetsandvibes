import React from 'react';
import { PrideHeader } from './PrideHeader';
import { BottomNavigation } from './BottomNavigation';
import { ResponsiveWrapper } from './ResponsiveWrapper';
import { useNavigate } from 'react-router-dom';

interface GlobalLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
  className?: string;
}

export const GlobalLayout: React.FC<GlobalLayoutProps> = ({ 
  children, 
  showHeader = true, 
  showBottomNav = true,
  className = ""
}) => {
  const navigate = useNavigate();

  const handleMenuSelect = (action: string) => {
    switch (action) {
      case 'heroes':
        navigate('/heroes');
        break;
      case 'discover':
        navigate('/discover');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'matches':
        navigate('/matches');
        break;
      case 'social':
        navigate('/social');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'video':
        navigate('/video');
        break;
      case 'events':
        navigate('/events');
        break;
      case 'notifications':
        navigate('/notifications');
        break;
      case 'verification':
        navigate('/verification');
        break;
      case 'filters':
        navigate('/filters');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'subscription':
        navigate('/subscription');
        break;
      case 'admin':
        navigate('/admin');
        break;
      case 'logout':
        navigate('/signin');
        break;
      default:
        break;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="relative z-20">
          <PrideHeader onMenuSelect={handleMenuSelect} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-20">
        {children}
      </div>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <BottomNavigation />
        </div>
      )}
    </div>
  );
};

export default GlobalLayout;
