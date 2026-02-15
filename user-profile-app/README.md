# User Profile App

This project is a user profile setup application built with React and TypeScript. It allows users to create and manage their profiles through a multi-step process. The application is structured to guide users through various sections, ensuring a smooth and intuitive experience.

## Project Structure

The project consists of the following main components:

- **BasicInfo**: A component for collecting basic user information such as name, email, and phone number.
- **IdentityExpression**: A component that allows users to specify their identity and expression preferences, including gender identity and pronouns.
- **LifestyleInterests**: A component that gathers information about the user's lifestyle choices and interests, such as hobbies and activities.
- **ProfilePhotos**: A component that enables users to upload and manage their profile photos.
- **SafetySecurity**: A component that allows users to adjust their safety and security settings, including privacy options and account security features.

## Pages

The application includes the following pages:

- **ProfileSetup**: The main page that orchestrates the profile setup process by rendering the components in the specified order:
  1. Basic Info
  2. Identity and Expression
  3. Lifestyle and Interests
  4. Profile Photos
  5. Safety and Security

- **Index**: The entry point for the application, rendering the `ProfileSetup` component.

## Types

The project utilizes TypeScript for type safety. The `types` directory contains interfaces and types used throughout the application, such as `UserProfile` and `ProfileSettings`.

## Installation

To get started with the project, clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd user-profile-app
npm install
```

## Usage

To run the application, use the following command:

```bash
npm start
```

This will start the development server and open the application in your default browser.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.