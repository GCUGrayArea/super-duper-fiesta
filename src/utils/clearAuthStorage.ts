/**
 * Utility to clear Firebase Auth localStorage data for session-only persistence
 * This ensures no authentication data persists across browser sessions
 */
export const clearFirebaseAuthStorage = (): void => {
  try {
    // Clear Firebase Auth related localStorage items
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      // Firebase Auth typically stores data with keys like:
      // firebase:authUser:[API_KEY]:[APP_NAME]
      // firebase:host:[PROJECT_ID]
      if (key.startsWith('firebase:authUser:') || 
          key.startsWith('firebase:host:') ||
          key.startsWith('firebase:') ||
          key.includes('firebaseui') ||
          key.includes('firebase-heartbeat')) {
        localStorage.removeItem(key);
      }
    });
    
    // Also clear sessionStorage Firebase items
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.startsWith('firebase:') || key.includes('firebase')) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Nuclear option: Clear ALL storage if Firebase keys still exist
    const remainingLocalKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('firebase:') || key.includes('firebase')
    );
    const remainingSessionKeys = Object.keys(sessionStorage).filter(key => 
      key.startsWith('firebase:') || key.includes('firebase')
    );
    
    if (remainingLocalKeys.length > 0 || remainingSessionKeys.length > 0) {
      // Clear all storage as fallback
      try {
        localStorage.clear();
      } catch (clearError) {
        console.error('Could not clear localStorage:', clearError);
      }
      
      try {
        sessionStorage.clear();
      } catch (clearError) {
        console.error('Could not clear sessionStorage:', clearError);
      }
    }
    
  } catch (error) {
    console.warn('Could not clear Firebase Auth storage:', error);
  }
};
