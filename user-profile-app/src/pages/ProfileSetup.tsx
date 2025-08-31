import React from 'react';
import BasicInfo from '../components/BasicInfo';
import IdentityExpression from '../components/IdentityExpression';
import LifestyleInterests from '../components/LifestyleInterests';
import ProfilePhotos from '../components/ProfilePhotos';
import SafetySecurity from '../components/SafetySecurity';

const ProfileSetup: React.FC = () => {
    return (
        <div>
            <h1>Profile Setup</h1>
            <BasicInfo />
            <IdentityExpression />
            <LifestyleInterests />
            <ProfilePhotos />
            <SafetySecurity />
        </div>
    );
};

export default ProfileSetup;