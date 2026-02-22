import React from 'react';

const SafetySecurity: React.FC = () => {
    return (
        <div>
            <h2>Safety and Security Settings</h2>
            <form>
                <div>
                    <label htmlFor="privacyOptions">Privacy Options:</label>
                    <select id="privacyOptions" name="privacyOptions">
                        <option value="public">Public</option>
                        <option value="friends">Friends Only</option>
                        <option value="private">Private</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="twoFactorAuth">Enable Two-Factor Authentication:</label>
                    <input type="checkbox" id="twoFactorAuth" name="twoFactorAuth" />
                </div>
                <div>
                    <label htmlFor="accountRecovery">Account Recovery Options:</label>
                    <input type="text" id="accountRecovery" name="accountRecovery" placeholder="Recovery Email or Phone" />
                </div>
                <button type="submit">Save Settings</button>
            </form>
        </div>
    );
};

export default SafetySecurity;