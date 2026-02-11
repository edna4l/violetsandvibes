import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';

interface PrivacyStepProps {
  profile: any;
  onUpdate: (updates: any) => void;
}

const PrivacyStep: React.FC<PrivacyStepProps> = ({ profile, onUpdate }) => {
  const updatePrivacySetting = (key: string, value: any) => {
    onUpdate({
      privacy: {
        ...profile.privacy,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Privacy & Safety Settings</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="font-medium">Profile Visibility</span>
          </div>
          <Select 
            value={profile.privacy?.profileVisibility || 'public'}
            onValueChange={(value) => updatePrivacySetting('profileVisibility', value)}
          >
            <SelectTrigger className="w-32 bg-white text-black">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <span>Show Last Active</span>
          <Switch
            checked={profile.privacy?.showLastActive ?? true}
            onCheckedChange={(checked) => updatePrivacySetting('showLastActive', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span>Show Distance</span>
          <Switch
            checked={profile.privacy?.showDistance ?? true}
            onCheckedChange={(checked) => updatePrivacySetting('showDistance', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span>Show Age</span>
          <Switch
            checked={profile.privacy?.showAge ?? true}
            onCheckedChange={(checked) => updatePrivacySetting('showAge', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span>Allow Messages from Strangers</span>
          <Switch
            checked={profile.privacy?.allowMessagesFromStrangers ?? true}
            onCheckedChange={(checked) => updatePrivacySetting('allowMessagesFromStrangers', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span>Photo Verification Required</span>
          <Switch
            checked={profile.privacy?.photoVerificationRequired ?? false}
            onCheckedChange={(checked) => updatePrivacySetting('photoVerificationRequired', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span>Hide Profile from Search</span>
          <Switch
            checked={profile.privacy?.hideProfileFromSearch ?? false}
            onCheckedChange={(checked) => updatePrivacySetting('hideProfileFromSearch', checked)}
          />
        </div>
      </div>
    </div>
  );
};

export { PrivacyStep };
export default PrivacyStep;
