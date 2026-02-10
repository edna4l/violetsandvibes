import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BasicInfoStep } from './BasicInfoStep';
import { IdentityStep } from './IdentityStep';
import { LifestyleStep } from './LifestyleStep';
import { PhotosStep } from './PhotosStep';
import { PrivacyStep } from './PrivacyStep';
import { SafetyStep } from './SafetyStep';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from "react-router-dom";

const ProfileCreationFlow: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    safety: {},
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

  const steps = [
    { title: 'Basic Info', component: BasicInfoStep },
    { title: 'Identity', component: IdentityStep },
    { title: 'Lifestyle', component: LifestyleStep },
    { title: 'Photos', component: PhotosStep },
    { title: 'Privacy', component: PrivacyStep },
    { title: 'Safety', component: SafetyStep }
  ];

  const updateProfile = (updates: any) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(profile.name && profile.age && profile.bio);
      case 1:
        return !!(profile.genderIdentity && profile.sexualOrientation);
      case 2:
        return profile.interests.length > 0;
      case 3:
        return profile.photos.length > 0;
      default:
        return true;
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Calculate age from birthdate if age is provided as string
      const age = parseInt(profile.age);
      const birthdate = new Date();
      birthdate.setFullYear(birthdate.getFullYear() - age);

      // Prepare profile data to match database schema
      const profileData = {
        id: user.id,
        full_name: profile.name,
        bio: profile.bio,
        location: profile.location,
        occupation: profile.occupation,
        birthdate: birthdate.toISOString().split('T')[0], // YYYY-MM-DD format
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

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      // Navigate to main app or show success
      console.log('Profile saved successfully');
      navigate("/profile", { replace: true });
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
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

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isValid = validateStep(currentStep);

  return (
    <div className="page-calm p-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <Badge variant="outline">{currentStep + 1} of {steps.length}</Badge>
              <h1 className="text-lg font-semibold">{steps[currentStep].title}</h1>
            </div>
            <Progress value={progress} className="mb-2" />
          </div>

          <CurrentStepComponent profile={profile} onUpdate={updateProfile} />

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <Button
              onClick={nextStep}
              disabled={!isValid || saving}
              className="bg-pink-500 hover:bg-pink-600"
            >
              {saving ? 'Saving...' : currentStep === steps.length - 1 ? 'Complete Profile' : 'Continue'}
              {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCreationFlow;
