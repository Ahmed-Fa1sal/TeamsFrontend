import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { PopoverModule } from 'primeng/popover';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { AuthService } from '../auth/services/auth.service';
import { User } from '../auth/models/auth.models';

// ── Domain interfaces (wired to real APIs when backend endpoints are ready) ──

interface Organization {
  id: string;
  name: string;
  domain: string;
  memberCount: number;
  teamCount: number;
  plan: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  channelCount: number;
  avatarLabel: string;
  avatarColor: string;
  isOwner: boolean;
}

interface Channel {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  isPrivate: boolean;
  memberCount: number;
  unreadCount: number;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    AvatarModule,
    BadgeModule,
    TagModule,
    DividerModule,
    ToastModule,
    SkeletonModule,
    TooltipModule,
    RippleModule,
    PopoverModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = true;
  isLoggingOut = false;

  private readonly destroy$ = new Subject<void>();

  // ── Mock data (replace with real service calls once APIs are ready) ──

  readonly organization: Organization = {
    id: 'org-1',
    name: 'Acme Corporation',
    domain: 'acme.com',
    memberCount: 24,
    teamCount: 6,
    plan: 'Enterprise',
  };

  readonly teams: Team[] = [
    {
      id: 't1', name: 'Engineering', description: 'Core product development',
      memberCount: 8, channelCount: 5, avatarLabel: 'EN',
      avatarColor: '#5b5fc7', isOwner: true,
    },
    {
      id: 't2', name: 'Design', description: 'UI/UX & brand',
      memberCount: 4, channelCount: 3, avatarLabel: 'DS',
      avatarColor: '#237b4b', isOwner: false,
    },
    {
      id: 't3', name: 'Product', description: 'Roadmap & strategy',
      memberCount: 6, channelCount: 4, avatarLabel: 'PR',
      avatarColor: '#d83b01', isOwner: false,
    },
    {
      id: 't4', name: 'Marketing', description: 'Growth & campaigns',
      memberCount: 6, channelCount: 4, avatarLabel: 'MK',
      avatarColor: '#008299', isOwner: false,
    },
  ];

  readonly channels: Channel[] = [
    {
      id: 'c1', name: 'general', teamId: 't1', teamName: 'Engineering',
      teamColor: '#5b5fc7', isPrivate: false, memberCount: 8, unreadCount: 3,
    },
    {
      id: 'c2', name: 'announcements', teamId: 't1', teamName: 'Engineering',
      teamColor: '#5b5fc7', isPrivate: false, memberCount: 8, unreadCount: 0,
    },
    {
      id: 'c3', name: 'design-system', teamId: 't2', teamName: 'Design',
      teamColor: '#237b4b', isPrivate: false, memberCount: 4, unreadCount: 12,
    },
    {
      id: 'c4', name: 'sprint-planning', teamId: 't3', teamName: 'Product',
      teamColor: '#d83b01', isPrivate: true, memberCount: 6, unreadCount: 1,
    },
    {
      id: 'c5', name: 'campaigns', teamId: 't4', teamName: 'Marketing',
      teamColor: '#008299', isPrivate: false, memberCount: 6, unreadCount: 0,
    },
  ];

  readonly quickActions: QuickAction[] = [
    {
      id: 'create-team', label: 'Create Team',
      icon: 'pi pi-users', description: 'Start a new team workspace',
      color: '#5b5fc7', bgColor: '#ededfb',
    },
    {
      id: 'create-channel', label: 'Create Channel',
      icon: 'pi pi-hashtag', description: 'Add a channel to a team',
      color: '#237b4b', bgColor: '#e4f2ea',
    },
    {
      id: 'invite-user', label: 'Invite User',
      icon: 'pi pi-user-plus', description: 'Bring in a team member',
      color: '#b86800', bgColor: '#fdf5e4',
    },
    {
      id: 'manage-org', label: 'Manage Organization',
      icon: 'pi pi-building', description: 'Settings & permissions',
      color: '#d83b01', bgColor: '#fdeee8',
    },
  ];

  readonly comingSoon = [
    {
      id: 'chat', label: 'Chat',
      icon: 'pi pi-comments', description: 'Direct and group messaging',
    },
    {
      id: 'meetings', label: 'Meetings',
      icon: 'pi pi-video', description: 'Schedule and join video calls',
    },
    {
      id: 'notifications', label: 'Notifications',
      icon: 'pi pi-bell', description: 'Smart alerts and reminders',
    },
  ];

  // ── Action label map ───────────────────────────────────────────────────────
  private readonly actionLabels: Record<string, string> = {
    'create-team': 'Create Team',
    'create-channel': 'Create Channel',
    'invite-user': 'Invite User',
    'manage-org': 'Manage Organization',
  };

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly messageService: MessageService,
    private readonly confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = this.authService.getCurrentUser();
    this.isLoading = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Computed getters ───────────────────────────────────────────────────────

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

  get firstName(): string {
    return this.currentUser?.firstName
      ?? this.currentUser?.username
      ?? 'there';
  }

  get timeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get totalUnread(): number {
    return this.channels.reduce((sum, c) => sum + c.unreadCount, 0);
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  onQuickAction(id: string): void {
    this.messageService.add({
      severity: 'info',
      summary: this.actionLabels[id] ?? id,
      detail: 'This feature is coming soon.',
      life: 3000,
    });
  }

  onTeamOpen(team: Team): void {
    this.messageService.add({
      severity: 'info',
      summary: team.name,
      detail: 'Team page is coming soon.',
      life: 3000,
    });
  }

  onChannelOpen(channel: Channel): void {
    this.messageService.add({
      severity: 'info',
      summary: `#${channel.name}`,
      detail: 'Channel page is coming soon.',
      life: 3000,
    });
  }

  onLogout(): void {
    this.confirmationService.confirm({
      header: 'Sign out?',
      message: 'You will be signed out of Teams.',
      icon: 'pi pi-sign-out',
      acceptLabel: 'Sign out',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'confirm-accept-btn',
      rejectButtonStyleClass: 'confirm-reject-btn',
      accept: () => {
        this.isLoggingOut = true;
        this.authService
          .logout()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => this.router.navigate(['/login']),
            error: () => this.router.navigate(['/login']),
          });
      },
    });
  }
}
