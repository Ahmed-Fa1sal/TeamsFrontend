import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, getApiUrl } from '@core/config/api.config';
import { Notification, NotificationPage, UnreadCountResponse } from './notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationFetcherService {
  private readonly http = inject(HttpClient);

  private get base(): string {
    return getApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE);
  }

  getAll(page = 0, size = 20): Observable<NotificationPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<NotificationPage>(this.base, { params });
  }

  getUnread(page = 0, size = 20): Observable<NotificationPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<NotificationPage>(
      getApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.UNREAD),
      { params }
    );
  }

  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(
      getApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT)
    );
  }

  markAsRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(
      getApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.READ_ALL),
      {}
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
