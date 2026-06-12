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
      ADMIN_CREATE: '/users',
    },
    ORGANIZATIONS: {
      BASE: '/organizations',
      SEARCH: '/organizations/search',
      MY: '/organizations/my',
    },
    TEAMS: {
      BASE: '/teams',
      MY_TEAMS: '/teams/my-teams',
      SEARCH: '/teams/search',
    },
    CHANNELS: '/channels',
    ANALYTICS: {
      OVERVIEW: '/analytics/overview',
      ACTIVITY: '/analytics/activity',
    },
    NOTIFICATIONS: {
      BASE: '/notifications',
      UNREAD: '/notifications/unread',
      UNREAD_COUNT: '/notifications/unread/count',
      READ_ALL: '/notifications/read-all',
    },
  }
};

/**
 * Helper function to construct full API URLs
 */
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}
