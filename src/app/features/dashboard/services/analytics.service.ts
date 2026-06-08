import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { getApiUrl } from '@core/config/api.config';

export interface AnalyticsOverview {
  totalTeams: number;
  totalChannels: number;
  totalMembers: number;
  totalMessages: number;
  activeUsers: number;
  meetingsThisWeek: number;
}

export interface ActivityDataPoint {
  day: string;
  messages: number;
  meetings: number;
}

export interface RecentActivity {
  id: string;
  type: 'message' | 'meeting' | 'team' | 'channel' | 'member';
  message: string;
  time: string;
  icon: string;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);

  getOverview(): Observable<AnalyticsOverview> {
    return this.http
      .get<AnalyticsOverview>(getApiUrl('/analytics/overview'))
      .pipe(catchError(() => of(this.mockOverview())));
  }

  getWeeklyActivity(): Observable<ActivityDataPoint[]> {
    return this.http
      .get<ActivityDataPoint[]>(getApiUrl('/analytics/activity'))
      .pipe(catchError(() => of(this.mockActivity())));
  }

  getRecentActivity(): Observable<RecentActivity[]> {
    return of(this.mockRecentActivity());
  }

  private mockOverview(): AnalyticsOverview {
    return {
      totalTeams: 4,
      totalChannels: 5,
      totalMembers: 24,
      totalMessages: 1248,
      activeUsers: 18,
      meetingsThisWeek: 7,
    };
  }

  private mockActivity(): ActivityDataPoint[] {
    return [
      { day: 'Mon', messages: 42,  meetings: 2 },
      { day: 'Tue', messages: 87,  meetings: 3 },
      { day: 'Wed', messages: 65,  meetings: 1 },
      { day: 'Thu', messages: 103, meetings: 4 },
      { day: 'Fri', messages: 78,  meetings: 2 },
      { day: 'Sat', messages: 15,  meetings: 0 },
      { day: 'Sun', messages: 8,   meetings: 0 },
    ];
  }

  private mockRecentActivity(): RecentActivity[] {
    return [
      { id: '1', type: 'message', message: 'New message in #general',       time: '2 min ago',  icon: 'pi pi-comment',  color: '#5b5fc7' },
      { id: '2', type: 'member',  message: 'Sarah joined Engineering team',  time: '15 min ago', icon: 'pi pi-user-plus', color: '#237b4b' },
      { id: '3', type: 'meeting', message: 'Sprint planning meeting ended',  time: '1 hr ago',   icon: 'pi pi-video',    color: '#d83b01' },
      { id: '4', type: 'channel', message: '#design-system was updated',     time: '2 hr ago',   icon: 'pi pi-hashtag',  color: '#008299' },
      { id: '5', type: 'team',    message: 'Marketing added 2 channels',     time: '3 hr ago',   icon: 'pi pi-users',    color: '#b86800' },
    ];
  }
}
