import React from 'react';

const IdentityExpression: React.FC = () => {
    const [genderIdentity, setGenderIdentity] = React.useState('');
    const [pronouns, setPronouns] = React.useState('');

    const handleGenderIdentityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setGenderIdentity(event.target.value);
    };

    const handlePronounsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPronouns(event.target.value);
    };

    return (
        <div>
            <h2>Identity and Expression</h2>
            <div>
                <label>
                    Gender Identity:
                    <input
                        type="text"
                        value={genderIdentity}
                        onChange={handleGenderIdentityChange}
                    />
                </label>
            </div>
            <div>
                <label>
                    Pronouns:
                    <input
                        type="text"
                        value={pronouns}
                        onChange={handlePronounsChange}
                    />
                </label>
            </div>
        </div>
    );
};

export default IdentityExpression;