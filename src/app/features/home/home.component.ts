import { Component, ElementRef, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';

import { AuthService } from '../auth/services/auth.service';
import { User } from '../auth/models/auth.models';
import { PermissionService } from '@core/services/permission.service';
import { HasSystemRoleDirective } from '@shared/directives/has-system-role.directive';
import { SystemRole, OrganizationRole } from '@core/auth/roles';
import { TeamManagementFetcherService } from '../teams/services/team-management-fetcher.service';
import { OrganizationService } from '../organizations/services/organization.service';
import { Team as ApiTeam, Channel as ApiChannel } from '../teams/models/team.models';
import { CreateOrganizationRequest, OrganizationResponse } from '../organizations/models/organization.model';
import {
  OrganizationFormComponent,
  OrgFormDialogData,
  OrgFormResult,
} from '../organizations/components/organization-form/organization-form.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../notifications/notification.service';
import { NotificationPanelComponent } from '../notifications/notification-panel/notification-panel.component';
import { AddUserDialogComponent } from '../admin/add-user-dialog/add-user-dialog.component';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { animatePageEntrance, animateStatCards } from '@core/animations/page-animations';

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
    AsyncPipe,
    RouterLink,
    MatButtonModule,
    MatDividerModule,
    MatTooltipModule,
    MatRippleModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    HasSystemRoleDirective,
    NotificationPanelComponent,
    LogoComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = true;
  isLoggingOut = false;
  loadError = false;

  isOrgAdmin = false;

  orgsCount = 0;
  teamsCount = 0;
  channelsCount = 0;

  orgsList: OrganizationResponse[] = [];
  orgAdminOrg: OrganizationResponse | null = null;
  teams: Team[] = [];
  channelsList: ApiChannel[] = [];

  private managedOrgId: number | null = null;
  private readonly destroy$ = new Subject<void>();
  private tl?: ReturnType<typeof animatePageEntrance>;

  readonly SystemRole = SystemRole;
  readonly unreadCount$ = inject(NotificationService).unreadCount$;

  readonly comingSoon = [
    { id: 'chat', label: 'Chat', icon: 'pi pi-comments', description: 'Direct and group messaging' },
    { id: 'meetings', label: 'Meetings', icon: 'pi pi-video', description: 'Schedule and join video calls' },
  ];

  private readonly AVATAR_COLORS = [
    '#5b5fc7', '#237b4b', '#d83b01', '#008299', '#b86800', '#744da9',
  ];

  private readonly ALL_ACTIONS: QuickAction[] = [
    {
      id: 'add-user', label: 'Add User',
      icon: 'pi pi-user-plus', description: 'Add a new system user',
      color: '#b86800', bgColor: '#fdf5e4',
    },
    {
      id: 'create-org', label: 'Create Organization',
      icon: 'pi pi-building', description: 'Set up a new organization',
      color: '#d83b01', bgColor: '#fdeee8',
    },
    {
      id: 'add-member', label: 'Add Member',
      icon: 'pi pi-user-plus', description: 'Add member to your organization',
      color: '#b86800', bgColor: '#fdf5e4',
    },
    {
      id: 'create-team', label: 'Create Team',
      icon: 'pi pi-users', description: 'Start a new team workspace',
      color: '#5b5fc7', bgColor: '#ededfb',
    },
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly teamService: TeamManagementFetcherService,
    private readonly orgService: OrganizationService,
    readonly permissions: PermissionService,
    private readonly notificationService: NotificationService,
    private readonly el: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = this.authService.getCurrentUser();
    // NOTE: startPolling() is NOT called here — AppComponent is the single call site.

    if (this.isSystemAdmin) {
      this.loadAdminData();
    } else {
      this.resolveOrgRole();
    }
  }

  ngOnDestroy(): void {
    this.tl?.kill();
    this.permissions.clearOrgContext();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Role getters ───────────────────────────────────────────────────────────

  get isSystemAdmin(): boolean { return this.permissions.isSystemAdmin(); }
  get isRegularUser(): boolean { return !this.isSystemAdmin && !this.isOrgAdmin; }

  // ── Data loading ───────────────────────────────────────────────────────────

  private loadAdminData(): void {
    this.orgService.getAllOrganizations({ page: 0, size: 5 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: page => {
          this.orgsCount = page.totalElements;
          this.orgsList = page.content;
          this.finishLoading();
        },
        error: () => { this.loadError = true; this.finishLoading(); },
      });
  }

  private resolveOrgRole(): void {
    this.orgService.getMyOrganizations({ page: 0, size: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: page => {
          const firstOrg = page.content[0];
          if (!firstOrg || !this.currentUser?.id) {
            this.loadUserData();
            return;
          }
          const userId = Number(this.currentUser.id);
          this.orgService.getMember(firstOrg.id, userId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: membership => {
                const orgRole = membership.role as unknown as OrganizationRole;
                this.permissions.setOrgContext(orgRole, firstOrg.id);
                this.managedOrgId = firstOrg.id;
                if (orgRole === OrganizationRole.ORG_ADMIN) {
                  this.isOrgAdmin = true;
                  this.loadOrgAdminData(firstOrg.id);
                } else {
                  this.loadUserData();
                }
              },
              error: () => { this.loadUserData(); },
            });
        },
        error: () => { this.loadUserData(); },
      });
  }

  private loadOrgAdminData(orgId: number): void {
    this.orgService.getOrganizationById(orgId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: org => {
          this.orgAdminOrg = org;
          this.orgsList = [org];
          this.finishLoading();
        },
        error: () => { this.loadError = true; this.finishLoading(); },
      });
  }

  private loadUserData(): void {
    const orgs$ = this.orgService.getMyOrganizations({ page: 0, size: 10 })
      .pipe(catchError(() => of(null)));
    const teams$ = this.teamService.getMyTeams({ page: 0, size: 20 })
      .pipe(catchError(() => of(null)));
    const channels$ = this.teamService.getMyChannels({ page: 0, size: 20 })
      .pipe(catchError(() => of(null)));

    forkJoin([orgs$, teams$, channels$])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([orgsPage, teamsPage, channelsPage]) => {
          if (orgsPage) { this.orgsCount = orgsPage.totalElements; this.orgsList = orgsPage.content; }
          if (teamsPage) { this.teamsCount = teamsPage.totalElements; this.teams = teamsPage.content.map(t => this.mapApiTeam(t)); }
          if (channelsPage) { this.channelsCount = channelsPage.totalElements; this.channelsList = channelsPage.content; }
          this.finishLoading();
        },
        error: () => { this.finishLoading(); },
      });
  }

  private finishLoading(): void {
    this.isLoading = false;
    // Run after Angular has flushed the *ngIf removal (next microtask)
    setTimeout(() => {
      this.tl = animatePageEntrance(this.el.nativeElement);
      animateStatCards(this.el.nativeElement);
    }, 0);
  }

  private mapApiTeam(apiTeam: ApiTeam): Team {
    return {
      id: String(apiTeam.id),
      name: apiTeam.name,
      description: apiTeam.description ?? '',
      memberCount: apiTeam.memberCount ?? 0,
      channelCount: apiTeam.channelCount ?? 0,
      avatarLabel: apiTeam.name.slice(0, 2).toUpperCase(),
      avatarColor: this.AVATAR_COLORS[apiTeam.id % this.AVATAR_COLORS.length],
      isOwner:
        apiTeam.owner?.id != null &&
        this.currentUser?.id != null &&
        String(apiTeam.owner.id) === String(this.currentUser.id),
    };
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
    return this.currentUser?.firstName ?? this.currentUser?.username ?? 'there';
  }

  get timeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get isTeamOwner(): boolean { return this.teams.some(t => t.isOwner); }

  get visibleQuickActions(): QuickAction[] {
    if (this.isSystemAdmin) {
      return this.ALL_ACTIONS.filter(a => a.id === 'add-user' || a.id === 'create-org');
    }
    if (this.isOrgAdmin) {
      return this.ALL_ACTIONS.filter(a => a.id === 'add-member');
    }
    return this.ALL_ACTIONS.filter(a => a.id === 'create-team');
  }

  channelColor(channel: ApiChannel): string {
    return this.AVATAR_COLORS[channel.teamId % this.AVATAR_COLORS.length];
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  onNotifPanelOpen(): void {
    this.notificationService.markAllAsRead();
  }

  onQuickAction(id: string): void {
    switch (id) {
      case 'create-team':
        this.router.navigate(['/teams/new']);
        break;
      case 'create-org':
        this.openCreateOrgDialog();
        break;
      case 'add-user':
        this.openAddUserDialog();
        break;
      case 'add-member': {
        const orgId = this.managedOrgId ?? this.permissions.managedOrgId;
        if (orgId) {
          this.router.navigate(['/organizations', orgId]);
        } else {
          this.snackBar.open('Organization not found. Please try again.', 'Dismiss', { duration: 3000 });
        }
        break;
      }
      default:
        this.snackBar.open('This feature is coming soon.', 'Dismiss', { duration: 3000 });
    }
  }

  openAddUserDialog(): void {
    this.dialog.open(AddUserDialogComponent, { width: '520px' });
  }

  openCreateOrgDialog(): void {
    const ref = this.dialog.open(OrganizationFormComponent, {
      width: '480px',
      maxWidth: '92vw',
      data: { mode: 'create' } satisfies OrgFormDialogData,
    });

    ref.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: OrgFormResult | null) => {
        if (!result) return;
        this.orgService.createOrganization(result as CreateOrganizationRequest)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Organization created.', 'Dismiss', { duration: 3000 });
              if (this.isSystemAdmin) {
                this.loadAdminData();
              }
            },
            error: (err: HttpErrorResponse) =>
              this.snackBar.open(
                err.error?.message ?? 'Failed to create organization.',
                'Dismiss',
                { duration: 4000 },
              ),
          });
      });
  }

  onTeamOpen(team: Team): void {
    this.router.navigate(['/teams', team.id]);
  }

  onChannelOpen(channel: ApiChannel): void {
    this.router.navigate(['/channels', channel.id]);
  }

  onNavigate(path: string): void {
    this.router.navigate([path]);
  }

  onManageOrg(): void {
    if (this.isSystemAdmin) {
      this.router.navigate(['/organizations']);
    } else {
      const orgId = this.managedOrgId ?? this.permissions.managedOrgId;
      if (orgId) {
        this.router.navigate(['/organizations', orgId]);
      } else {
        this.snackBar.open('Organization not found.', 'Dismiss', { duration: 3000 });
      }
    }
  }

  onManageSpecificOrg(orgId: number): void {
    this.router.navigate(['/organizations', orgId]);
  }

  onLogout(): void {
    const data: ConfirmDialogData = {
      header: 'Sign out?',
      message: 'You will be signed out of Teams.',
      acceptLabel: 'Sign out',
      rejectLabel: 'Cancel',
    };

    const ref = this.dialog.open(ConfirmDialogComponent, {
      data,
      panelClass: 'signout-dialog',
      width: '360px',
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.isLoggingOut = true;
      this.authService
        .logout()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.router.navigate(['/login']),
          error: () => this.router.navigate(['/login']),
        });
    });
  }
}
