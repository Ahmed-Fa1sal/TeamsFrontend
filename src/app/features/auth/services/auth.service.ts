import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, map, take, tap } from 'rxjs/operators';
import { getApiUrl } from '@core/config/api.config';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthState,
  User,
  TokenRefreshResponse,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'auth_state';
  private readonly authState$ = new BehaviorSubject<AuthState>(this.getInitialState());

  // Token-refresh concurrency guard
  private isRefreshing = false;
  private readonly tokenSubject$ = new BehaviorSubject<string | null>(null);

  constructor(private readonly http: HttpClient) {
    this.loadAuthState();
  }

  getAuthState(): Observable<AuthState> {
    return this.authState$.asObservable();
  }

  getCurrentAuthState(): AuthState {
    return this.authState$.value;
  }

  isAuthenticated(): boolean {
    return this.authState$.value.isAuthenticated;
  }

  getCurrentUser(): User | null {
    return this.authState$.value.user;
  }

  getToken(): string | null {
    return this.authState$.value.token;
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    const url = getApiUrl('/auth/login');
    return this.http.post<AuthResponse>(url, credentials).pipe(
      tap((response) => {
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
      }),
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    const url = getApiUrl('/auth/register');
    return this.http.post<AuthResponse>(url, data).pipe(
      tap((response) => {
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
      }),
    );
  }

  logout(): Observable<AuthResponse> {
    const url = getApiUrl('/auth/logout');
    return this.http.post<AuthResponse>(url, {}).pipe(
      tap(() => this.clearAuthState()),
      catchError((error) => {
        this.clearAuthState();
        return throwError(() => error);
      }),
    );
  }

  /** Refresh the access token using the stored refresh token.
   *  Concurrent callers queue behind the first in-flight refresh. */
  refreshAccessToken(): Observable<string> {
    const { refreshToken } = this.authState$.value;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    if (this.isRefreshing) {
      return this.tokenSubject$.pipe(
        filter((t): t is string => t !== null),
        take(1),
      );
    }

    this.isRefreshing = true;
    this.tokenSubject$.next(null);

    return this.http
      .post<TokenRefreshResponse>(getApiUrl('/auth/refresh'), { refreshToken })
      .pipe(
        map(response => {
          const newToken = response.accessToken ?? response.token;
          if (!newToken) throw new Error('No token in refresh response');
          return newToken;
        }),
        tap(newToken => {
          this.updateAuthState({ ...this.authState$.value, token: newToken });
          this.isRefreshing = false;
          this.tokenSubject$.next(newToken);
        }),
        catchError(error => {
          this.isRefreshing = false;
          this.tokenSubject$.next(null);
          this.forceLogout();
          return throwError(() => error);
        }),
      );
  }

  /** Clear auth state locally without hitting the logout endpoint. */
  forceLogout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.authState$.next(this.getInitialState());
  }

  /** Update the stored user object (e.g. after a profile save). */
  updateUser(user: User): void {
    this.updateAuthState({ ...this.authState$.value, user });
  }

  private updateAuthState(state: AuthState): void {
    this.authState$.next(state);
    this.saveAuthState(state);
  }

  private clearAuthState(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.authState$.next(this.getInitialState());
  }

  private getInitialState(): AuthState {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      loading: false,
      error: null,
    };
  }

  private saveAuthState(state: AuthState): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  private loadAuthState(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved) as AuthState;
        if (state.isAuthenticated && state.token) {
          this.authState$.next(state);
        } else {
          localStorage.removeItem(this.STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }
}
