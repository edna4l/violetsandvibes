import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Camera, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface MultiPhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export const MultiPhotoUpload: React.FC<MultiPhotoUploadProps> = ({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 6 
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || photos.length >= maxPhotos) return;

    if (!user) {
      setError('You must be logged in to upload photos');
      return;
    }

    setUploading(true);
    setError(null);
    const newPhotos = [...photos];

    for (let i = 0; i < files.length && newPhotos.length < maxPhotos; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        continue;
      }

      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      try {
        console.log('Uploading file:', fileName);
        
        const { data, error: uploadError } = await supabase.storage
          .from('profile-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setError(`Upload failed: ${uploadError.message}`);
          continue;
        }

        console.log('Upload successful:', data);

        const { data: urlData } = supabase.storage
          .from('profile-media')
          .getPublicUrl(fileName);

        console.log('Public URL:', urlData.publicUrl);
        newPhotos.push(urlData.publicUrl);
        
      } catch (error) {
        console.error('Upload error:', error);
        setError('Upload failed. Please try again.');
      }
    }

    onPhotosChange(newPhotos);
    setUploading(false);
    
    // Clear the input
    event.target.value = '';
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-square">
            <img 
              src={photo} 
              alt={`Profile ${index + 1}`}
              className="w-full h-full object-cover rounded-lg"
              onError={() => {
                console.error('Failed to load image:', photo);
                setError('Failed to load image');
              }}
            />
            <button
              onClick={() => removePhoto(index)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
            {index === 0 && (
              <div className="absolute bottom-2 left-2 bg-pink-500 text-white px-2 py-1 rounded text-xs">
                Main
              </div>
            )}
          </div>
        ))}
        
        {photos.length < maxPhotos && (
          <label className="aspect-square border-2 border-dashed border-white/40 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-pink-300 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading || !user}
            />
            {uploading ? (
              <div className="animate-spin w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full" />
            ) : (
              <>
                <Plus className="w-8 h-8 text-white/70 mb-2" />
                <span className="text-sm text-white/80">
                  {user ? 'Add Photo' : 'Login Required'}
                </span>
              </>
            )}
          </label>
        )}
      </div>
      
      <div className="text-center">
        <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm inline-block">
          {photos.length}/{maxPhotos}
        </div>
      </div>

      <div className="text-xs text-white/70 text-center">
        Max file size: 5MB • Supported formats: JPG, PNG, GIF
      </div>
    </div>
  );
};

export default MultiPhotoUpload;
