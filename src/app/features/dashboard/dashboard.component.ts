import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import gsap from 'gsap';

import { AuthService } from '@features/auth/services/auth.service';
import { User } from '@features/auth/models/auth.models';
import { ChatWebSocketService } from '@features/chat/services/chat-websocket.service';
import {
  AnalyticsService,
  AnalyticsOverview,
  ActivityDataPoint,
  RecentActivity,
} from './services/analytics.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bgColor: string;
  trend: 'up' | 'down' | 'stable';
  trendText: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = true;
  isLoggingOut = false;

  overview: AnalyticsOverview | null = null;
  activity: ActivityDataPoint[] = [];
  recentActivity: RecentActivity[] = [];
  stats: StatCard[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly analyticsService: AnalyticsService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly chatWs: ChatWebSocketService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = this.authService.getCurrentUser();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get userInitials(): string {
    if (!this.currentUser) return '?';
    const f = this.currentUser.firstName?.charAt(0) ?? '';
    const l = this.currentUser.lastName?.charAt(0) ?? '';
    return (f + l).toUpperCase() || this.currentUser.email.charAt(0).toUpperCase();
  }

  get fullName(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.firstName ?? ''} ${this.currentUser.lastName ?? ''}`.trim()
      || this.currentUser.username;
  }

  get maxMessages(): number {
    return Math.max(...this.activity.map(d => d.messages), 1);
  }

  barHeight(value: number): string {
    return `${Math.round((value / this.maxMessages) * 100)}%`;
  }

  activeUserPct(): number {
    if (!this.overview?.totalMembers) return 0;
    return Math.round((this.overview.activeUsers / this.overview.totalMembers) * 100);
  }

  onNavigate(path: string): void {
    this.router.navigate([path]);
  }

  onLogout(): void {
    const data: ConfirmDialogData = {
      header: 'Sign out?',
      message: 'You will be signed out of Teams.',
      acceptLabel: 'Sign out',
      rejectLabel: 'Cancel',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '360px', panelClass: 'signout-dialog' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.chatWs.disconnect();
        this.isLoggingOut = true;
        this.authService.logout().pipe(takeUntil(this.destroy$)).subscribe({
          next: () => this.router.navigate(['/login']),
          error: () => this.router.navigate(['/login']),
        });
      });
  }

  private loadData(): void {
    forkJoin({
      overview: this.analyticsService.getOverview(),
      activity: this.analyticsService.getWeeklyActivity(),
      recent:   this.analyticsService.getRecentActivity(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ overview, activity, recent }) => {
        this.overview       = overview;
        this.activity       = activity;
        this.recentActivity = recent;
        this.buildStats(overview);
        this.isLoading = false;

        setTimeout(() => {
          gsap.from('.stat-card', {
            y: 20, opacity: 0, duration: 0.35, stagger: 0.08, ease: 'power2.out',
          });
          gsap.from('.chart-card', {
            y: 24, opacity: 0, duration: 0.4, delay: 0.2, ease: 'power2.out',
          });
          gsap.from('.activity-bar', {
            scaleY: 0, transformOrigin: 'bottom',
            duration: 0.5, stagger: 0.05, delay: 0.35, ease: 'power3.out',
          });
        }, 0);
      });
  }

  private buildStats(o: AnalyticsOverview): void {
    this.stats = [
      {
        label: 'Teams',
        value: o.totalTeams,
        icon: 'pi pi-users',
        color: '#5b5fc7', bgColor: '#ededfb',
        trend: 'up', trendText: '+1 this month',
      },
      {
        label: 'Active Members',
        value: `${o.activeUsers} / ${o.totalMembers}`,
        icon: 'pi pi-user',
        color: '#237b4b', bgColor: '#e4f2ea',
        trend: 'up', trendText: `${this.activeUserPct()}% engagement`,
      },
      {
        label: 'Messages',
        value: o.totalMessages.toLocaleString(),
        icon: 'pi pi-comment',
        color: '#d83b01', bgColor: '#fdeee8',
        trend: 'up', trendText: '+42 today',
      },
      {
        label: 'Meetings This Week',
        value: o.meetingsThisWeek,
        icon: 'pi pi-video',
        color: '#008299', bgColor: '#e0f3f6',
        trend: 'stable', trendText: 'same as last week',
      },
    ];
  }
}
