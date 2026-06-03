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
        // tap() only runs on 2xx — a successful HTTP response IS a successful login.
        // Extract user/token from top-level fields OR a nested `data` wrapper
        // (ApiResponse<T> shape: { data: { token, user }, message }).
        const payload = (response as any).data ?? response;
        const token: string | null =
          payload.accessToken ?? payload.token ?? payload.access_token ?? null;
        const refreshToken: string | null = payload.refreshToken ?? null;
        const user: User =
          payload.user ?? response.user ?? {
            email: credentials.email,
            firstName: credentials.email.split('@')[0],
            lastName: '',
            username: credentials.email.split('@')[0],
          };
        if (!token) {
          this.updateAuthState({
            ...this.authState$.value,
            isAuthenticated: false,
            error: 'Login failed: no token received',
            loading: false,
          });
          return;
        }
        this.updateAuthState({
          isAuthenticated: true,
          user,
          token,
          refreshToken,
          loading: false,
          error: null,
        });
      }),
      catchError((error) => {
        this.updateAuthState({
          ...this.authState$.value,
          error: error.error?.message || 'Login failed',
          loading: false,
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
        // tap() only runs on 2xx — same rationale as login().
        const payload = (response as any).data ?? response;
        const token: string | null =
          payload.accessToken ?? payload.token ?? payload.access_token ?? null;
        const refreshToken: string | null = payload.refreshToken ?? null;
        const user: User =
          payload.user ?? response.user ?? {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username,
          };
        if (!token) {
          this.updateAuthState({
            ...this.authState$.value,
            isAuthenticated: false,
            error: 'Registration failed: no token received',
            loading: false,
          });
          return;
        }
        this.updateAuthState({
          isAuthenticated: true,
          user,
          token,
          refreshToken,
          loading: false,
          error: null,
        });
      }),
      catchError((error) => {
        this.updateAuthState({
          ...this.authState$.value,
          error: error.error?.message || 'Registration failed',
          loading: false,
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
    localStorage.removeItem(this.STORAGE_KEY);
    this.authState$.next(this.getInitialState());
  }

  /**
   * Get initial authentication state
   */
  private getInitialState(): AuthState {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
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
        if (state.isAuthenticated && state.token) {
          this.authState$.next(state);
        } else {
          localStorage.removeItem(this.STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to load auth state from storage', error);
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }
}
