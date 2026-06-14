import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, getApiUrl } from '@core/config/api.config';

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface CreateUserResponse {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly http = inject(HttpClient);

  /**
   * Creates a user through the registration endpoint — the proven
   * user-creation path on this backend (same payload the public
   * register flow uses). It is allow-listed in the JWT interceptor,
   * and because we call HttpClient directly here, the admin's own
   * auth state is never touched by the response.
   */
  createUser(request: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(
      getApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER),
      request
    );
  }
}
