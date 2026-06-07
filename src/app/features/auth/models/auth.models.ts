export type UserRole = 'admin' | 'owner' | 'member' | 'viewer';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}

export interface AuthResponse {
  token?: string;
  user?: User;
  message?: string;
  success?: boolean;
}

export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  roles?: UserRole[];
  avatar?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

export interface TokenRefreshResponse {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
}
