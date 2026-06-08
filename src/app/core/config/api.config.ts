/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

export const API_CONFIG = {
  BASE_URL: 'http://localhost:8080/api/v1',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
    },
    USERS: {
      ME: '/users/me',
      PASSWORD: '/users/me/password',
    },
    ANALYTICS: {
      OVERVIEW: '/analytics/overview',
      ACTIVITY: '/analytics/activity',
    },
    TEAMS: {
      BASE:     '/teams',
      MY_TEAMS: '/teams/my-teams',
      SEARCH:   '/teams/search',
    },
    CHANNELS: '/channels',
  }
};

/**
 * Helper function to construct full API URLs
 */
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}
