import React from 'react';
import GlobalNavigation from '@/components/GlobalNavigation';
import ScrollableLayout from '@/components/ScrollableLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, MapPin, Camera, UserPlus, Star, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import MessageButton from '@/components/MessageButton';
import ProfileMenu from '@/components/ProfileMenu';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { profile, loading, error } = useProfile(id);
  
  const isOwnProfile = !id || (user && profile?.user_id === user.id);

  if (loading) {
    return (
      <div className="min-h-screen page-calm flex items-center justify-center">
        <div className="max-w-md mx-auto glass-pride backdrop-blur-xl rounded-lg p-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin gradient-text-pride" />
            <p className="text-black font-bold">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen page-calm">
        <div className="max-w-md mx-auto glass-pride min-h-screen backdrop-blur-xl">
          <GlobalNavigation showBackButton={true} title="My Profile" />
          <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="card-pride border-0 shadow-xl w-full">
              <CardContent className="pt-6 text-center">
                <h3 className="text-xl font-bold gradient-text-pride mb-4">
                  No Profile Found
                </h3>
                <p className="text-black font-bold mb-6">
                  It looks like you haven't created a profile yet. Let's get you started!
                </p>
                <Button 
                  className="w-full btn-pride text-white font-bold py-3"
                  onClick={() => navigate('/create-new-profile')}
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Your Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return (name || '').split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const profilePhoto = profile.photos && profile.photos.length > 0 
    ? profile.photos[0] 
    : `https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face`;

  return (
    <div className="p-4 space-y-6">
      <Card className="card-pride border-0 shadow-xl">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-28 h-28 border-4 border-white/30 shadow-2xl animate-bounce" style={{animationDuration: '3s'}}>
                <AvatarImage src={profilePhoto} />
                <AvatarFallback className="lesbian-gradient text-white text-xl font-bold">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <Button size="sm" className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 btn-pride shadow-lg hover:scale-110 transition-all animate-pulse" style={{animationDuration: '4s'}}>
                <Camera className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="text-center">
              <h2 className="text-3xl font-bold gradient-text-pride animate-pulse" style={{animationDuration: '4s'}}>
                {profile.name}, {profile.age}
              </h2>
              {profile.location && (
                <div className="flex items-center justify-center gap-1 text-black font-bold mt-2">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.location}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap justify-center">
              {profile.lgbtq_status && (
                <Badge className="lesbian-gradient text-white border-0 shadow-md animate-pulse" style={{animationDuration: '3s'}}>
                  {profile.lgbtq_status}
                </Badge>
              )}
              {profile.interests && profile.interests.map((interest, index) => (
                <Badge 
                  key={index}
                  className="bi-gradient text-white border-0 shadow-md animate-pulse" 
                  style={{animationDuration: `${4 + index}s`}}
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-pride border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gradient-text-pride animate-pulse" style={{animationDuration: '4s'}}>
            About Me
            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-white/20 rounded-full"
                  onClick={() => navigate('/edit-profile')}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              ) : (
                <ProfileMenu userId={profile.user_id} userName={profile.name} />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-black font-bold leading-relaxed">
            {profile.bio || "Tell us about yourself! Click edit to add your bio."}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3 pb-6">
        {isOwnProfile ? (
          <>
            <Button 
              className="w-full btn-pride text-white font-bold py-3 shadow-xl hover:scale-105 transition-all animate-pulse"
              style={{animationDuration: '4s'}}
              onClick={() => navigate('/edit-profile')}
            >
              <Edit className="w-5 h-5 mr-2" />
              Edit My Profile
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-2 border-yellow-300 hover:bg-gradient-to-r hover:from-yellow-100 hover:to-orange-100 py-3 font-bold shadow-lg hover:scale-105 transition-all animate-pulse" 
              style={{animationDuration: '6s'}}
              onClick={() => navigate('/subscription')}
            >
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Upgrade to Premium
            </Button>
          </>
        ) : (
          <MessageButton 
            userId={profile.user_id} 
            userName={profile.name}
            className="w-full btn-pride text-white font-bold py-3"
          />
        )}
      </div>
    </div>
  );
};

export default ProfilePage;