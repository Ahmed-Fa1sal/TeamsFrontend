import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatRippleModule } from '@angular/material/core';

import { AuthService } from '../auth/services/auth.service';
import { User } from '../auth/models/auth.models';
import { ChatApiService } from '../chat/services/chat-api.service';
import { ChatWebSocketService } from '../chat/services/chat-websocket.service';
import { ConversationSummary, ConversationType } from '../chat/models/chat.models';
import { NotificationService } from '../notifications/notification.service';
import { NotificationPanelComponent } from '../notifications/notification-panel/notification-panel.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { LogoComponent } from '../../shared/components/logo/logo.component';

@Component({
  selector: 'app-chats-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    RouterLink,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatRippleModule,
    NotificationPanelComponent,
    LogoComponent,
  ],
  templateUrl: './chats-page.component.html',
  styleUrl: './chats-page.component.css',
})
export class ChatsPageComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = true;
  loadError = '';
  isLoggingOut = false;
  conversations: ConversationSummary[] = [];

  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly unreadCount$ = inject(NotificationService).unreadCount$;
  private readonly destroy$ = new Subject<void>();

  private readonly AVATAR_COLORS = [
    '#5b5fc7', '#237b4b', '#d83b01', '#008299', '#b86800', '#744da9',
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly chatApi: ChatApiService,
    private readonly chatWs: ChatWebSocketService,
    private readonly notificationService: NotificationService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = this.authService.getCurrentUser();
    this.loadConversations();
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
    const name = `${this.currentUser.firstName ?? ''} ${this.currentUser.lastName ?? ''}`.trim();
    return name || this.currentUser.username;
  }

  loadConversations(): void {
    this.isLoading = true;
    this.loadError = '';
    this.chatApi.getMyConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: convs => {
          this.conversations = convs;
          this.isLoading = false;
        },
        error: () => {
          this.loadError = 'Failed to load conversations. Please try again.';
          this.isLoading = false;
        },
      });
  }

  onConversationClick(conv: ConversationSummary): void {
    this.router.navigate(['/chat/conversations', conv.id]);
  }

  typeIcon(type: ConversationType): string {
    switch (type) {
      case 'CHANNEL': return 'pi pi-hashtag';
      case 'TEAM':    return 'pi pi-users';
      default:        return 'pi pi-comments';
    }
  }

  typeLabel(type: ConversationType): string {
    switch (type) {
      case 'CHANNEL': return 'Channel';
      case 'TEAM':    return 'Team';
      default:        return 'Direct';
    }
  }

  avatarLabel(name: string): string {
    return name.slice(0, 2).toUpperCase();
  }

  avatarColor(id: number): string {
    return this.AVATAR_COLORS[id % this.AVATAR_COLORS.length];
  }

  formatTimestamp(iso: string | null | undefined): string {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86_400_000);
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (msgDay.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (msgDay.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  onNotifPanelOpen(): void {
    this.notificationService.markAllAsRead();
  }

  onLogout(): void {
    const data: ConfirmDialogData = {
      header: 'Sign out?',
      message: 'You will be signed out of Teams.',
      acceptLabel: 'Sign out',
      rejectLabel: 'Cancel',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, panelClass: 'signout-dialog', width: '360px' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.chatWs.disconnect();
        this.isLoggingOut = true;
        this.authService.logout()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => this.router.navigate(['/login']),
            error: () => this.router.navigate(['/login']),
          });
      });
  }
}
