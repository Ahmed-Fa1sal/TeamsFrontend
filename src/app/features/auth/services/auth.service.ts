/**
 * Authentication Service
 * Manages authentication state and API calls
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { getApiUrl } from '@core/config/api.config';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthState,
  User
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'auth_state';
  private authState$ = new BehaviorSubject<AuthState>(this.getInitialState());

  constructor(private http: HttpClient) {
    this.loadAuthState();
  }

  /**
   * Get authentication state as observable
   */
  getAuthState(): Observable<AuthState> {
    return this.authState$.asObservable();
  }

  /**
   * Get current authentication state
   */
  getCurrentAuthState(): AuthState {
    return this.authState$.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState$.value.isAuthenticated;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.authState$.value.user;
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return this.authState$.value.token;
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    const url = getApiUrl('/auth/login');
    return this.http.post<AuthResponse>(url, credentials).pipe(
      tap((response) => {
        // Normalize response shapes: support { token, user } and { code, data: { accessToken, user } }
        const raw: any = response as any;
        const token = raw.token || raw.accessToken || raw.data?.accessToken || null;
        const user = raw.user || raw.data?.user || null;
        const isSuccess = raw.success === true || !!token || !!user || raw.code === 200;

        if (isSuccess) {
          const newState: AuthState = {
            isAuthenticated: true,
            user:
              user ||
              ({
                email: credentials.email,
                firstName: credentials.email.split('@')[0],
                lastName: '',
                username: credentials.email.split('@')[0]
              } as any),
            token: token || null,
            loading: false,
            error: null
          };
          this.updateAuthState(newState);
        }
      }),
      catchError((error) => {
        this.updateAuthState({
          ...this.authState$.value,
          error: error.error?.message || 'Login failed',
          loading: false
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Register user
   */
  register(data: RegisterRequest): Observable<AuthResponse> {
    const url = getApiUrl('/auth/register');
    return this.http.post<AuthResponse>(url, data).pipe(
      tap((response) => {
        const raw: any = response as any;
        const token = raw.token || raw.accessToken || raw.data?.accessToken || null;
        const user = raw.user || raw.data?.user || null;
        const isSuccess = raw.success === true || !!token || !!user || raw.code === 200;

        if (isSuccess) {
          const newState: AuthState = {
            isAuthenticated: true,
            user:
              user ||
              ({
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                username: data.username
              } as any),
            token: token || null,
            loading: false,
            error: null
          };
          this.updateAuthState(newState);
        }
      }),
      catchError((error) => {
        this.updateAuthState({
          ...this.authState$.value,
          error: error.error?.message || 'Registration failed',
          loading: false
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<AuthResponse> {
    const url = getApiUrl('/auth/logout');
    return this.http.post<AuthResponse>(url, {}).pipe(
      tap(() => {
        this.clearAuthState();
      }),
      catchError((error) => {
        // Clear state even if logout API fails
        this.clearAuthState();
        return throwError(() => error);
      })
    );
  }

  /**
   * Update authentication state
   */
  private updateAuthState(state: AuthState): void {
    this.authState$.next(state);
    this.saveAuthState(state);
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    const newState = this.getInitialState();
    this.updateAuthState(newState);
  }

  /**
   * Get initial authentication state
   */
  private getInitialState(): AuthState {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null
    };
  }

  /**
   * Save authentication state to local storage
   */
  private saveAuthState(state: AuthState): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Load authentication state from local storage
   */
  private loadAuthState(): void {
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState) as AuthState;
        if (state.isAuthenticated) {
          this.authState$.next(state);
        }
      } catch (error) {
        console.error('Failed to load auth state from storage', error);
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }
}
