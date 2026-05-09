import React from 'react';
import { Users, Calendar, MapPin, Heart } from 'lucide-react';
import PrideHeader from './PrideHeader';

interface CommunityEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  attendees: number;
  type: 'social' | 'support' | 'activism' | 'celebration';
  identity?: 'lesbian' | 'bisexual' | 'pansexual' | 'transgender' | 'rainbow';
}

const mockEvents: CommunityEvent[] = [
  {
    id: '1',
    title: "Women's Book Club",
    date: 'Today, 7:00 PM',
    location: 'Downtown Library',
    attendees: 12,
    type: 'social',
    identity: 'rainbow'
  },
  {
    id: '2',
    title: 'Pride Parade Planning',
    date: 'Tomorrow, 6:00 PM',
    location: 'Community Center',
    attendees: 45,
    type: 'activism',
    identity: 'rainbow'
  },
  {
    id: '3',
    title: "Women's Support Circle",
    date: 'Friday, 5:30 PM',
    location: 'Safe Space Café',
    attendees: 8,
    type: 'support',
    identity: 'rainbow'
  }
];

const CommunityView: React.FC = () => {
  const identityColors = {
    lesbian: 'bg-orange-500/20 border-orange-400',
    bisexual: 'bg-purple-500/20 border-purple-400',
    pansexual: 'bg-pink-500/20 border-pink-400',
    transgender: 'bg-blue-500/20 border-blue-400',
    rainbow: 'bg-gradient-to-r from-red-500/20 to-purple-500/20 border-purple-400'
  };

  return (
    <div className="page-gradient min-h-screen">
      <div className="relative z-10">
        <PrideHeader 
          title="Community" 
          subtitle="Connect with women in your community"
        />
        
        <div className="padding-responsive">
          <div className="mb-6">
            <h2 className="text-lg font-semibold rainbow-header flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-purple-400" />
              Upcoming Events
            </h2>
            
            <div className="space-y-4">
              {mockEvents.map((event) => (
                <div
                  key={event.id}
                  className={`glass-pride-strong p-4 rounded-xl hover:scale-105 transition-all duration-200 border ${
                    event.identity ? identityColors[event.identity] : 'border-purple-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white text-lg">{event.title}</h3>
                    <span className="text-xs text-white/60 capitalize bg-white/10 px-2 py-1 rounded-full">
                      {event.type}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-white/80 text-sm">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-purple-400" />
                      {event.date}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-purple-400" />
                      {event.location}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-purple-400" />
                      {event.attendees} attending
                    </div>
                  </div>
                  
                  <button className="w-full mt-4 btn-pride py-2 rounded-lg flex items-center justify-center gap-2">
                    <Heart className="w-4 h-4" />
                    Join Event
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityView;