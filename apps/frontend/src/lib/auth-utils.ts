/**
 * Safely clear authentication-related localStorage data
 * Handles cases where localStorage might be corrupted or unavailable
 */
export const clearAuthData = () => {
  try {
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('Auth data cleared successfully');
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
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Failed to set ${key} in localStorage:`, error);
    return false;
  }
};
