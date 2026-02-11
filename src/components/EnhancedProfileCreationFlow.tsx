import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useLocation } from 'react-router-dom';
import BasicInfoStep from './BasicInfoStep';
import IdentityStep from './IdentityStep';
import PhotosStep from './PhotosStep';
import InterestsSelector from './InterestsSelector';
import LifestyleStep from './LifestyleStep';
import SafetyStep from './SafetyStep';
import PrivacyStep from './PrivacyStep';
import ProfileValidation from './ProfileValidation';

interface EnhancedProfileCreationFlowProps {
  onComplete?: (profile: any) => void;
  onCancel?: () => void;
  isPreview?: boolean;
  onDataChange?: () => void;
}

function isMissingBirthdateColumnError(error: unknown): boolean {
  const message = (error as { message?: string })?.message ?? '';
  return message.includes("Could not find the 'birthdate' column") || message.includes('Could not find the "birthdate" column');
}

const EnhancedProfileCreationFlow: React.FC<EnhancedProfileCreationFlowProps> = ({ 
  onComplete, 
  onCancel,
  isPreview = false,
  onDataChange
}) => {
  const { user } = useAuth();
  const { profile: existingProfile, loading: profileLoading } = useProfile();
  const location = useLocation();
  const { toast } = useToast();
  const isEditing = location.state?.isEditing || false;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    location: '',
    occupation: '',
    bio: '',
    genderIdentity: '',
    sexualOrientation: '',
    showPronouns: false,
    interests: [],
    photos: [],
    lifestyle: {},
    safety: {
      blockUsers: [],
      reportedUsers: [],
      safetyTips: true,
      photoVerification: false
    },
    privacy: {
      profileVisibility: 'public',
      showLastActive: true,
      showDistance: true,
      showAge: true,
      allowMessagesFromStrangers: true,
      photoVerificationRequired: false,
      hideProfileFromSearch: false
    }
  });
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  // Load existing profile data for editing
  useEffect(() => {
    if (isEditing && existingProfile && !profileLoading) {
      setProfile({
        name: existingProfile.full_name || '',
        age: existingProfile.age?.toString() || '',
        location: existingProfile.location || '',
        occupation: existingProfile.occupation || '',
        bio: existingProfile.bio || '',
        genderIdentity: existingProfile.gender_identity || '',
        sexualOrientation: existingProfile.sexual_orientation || '',
        showPronouns: false,
        interests: existingProfile.interests || [],
        photos: existingProfile.photos || [],
        lifestyle: existingProfile.lifestyle_interests || {},
        safety: existingProfile.safety_settings || {
          blockUsers: [],
          reportedUsers: [],
          safetyTips: true,
          photoVerification: false
        },
        privacy: existingProfile.privacy_settings || {
          profileVisibility: 'public',
          showLastActive: true,
          showDistance: true,
          showAge: true,
          allowMessagesFromStrangers: true,
          photoVerificationRequired: false,
          hideProfileFromSearch: false
        }
      });
    }
  }, [isEditing, existingProfile, profileLoading]);

  const steps = [
    { title: 'Basic Info', component: BasicInfoStep },
    { title: 'Identity', component: IdentityStep },
    { title: 'Interests', component: InterestsSelector },
    { title: 'Lifestyle', component: LifestyleStep },
    { title: 'Photos', component: PhotosStep },
    { title: 'Privacy', component: PrivacyStep },
    { title: 'Safety', component: SafetyStep }
  ];

  const updateProfile = (updates: any) => {
    setProfile(prev => ({ ...prev, ...updates }));
    onDataChange?.();
    
    // Auto-save draft for editing mode
    if (isEditing) {
      autoSaveProfile(updates);
    }
  };

  const autoSaveProfile = async (updates: any) => {
    if (!user || autoSaving) return;
    
    setAutoSaving(true);
    try {
      const profileData = {
        ...profile,
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(profile.name && profile.age && profile.bio);
      case 1:
        return !!(profile.genderIdentity && profile.sexualOrientation);
      case 2:
        return profile.interests.length > 0;
      case 4:
        return profile.photos.length > 0;
      default:
        return true;
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const age = parseInt(profile.age);
      const birthdate = new Date();
      birthdate.setFullYear(birthdate.getFullYear() - age);

      const profileData = {
        id: user.id,
        full_name: profile.name,
        bio: profile.bio,
        location: profile.location,
        occupation: profile.occupation,
        birthdate: birthdate.toISOString().split('T')[0],
        gender_identity: profile.genderIdentity,
        sexual_orientation: profile.sexualOrientation,
        interests: profile.interests,
        photos: profile.photos,
        lifestyle_interests: profile.lifestyle || {},
        privacy_settings: profile.privacy,
        safety_settings: profile.safety || {},
        profile_completed: true,
        updated_at: new Date().toISOString()
      };

      let { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error && isMissingBirthdateColumnError(error)) {
        const { birthdate: _birthdate, ...fallbackProfileData } = profileData;
        const retry = await supabase
          .from('profiles')
          .upsert(fallbackProfileData);
        error = retry.error;
      }

      if (error) throw error;
      
      toast({
        title: "Profile Saved",
        description: "Your profile has been updated successfully.",
      });
      
      onComplete?.(profileData);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveProfile();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isValid = validateStep(currentStep);

  if (isPreview) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Profile Preview</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{profile.name}, {profile.age}</h3>
                <p className="text-sm text-gray-600">{profile.location}</p>
                <p className="text-sm text-gray-600">{profile.occupation}</p>
              </div>
              <div>
                <p className="text-sm">{profile.bio}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Interests:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profile.interests.map((interest, index) => (
                    <Badge key={index} variant="secondary">{interest}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <Badge variant="outline">{currentStep + 1} of {steps.length}</Badge>
            <h1 className="text-lg font-semibold">
              {isEditing ? `Edit ${steps[currentStep].title}` : steps[currentStep].title}
            </h1>
            {autoSaving && (
              <Badge variant="secondary" className="text-xs">
                <Save className="w-3 h-3 mr-1" />
                Saving...
              </Badge>
            )}
          </div>
          <Progress value={progress} className="mb-2" />
        </div>

        <ProfileValidation profile={profile} currentStep={currentStep} />
        
        {currentStep === 2 ? (
          <InterestsSelector
            selectedInterests={profile.interests}
            onSelectionChange={(interests) => updateProfile({ interests })}
          />
        ) : (
          <CurrentStepComponent profile={profile} onUpdate={updateProfile} />
        )}

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={currentStep === 0 && onCancel ? onCancel : prevStep}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 && onCancel ? 'Cancel' : 'Back'}
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={!isValid || saving}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {saving ? 'Saving...' : currentStep === steps.length - 1 ? 
              (isEditing ? 'Save Changes' : 'Complete Profile') : 'Continue'}
            {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedProfileCreationFlow;
