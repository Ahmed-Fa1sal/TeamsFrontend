import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TeamManagementFetcherService } from '../../teams/services/team-management-fetcher.service';
import { AuthService } from '@features/auth/services/auth.service';
import { PermissionService } from '@core/services/permission.service';
import { TeamRole } from '@core/auth/roles';
import { Channel, ChannelMember } from '../../teams/models/team.models';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  AddChannelMemberDialogComponent,
  AddChannelMemberDialogData,
} from '../components/add-channel-member-dialog/add-channel-member-dialog.component';

@Component({
  selector: 'app-channel-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './channel-detail.component.html',
  styleUrls: ['./channel-detail.component.css'],
})
export class ChannelDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamService = inject(TeamManagementFetcherService);
  private readonly authService = inject(AuthService);
  readonly permissions = inject(PermissionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroy$ = new Subject<void>();

  channel: Channel | null = null;
  members: ChannelMember[] = [];
  isLoading = true;
  isActing = false;
  loadError = '';
  private teamId = 0;
  private channelId = 0;

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.teamId = Number(params.get('teamId') ?? 0);
    this.channelId = Number(params.get('channelId') ?? 0);

    if (!this.teamId || !Number.isFinite(this.teamId)) {
      this.loadError = 'Invalid team ID in URL.';
      this.isLoading = false;
      return;
    }
    if (!this.channelId || !Number.isFinite(this.channelId)) {
      this.loadError = 'Invalid channel ID in URL.';
      this.isLoading = false;
      return;
    }
    this.loadChannel();
  }

  ngOnDestroy(): void {
    this.permissions.clearTeamContext();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canManage(): boolean {
    return this.permissions.canManageChannel();
  }

  memberInitials(m: ChannelMember): string {
    const first = m.firstName?.[0] ?? '';
    const last = m.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || m.username.slice(0, 2).toUpperCase();
  }

  memberDisplayName(m: ChannelMember): string {
    const full = [m.firstName, m.lastName].filter(Boolean).join(' ');
    return full || m.username;
  }

  openAddMember(): void {
    if (!this.channel) return;
    const ref = this.dialog.open<AddChannelMemberDialogComponent, AddChannelMemberDialogData>(
      AddChannelMemberDialogComponent,
      {
        data: {
          teamId: this.teamId,
          channelId: this.channelId,
          channelName: this.channel.name,
          existingMemberIds: this.members.map(m => m.id),
        },
      },
    );

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (!result) return;
      this.loadChannel();
    });
  }

  confirmRemoveMember(member: ChannelMember): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(
      ConfirmDialogComponent,
      {
        data: {
          header: 'Remove member',
          message: `Remove ${this.memberDisplayName(member)} from #${this.channel?.name}?`,
          acceptLabel: 'Remove',
          rejectLabel: 'Cancel',
        },
      },
    );

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (!confirmed) return;
      this.removeMember(member);
    });
  }

  onBack(): void {
    if (this.teamId) {
      this.router.navigate(['/teams', this.teamId]);
    } else {
      this.router.navigate(['/home']);
    }
  }

  onOpenChat(): void {
    const channelId = this.channelId;
    const conversationId = this.channel?.conversationId ?? this.channel?.conversation?.id;

    if (conversationId) {
      this.router.navigate(['/chat/conversations', conversationId], {
        state: { type: 'CHANNEL', channelName: this.channel?.name, teamName: this.channel?.teamName },
      });
    } else {
      this.router.navigate(['/chat/channel', channelId], {
        state: { type: 'CHANNEL', channelName: this.channel?.name, teamName: this.channel?.teamName },
      });
    }
  }

  onViewTeam(): void {
    if (this.teamId) this.router.navigate(['/teams', this.teamId]);
  }

  get avatarLabel(): string {
    return this.channel?.name?.slice(0, 2).toUpperCase() ?? '##';
  }

  private loadChannel(): void {
    this.teamService.getChannelById(this.teamId, this.channelId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ch => {
          this.channel = ch;
          this.members = ch.members ?? [];
          this.isLoading = false;
          this.syncTeamContext();
        },
        error: () => { this.loadError = 'Channel not found or could not be loaded.'; this.isLoading = false; },
      });
  }

  private syncTeamContext(): void {
    this.teamService.getTeamById(this.teamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: team => {
          const userId = Number(this.authService.getCurrentUser()?.id);
          const member = team.teamMembers?.find(m => m.user.id === userId);
          const role = member ? member.role as TeamRole : null;
          this.permissions.setTeamContext(role);
        },
        error: () => { /* non-fatal: user just won't see manage controls */ },
      });
  }

  private removeMember(member: ChannelMember): void {
    this.isActing = true;
    this.teamService.removeChannelMember(this.teamId, this.channelId, member.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isActing = false;
          this.members = this.members.filter(m => m.id !== member.id);
          if (this.channel) {
            this.channel = { ...this.channel, memberCount: (this.channel.memberCount ?? 1) - 1 };
          }
          this.snackBar.open(`${this.memberDisplayName(member)} removed from channel.`, 'Dismiss', { duration: 3000 });
        },
        error: () => {
          this.isActing = false;
          this.snackBar.open('Failed to remove member.', 'Dismiss', { duration: 3000 });
        },
      });
  }
}
