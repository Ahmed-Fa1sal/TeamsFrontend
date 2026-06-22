import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TeamManagementFetcherService } from '../../teams/services/team-management-fetcher.service';
import { Channel } from '../../teams/models/team.models';

@Component({
  selector: 'app-channel-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './channel-detail.component.html',
  styleUrls: ['./channel-detail.component.css'],
})
export class ChannelDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamService = inject(TeamManagementFetcherService);
  private readonly destroy$ = new Subject<void>();

  channel: Channel | null = null;
  isLoading = true;
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
    this.destroy$.next();
    this.destroy$.complete();
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
        next: ch => { this.channel = ch; this.isLoading = false; },
        error: () => { this.loadError = 'Channel not found or could not be loaded.'; this.isLoading = false; },
      });
  }
}
