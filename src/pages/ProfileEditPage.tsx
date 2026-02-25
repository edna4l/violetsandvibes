import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedProfileCreationFlow, {
  type EnhancedProfileCreationFlowHandle,
} from '@/components/EnhancedProfileCreationFlow';
import ProfileEditDropdown from '@/components/ProfileEditDropdown';
import ProfileEditBottomMenu from '@/components/ProfileEditBottomMenu';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionTier } from '@/types/subscription';

const ProfileEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTier] = useState<SubscriptionTier>('free'); // This would come from user context
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const flowRef = useRef<EnhancedProfileCreationFlowHandle | null>(null);

  const handleComplete = async (profile: any) => {
    setIsLoading(true);
    try {
      console.log('Profile updated:', profile);
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
      setHasUnsavedChanges(false);
      navigate('/profile');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/profile');
      }
    } else {
      navigate('/profile');
    }
  };

  const handleSave = async () => {
    if (!flowRef.current) return;

    setIsLoading(true);
    toast({
      title: "Saving Profile",
      description: "Your changes are being saved...",
    });

    try {
      await flowRef.current.saveProfile();
      setHasUnsavedChanges(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    setShowPreview(!showPreview);
    toast({
      title: showPreview ? "Edit Mode" : "Preview Mode",
      description: showPreview ? "Back to editing" : "Viewing as others see you",
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + '/profile');
    toast({
      title: "Profile Link Copied",
      description: "Share your profile with others!",
    });
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleUpgrade = (tier?: SubscriptionTier) => {
    navigate('/subscription');
  };

  const handleAddPhoto = () => {
    setShowPreview(false);
    flowRef.current?.goToStep(4);

    toast({
      title: "Photo Upload",
      description: "Jumped to the Photos step.",
    });
  };

  const handleBoostProfile = () => {
    if (currentTier === 'free') {
      toast({
        title: "Upgrade Required",
        description: "Profile boost is available with Premium!",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Profile Boosted!",
      description: "Your profile will be shown to more people.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 pb-20">
      {/* Header with dropdown */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b p-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-bold">Edit Profile</h1>
          <ProfileEditDropdown
            onSave={handleSave}
            onPreview={handlePreview}
            onShare={handleShare}
            onSettings={handleSettings}
            onUpgrade={handleUpgrade}
            currentTier={currentTier}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="px-4">
        {currentTier === 'free' && (
          <div className="mb-4">
            <SubscriptionGate
              requiredTier="premium"
              currentTier={currentTier}
              featureName="Advanced Profile Features"
              onUpgrade={handleUpgrade}
            />
          </div>
        )}
        
        <EnhancedProfileCreationFlow
          ref={flowRef}
          onComplete={handleComplete} 
          onCancel={handleCancel}
          isPreview={showPreview}
          onDataChange={() => setHasUnsavedChanges(true)}
        />
      </div>

      {/* Bottom menu */}
      <ProfileEditBottomMenu
        onSave={handleSave}
        onCancel={handleCancel}
        onPreview={handlePreview}
        onAddPhoto={handleAddPhoto}
        onBoostProfile={handleBoostProfile}
        currentTier={currentTier}
        hasUnsavedChanges={hasUnsavedChanges}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ProfileEditPage;
