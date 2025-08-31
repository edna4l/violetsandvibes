export interface UserProfile {
    name: string;
    email: string;
    phoneNumber: string;
    genderIdentity: string;
    pronouns: string;
    hobbies: string[];
    profilePhotos: string[];
}

export interface ProfileSettings {
    privacyOptions: boolean;
    accountSecurity: boolean;
}