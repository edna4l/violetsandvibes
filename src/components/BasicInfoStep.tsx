import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Briefcase } from 'lucide-react';

interface BasicInfoStepProps {
  profile: any;
  onUpdate: (updates: any) => void;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ profile, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Name *</label>
          <Input
            placeholder="Your name"
            value={profile.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="bg-white text-black placeholder:text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Age *</label>
          <Input
            placeholder="Your age"
            type="number"
            value={profile.age}
            onChange={(e) => onUpdate({ age: e.target.value })}
            className="bg-white text-black placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </label>
          <Input
            placeholder="City, State"
            value={profile.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            className="bg-white text-black placeholder:text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Occupation
          </label>
          <Input
            placeholder="Your job"
            value={profile.occupation}
            onChange={(e) => onUpdate({ occupation: e.target.value })}
            className="bg-white text-black placeholder:text-gray-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Bio *</label>
        <Textarea
          placeholder="Tell us about yourself... What makes you unique?"
          value={profile.bio}
          onChange={(e) => onUpdate({ bio: e.target.value })}
          rows={4}
          className="bg-white text-black placeholder:text-gray-500"
        />
      </div>
    </div>
  );
};

export { BasicInfoStep };
export default BasicInfoStep;
