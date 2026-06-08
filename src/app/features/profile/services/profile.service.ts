import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { getApiUrl } from '@core/config/api.config';
import { User } from '@features/auth/models/auth.models';
import { AuthService } from '@features/auth/services/auth.service';

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  username: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getProfile(): Observable<User> {
    return this.http.get<User>(getApiUrl('/users/me'));
  }

  updateProfile(data: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(getApiUrl('/users/me'), data).pipe(
      tap(updated => this.authService.updateUser(updated)),
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(getApiUrl('/users/me/password'), data);
  }
}
