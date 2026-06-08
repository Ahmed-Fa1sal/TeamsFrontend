import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
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

import gsap from 'gsap';

import { TeamManagementFetcherService } from '../../services/team-management-fetcher.service';
import { AuthService } from '@features/auth/services/auth.service';
import { PermissionService } from '@core/services/permission.service';
import { TeamRole } from '@core/auth/roles';
import { Channel, Team, TeamMember } from '../../models/team.models';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

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
  ],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.css',
})
export class TeamDetailComponent implements OnInit, OnDestroy {
  @ViewChild('createChannelDialog') private createChannelDialog!: TemplateRef<unknown>;

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
    private readonly permissions: PermissionService,
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
            gsap.from('.detail-card', { y: 24, opacity: 0, duration: 0.4, ease: 'power2.out' });
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

  onChannelOpen(channel: Channel): void {
    this.router.navigate(['/channels', channel.id], {
      state: {
        teamName: this.team?.name,
        channelName: channel.name,
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
