import React from 'react';
import { Heart, X, MapPin, Sparkles, Star } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  age?: number | null;
  bio: string;
  photos: string[];
  location: string;
  interests?: string[];
  pronouns?: string;
  identity?: 'lesbian' | 'bisexual' | 'pansexual' | 'transgender' | 'rainbow';
}

interface ProfileCardProps {
  profile: Profile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  style?: React.CSSProperties;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ 
  profile, 
  onSwipeLeft, 
  onSwipeRight, 
  style 
}) => {
  const identityClasses = {
    lesbian: 'lesbian-gradient',
    bisexual: 'bisexual-gradient',
    pansexual: 'pansexual-gradient',
    transgender: 'transgender-gradient',
    rainbow: 'rainbow-gradient'
  };

  const backgroundClass = profile.identity 
    ? identityClasses[profile.identity] 
    : 'bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600';

  return (
    <div 
      className="absolute inset-2 bg-black/90 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20 hover:shadow-3xl hover:scale-105 transition-all duration-500 group min-h-[600px]"
      style={style}
    >
      {/* Animated Border Effect */}
      <div className="absolute inset-0 rounded-3xl">
        <div className={`absolute inset-0 rounded-3xl ${backgroundClass} opacity-20 blur-xl`} />
      </div>


      {/* Main Photo with Identity Gradient Overlay */}
      <div className={`relative h-3/5 ${backgroundClass} overflow-hidden`}>
        <img 
          src={profile.photos[0] || '/api/placeholder/400/600'} 
          alt={profile.name}
          className="w-full h-full object-cover mix-blend-overlay opacity-90 hover:opacity-100 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Floating Star Effects */}
        <div className="absolute top-4 right-4 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
          <Star className="w-6 h-6 text-white animate-pulse" />
        </div>
        
        {/* Name and Age with Enhanced Typography */}
        <div className="absolute bottom-4 left-4 text-white">
          <h2 className="text-3xl font-bold mb-1 drop-shadow-lg hover:drop-shadow-2xl transition-all duration-300">
            {profile.name}
            {typeof profile.age === 'number' && profile.age > 0 ? `, ${profile.age}` : ''}
          </h2>
          <div className="flex items-center text-sm opacity-90 mb-2 hover:opacity-100 transition-opacity duration-300">
            <MapPin className="w-4 h-4 mr-1" />
            {profile.location}
          </div>
          {profile.pronouns ? (
            <div className="text-sm glass-pride px-3 py-1 rounded-full inline-block hover:scale-110 transition-transform duration-300 border border-white/30">
              {profile.pronouns}
            </div>
          ) : null}
        </div>
      </div>

      {/* Profile Info with Enhanced Styling */}
      <div className="p-6 h-2/5 overflow-y-auto bg-gradient-to-b from-transparent to-black/10">
        <p className="text-white/90 mb-4 leading-relaxed hover:text-white transition-colors duration-300">{profile.bio}</p>
        
        {/* Enhanced Interests with Staggered Animation */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(profile.interests ?? []).slice(0, 6).map((interest, index) => (
            <span 
              key={index}
              className="glass-pride text-white/90 px-3 py-1 rounded-full text-sm font-medium flex items-center border border-white/20 hover:border-white/40 hover:scale-105 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
              {interest}
            </span>
          ))}
        </div>
      </div>

      {/* Enhanced Action Buttons */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-6">
        <button
          onClick={onSwipeLeft}
          className="w-16 h-16 glass-pride shadow-xl rounded-full flex items-center justify-center hover:scale-125 hover:rotate-12 transition-all duration-300 border border-white/20 hover:border-red-400/50 group/btn"
        >
          <X className="w-7 h-7 text-red-400 group-hover/btn:text-red-300 transition-colors duration-300" />
        </button>
        <button
          onClick={onSwipeRight}
          className="w-16 h-16 btn-pride shadow-xl rounded-full flex items-center justify-center hover:scale-125 hover:-rotate-12 transition-all duration-300 group/btn overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-red-500 to-pink-500" />
          <Heart className="w-7 h-7 text-white relative z-10 group-hover/btn:animate-pulse" />
        </button>
      </div>
    </div>
  );
};

export default ProfileCard;
