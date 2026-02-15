import React, { useState } from 'react';

const LifestyleInterests: React.FC = () => {
    const [hobbies, setHobbies] = useState<string>('');
    const [activities, setActivities] = useState<string>('');

    const handleHobbiesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setHobbies(event.target.value);
    };

    const handleActivitiesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setActivities(event.target.value);
    };

    return (
        <div>
            <h2>Lifestyle and Interests</h2>
            <div>
                <label>
                    Hobbies:
                    <input
                        type="text"
                        value={hobbies}
                        onChange={handleHobbiesChange}
                        placeholder="Enter your hobbies"
                    />
                </label>
            </div>
            <div>
                <label>
                    Activities:
                    <input
                        type="text"
                        value={activities}
                        onChange={handleActivitiesChange}
                        placeholder="Enter your activities"
                    />
                </label>
            </div>
        </div>
    );
};

export default LifestyleInterests;