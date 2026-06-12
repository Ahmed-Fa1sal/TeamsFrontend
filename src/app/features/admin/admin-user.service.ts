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
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly http = inject(HttpClient);

  createUser(request: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(
      getApiUrl(API_CONFIG.ENDPOINTS.USERS.ADMIN_CREATE),
      request
    );
  }
}
