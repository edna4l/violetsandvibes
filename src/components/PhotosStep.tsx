import React from 'react';
import { Camera } from 'lucide-react';
import { MultiPhotoUpload } from './MultiPhotoUpload';

interface PhotosStepProps {
  profile: any;
  onUpdate: (updates: any) => void;
}

const PhotosStep: React.FC<PhotosStepProps> = ({ profile, onUpdate }) => {
  const handlePhotosChange = (photos: string[]) => {
    onUpdate({ photos });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Profile Photos</h2>
        <p className="text-white/70">Add photos that show your personality</p>
      </div>

      <MultiPhotoUpload
        photos={profile.photos || []}
        onPhotosChange={handlePhotosChange}
        maxPhotos={6}
      />

      <div className="bg-blue-50 p-4 rounded-lg text-slate-700">
        <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Photo Guidelines
        </h3>
        <ul className="text-sm space-y-1">
          <li>• First photo will be your main profile picture</li>
          <li>• Clear face photos get 3x more matches</li>
          <li>• Show your personality and interests</li>
          <li>• No inappropriate or offensive content</li>
          <li>• Photos are uploaded and saved to your profile</li>
        </ul>
      </div>
    </div>
  );
};

export { PhotosStep };
export default PhotosStep;
