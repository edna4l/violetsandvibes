import React, { useState } from 'react';

const ProfilePhotos: React.FC = () => {
    const [photos, setPhotos] = useState<File[]>([]);

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const uploadedPhotos = Array.from(event.target.files);
            setPhotos(prevPhotos => [...prevPhotos, ...uploadedPhotos]);
        }
    };

    const handlePhotoRemove = (index: number) => {
        setPhotos(prevPhotos => prevPhotos.filter((_, i) => i !== index));
    };

    return (
        <div>
            <h2>Upload Profile Photos</h2>
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
            <div>
                {photos.map((photo, index) => (
                    <div key={index}>
                        <img src={URL.createObjectURL(photo)} alt={`Profile ${index}`} width="100" />
                        <button onClick={() => handlePhotoRemove(index)}>Remove</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProfilePhotos;