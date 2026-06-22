import { Component, ElementRef, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';

import gsap from 'gsap';

import { TeamManagementFetcherService } from '../../services/team-management-fetcher.service';
import { AuthService } from '@features/auth/services/auth.service';
import { PermissionService } from '@core/services/permission.service';
import { TeamRole } from '@core/auth/roles';
import { Channel, Team, TeamMember, TeamMemberRole } from '../../models/team.models';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  AddTeamMemberDialogComponent,
  AddTeamMemberDialogData,
} from '../../components/add-team-member-dialog/add-team-member-dialog.component';

const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatMenuModule,
  ],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.css',
})
export class TeamDetailComponent implements OnInit, OnDestroy {
  @ViewChild('createChannelDialog') private createChannelDialog!: TemplateRef<unknown>;
  @ViewChild('membersSection') private readonly membersSection?: ElementRef<HTMLElement>;
  @ViewChild('channelsSection') private readonly channelsSection?: ElementRef<HTMLElement>;

  team: Team | null = null;
  isLoading = true;
  isActing = false;

  channelName = '';
  channelDescription = '';
  channelIsPublic = true;
  channels: Channel[] = [];
  isChannelsLoading = false;

  private teamId = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly teamService: TeamManagementFetcherService,
    private readonly authService: AuthService,
    readonly permissions: PermissionService,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.teamId = idParam ? Number(idParam) : 0;
    if (!this.teamId) {
      this.router.navigate(['/home']);
      return;
    }
    this.loadTeam();
  }

  ngOnDestroy(): void {
    this.permissions.clearTeamContext();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTeam(): void {
    this.isLoading = true;
    this.teamService
      .getTeamById(this.teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: team => {
          this.team = team;
          this.isLoading = false;
          this.syncTeamContext();
          this.loadTeamChannels();
          setTimeout(() => {
            if (REDUCED_MOTION) return;
            gsap.from('.detail-card', { y: 24, opacity: 0, duration: 0.4, ease: 'power2.out' });
            gsap.from('.section-header', { y: 8, opacity: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out', delay: 0.15 });
            gsap.from('.member-item', { y: 12, opacity: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out', delay: 0.2 });
          }, 0);
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Failed to load team details.', 'Dismiss', { duration: 3000 });
        },
      });
  }

  private syncTeamContext(): void {
    const userId = Number(this.authService.getCurrentUser()?.id);
    const member = this.team?.teamMembers?.find(m => m.user.id === userId);
    const role   = member ? member.role as TeamRole : null;
    console.log('[TeamDetail] syncTeamContext | userId:', userId, '| member:', member, '| role:', role);
    this.permissions.setTeamContext(role);
  }

  private loadTeamChannels(): void {
    this.isChannelsLoading = true;
    this.teamService
      .getChannelsForTeam(this.teamId, { page: 0, size: 10 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: page => {
          this.channels = page.content;
          this.isChannelsLoading = false;
        },
        error: () => {
          this.channels = [];
          this.isChannelsLoading = false;
        },
      });
  }

  onBack(): void {
    this.router.navigate(['/home']);
  }

  onTeamChat(): void {
    console.log('========== Team Chat ==========');
    console.log('team:', this.team);
    console.log('teamId:', this.teamId);
    console.log('conversationId:', this.team?.conversationId);

    if (!this.team) {
      console.error('Team is null');
      return;
    }

    if (this.team.conversationId) {
      console.log('Navigating to:', `/chat/conversations/${this.team.conversationId}`);

      this.router.navigate(['/chat/conversations', this.team.conversationId], {
        state: {
          type: 'TEAM',
          teamName: this.team.name,
        },
      }).then(result => console.log('Navigation result:', result))
        .catch(err => console.error('Navigation error:', err));

    } else {
      console.log('Navigating to:', `/chat/team/${this.teamId}`);

      this.router.navigate(['/chat/team', this.teamId], {
        state: {
          type: 'TEAM',
          teamName: this.team.name,
        },
      }).then(result => console.log('Navigation result:', result))
        .catch(err => console.error('Navigation error:', err));
    }
  }

  onDirectMessage(member: TeamMember): void {
    console.log('========== Direct Message ==========');
    console.log('member:', member);

    const currentUserId = Number(this.authService.getCurrentUser()?.id);

    console.log('Current User:', currentUserId);
    console.log('Target User:', member.user.id);

    if (member.user.id === currentUserId) {
      console.warn('Cannot message yourself.');
      return;
    }

    console.log('Navigating to:', `/chat/direct/${member.user.id}`);

    this.router.navigate(['/chat/direct', member.user.id], {
      state: {
        type: 'DIRECT',
        partnerName: this.memberDisplayName(member),
      },
    }).then(result => console.log('Navigation result:', result))
      .catch(err => console.error('Navigation error:', err));
  }

  onChannelOpen(channel: Channel): void {
    console.log('[onChannelOpen] channel:', channel);

    const channelId = channel.id ?? channel.channelId;

    if (channelId) {
      this.router.navigate(['/teams', this.teamId, 'channels', channelId]);
    } else {
      console.error(
        '[TeamDetail] Cannot determine channel ID — check the fields the backend returns:',
        channel,
      );
      this.snackBar.open(
        'Cannot open channel: server response is missing the channel ID. Check the browser console.',
        'Dismiss',
        { duration: 5000 },
      );
    }
  }


  onCallMember(member: TeamMember): void {
    const currentUserId = Number(this.authService.getCurrentUser()?.id);
    if (member.user.id === currentUserId) {
      return;
    }

    this.router.navigate(['/videocall'], {
      queryParams: {
        targetUserId: member.user.id,
        targetUserName: this.memberDisplayName(member),
      },
    });
  }

  onArchive(): void {
    if (!this.team) return;
    const data: ConfirmDialogData = {
      header: 'Archive team?',
      message: `"${this.team.name}" will be archived and hidden from active teams.`,
      acceptLabel: 'Archive',
      rejectLabel: 'Cancel',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, panelClass: 'signout-dialog', width: '360px' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.isActing = true;
        this.teamService
          .archiveTeam(this.teamId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isActing = false;
              this.snackBar.open('Team archived.', 'Dismiss', { duration: 3000 });
              this.loadTeam();
            },
            error: () => {
              this.isActing = false;
              this.snackBar.open('Failed to archive team.', 'Dismiss', { duration: 3000 });
            },
          });
      });
  }

  onUnarchive(): void {
    if (!this.team) return;
    this.isActing = true;
    this.teamService
      .unarchiveTeam(this.teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isActing = false;
          this.snackBar.open('Team unarchived.', 'Dismiss', { duration: 3000 });
          this.loadTeam();
        },
        error: () => {
          this.isActing = false;
          this.snackBar.open('Failed to unarchive team.', 'Dismiss', { duration: 3000 });
        },
      });
  }

  onDelete(): void {
    if (!this.team) return;
    const data: ConfirmDialogData = {
      header: 'Delete team?',
      message: `"${this.team.name}" will be permanently deleted. This cannot be undone.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, panelClass: 'signout-dialog', width: '360px' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.isActing = true;
        this.teamService
          .deleteTeam(this.teamId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isActing = false;
              this.snackBar.open('Team deleted.', 'Dismiss', { duration: 3000 });
              this.router.navigate(['/home']);
            },
            error: () => {
              this.isActing = false;
              this.snackBar.open('Failed to delete team.', 'Dismiss', { duration: 3000 });
            },
          });
      });
  }

  openCreateChannel(): void {
    this.resetChannelForm();
    this.dialog.open(this.createChannelDialog, {
      width: '420px',
      panelClass: 'create-channel-dialog',
    });
  }

  createChannel(dialogRef: MatDialogRef<unknown>): void {
    const name = this.channelName.trim();
    if (!name || !this.team) {
      return;
    }

    this.isActing = true;
    this.teamService
      .createChannel(this.teamId, {
        teamId: this.teamId,
        name,
        description: this.channelDescription.trim() || undefined,
        isPublic: this.channelIsPublic,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isActing = false;
          dialogRef.close();
          this.snackBar.open('Channel created successfully.', 'Dismiss', { duration: 3000 });
          this.loadTeam();
        },
        error: () => {
          this.isActing = false;
          this.snackBar.open('Failed to create channel.', 'Dismiss', { duration: 3000 });
        },
      });
  }

  cancelCreateChannel(dialogRef: MatDialogRef<unknown>): void {
    dialogRef.close();
  }

  private resetChannelForm(): void {
    this.channelName = '';
    this.channelDescription = '';
    this.channelIsPublic = true;
  }

  // ── Members management ───────────────────────────────────────────────────

  openAddMember(): void {
    if (!this.team) return;
    const data: AddTeamMemberDialogData = {
      teamId: this.teamId,
      teamName: this.team.name,
      existingMemberIds: this.members.map(m => m.user.id),
    };

    this.dialog
      .open(AddTeamMemberDialogComponent, { width: '460px', maxWidth: '92vw', data })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (!result) return;
        this.loadTeam();
        setTimeout(() => {
          if (REDUCED_MOTION) return;
          gsap.from('.member-item:last-of-type', {
            opacity: 0, x: -8, duration: 0.3, ease: 'power2.out',
          });
        }, 0);
      });
  }

  confirmRemoveMember(member: TeamMember): void {
    if (!this.team) return;
    const name = this.memberDisplayName(member);
    const data: ConfirmDialogData = {
      header: 'Remove member?',
      message: `Remove ${name} from ${this.team.name}? They will lose access to all channels in this team.`,
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, panelClass: 'signout-dialog', width: '360px' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.teamService
          .removeTeamMember(this.teamId, member.user.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open(`${name} removed from the team.`, 'Dismiss', { duration: 3000 });
              this.loadTeam();
            },
            error: () =>
              this.snackBar.open('Failed to remove member.', 'Dismiss', { duration: 3000 }),
          });
      });
  }

  // TODO: implement "Change Role" once a team change-role endpoint and dialog
  // exist (e.g. TeamManagementFetcherService.changeMemberRole +
  // PATCH /teams/{id}/members/{userId}/role). Omitted from the overflow menu
  // for now to avoid inventing a backend contract.

  scrollToMembers(): void {
    this.membersSection?.nativeElement.scrollIntoView({
      behavior: REDUCED_MOTION ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  scrollToChannels(): void {
    this.channelsSection?.nativeElement.scrollIntoView({
      behavior: REDUCED_MOTION ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  /** Owner/Admin can act on members other than themselves; the owner row is never removable. */
  canActOnMember(member: TeamMember): boolean {
    const currentUserId = Number(this.authService.getCurrentUser()?.id);
    return this.canManageThisTeam
      && member.user.id !== currentUserId
      && member.role !== 'OWNER';
  }

  roleBadgeModifier(role: TeamMemberRole): string {
    return role.toLowerCase();
  }

  // ── Permission getters for the template ──────────────────────────────────

  /**
   * True for SYSTEM_ADMIN, ORG_ADMIN, Team OWNER, Team ADMIN.
   * Controls: Create Channel, Archive, Unarchive, manage member actions.
   */
  get canManageThisTeam(): boolean {
    return this.permissions.canManageTeam();
  }

  /**
   * True for SYSTEM_ADMIN, ORG_ADMIN, and Team OWNER only.
   * ADMIN can manage members but cannot delete the team.
   */
  get canDeleteThisTeam(): boolean {
    return (
      this.permissions.isSystemAdmin() ||
      this.permissions.canManageOrganization() ||
      this.permissions.hasTeamRole(TeamRole.OWNER)
    );
  }

  get avatarLabel(): string {
    return this.team?.name.slice(0, 2).toUpperCase() ?? '??';
  }

  get displayOwner(): string {
    const o = this.team?.owner;
    if (!o) return '—';
    const name = `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim();
    return name || o.username;
  }

  get members(): TeamMember[] {
    return this.team?.teamMembers ?? [];
  }

  memberDisplayName(m: TeamMember): string {
    const name = `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim();
    return name || m.user.username;
  }

  memberInitials(m: TeamMember): string {
    const f = m.user.firstName?.charAt(0) ?? '';
    const l = m.user.lastName?.charAt(0) ?? '';
    return (f + l).toUpperCase() || m.user.username.slice(0, 2).toUpperCase();
  }
}
