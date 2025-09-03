// Function to handle Google Sign-in
async function signInWithGoogle() {
  try {
    // Get the Google OAuth URL from our Edge Function
    const response = await fetch('/functions/v1/google-auth/login');
    const { url } = await response.json();
    
    // Redirect to Google OAuth page
    window.location.href = url;
  } catch (error) {
    console.error('Error starting Google OAuth flow:', error);
  }
}

// Add event listener to your sign-in button
document.getElementById('google-sign-in-btn').addEventListener('click', signInWithGoogle);
