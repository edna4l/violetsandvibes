import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import { HeaderDropdown } from './HeaderDropdown';
import { StarCanvas } from './StarCanvas';

const HEARTS = [
  { pos: { left: '6%',  top: '32%' }, dur: '5s',   delay: '0s',   emoji: '💜' },
  { pos: { left: '8%',  top: '55%' }, dur: '4.2s', delay: '1.4s', emoji: '🤍' },
  { pos: { left: '4%',  top: '70%' }, dur: '6s',   delay: '2.8s', emoji: '💜' },
  { pos: { right: '7%', top: '40%' }, dur: '4.8s', delay: '0.9s', emoji: '💜' },
  { pos: { right: '5%', top: '62%' }, dur: '5.5s', delay: '2.1s', emoji: '🤍' },
];

const SPARKLES = [
  { pos: { top: '22%', right: '16%' }, char: '✦', dur: '3.5s', delay: '0s' },
  { pos: { top: '35%', left: '17%'  }, char: '+',  dur: '4.2s', delay: '1.1s' },
  { pos: { top: '60%', right: '20%' }, char: '✦', dur: '3.8s', delay: '2s' },
  { pos: { top: '72%', left: '14%'  }, char: '+',  dur: '5s',   delay: '0.6s' },
];

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
  className = '',
}) => {
  const navigate = useNavigate();

  const handleMenuSelect = (action: string) => {
    const routes: Record<string, string> = {
      heroes: '/heroes', vibes: '/vibes', discover: '/discover',
      profile: '/profile', matches: '/matches', social: '/social',
      chat: '/chat', video: '/video', events: '/events',
      calendar: '/calendar', notifications: '/notifications',
      verification: '/verification', filters: '/filters',
      settings: '/settings', subscription: '/subscription',
      admin: '/admin', logout: '/signin',
    };
    if (routes[action]) navigate(routes[action]);
  };

  return (
    <div className={`vv-page flex flex-col min-h-dvh overflow-x-hidden relative ${className}`}>
      <StarCanvas />

      {/* Floral panels */}
      <div aria-hidden className="vv-floral-panel vv-floral-panel-left">
        <img src="/vv-floral-left.png" alt="" />
        <div className="vv-floral-overlay" />
      </div>
      <div aria-hidden className="vv-floral-panel vv-floral-panel-right">
        <img src="/vv-floral-left.png" alt="" />
        <div className="vv-floral-overlay" />
      </div>

      {/* Decorative hearts */}
      {HEARTS.map((h, i) => (
        <div
          key={i}
          aria-hidden
          className="vv-deco-heart"
          style={{ ...h.pos, '--dur': h.dur, '--delay': h.delay } as React.CSSProperties}
        >
          {h.emoji}
        </div>
      ))}

      {/* Sparkle crosses */}
      {SPARKLES.map((s, i) => (
        <div
          key={i}
          aria-hidden
          className="vv-sparkle"
          style={{ ...s.pos, '--dur': s.dur, '--delay': s.delay } as React.CSSProperties}
        >
          {s.char}
        </div>
      ))}

      {/* Rainbow bar */}
      <div aria-hidden className="vv-rainbow-bar" />

      {showHeader && (
        <>
          <header className="vv-header">
            <Link to="/terms#community-standards" className="vv-safety-badge">
              <div aria-hidden className="vv-shield-icon" />
              Safety Standards
            </Link>

            <h1 className="vv-brand-title">Violets &amp; Vibes</h1>

            <div className="flex items-center gap-2.5">
              <div aria-hidden className="vv-online-dot" />
              <HeaderDropdown onMenuSelect={handleMenuSelect} />
            </div>
          </header>

          <nav aria-label="Page navigation" className="vv-subnav">
            <button type="button" className="vv-subnav-btn" onClick={() => navigate(-1)}>
              <ChevronLeft size={13} aria-hidden />Back
            </button>
            <button type="button" className="vv-subnav-btn" onClick={() => navigate(1)}>
              Next<ChevronRight size={13} aria-hidden />
            </button>
          </nav>
        </>
      )}

      <div className="flex-1 overflow-auto pb-20 relative z-[5]">
        {children}
      </div>

      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <BottomNavigation />
        </div>
      )}
    </div>
  );
};

export default GlobalLayout;
