/**
 * Safely clear authentication-related localStorage data
 * Handles cases where localStorage might be corrupted or unavailable
 */
export const clearAuthData = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    
    return;
  }
  
  try {
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
  } catch (error) {
    console.error('Failed to clear auth data:', error);
    // If localStorage is completely unavailable, we can't do much
    // The app should handle this gracefully
  }
};

/**
 * Safely get item from localStorage with error handling
 */
export const safeGetItem = (key: string): string | null => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to get ${key} from localStorage:`, error);
    return null;
  }
};

/**
 * Safely set item in localStorage with error handling
 */
export const safeSetItem = (key: string, value: string): boolean => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Failed to set ${key} in localStorage:`, error);
    return false;
  }
};
