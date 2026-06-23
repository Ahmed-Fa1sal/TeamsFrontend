import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  AfterViewInit,
  inject
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { MediaServiceService } from '../services/media-service.service';
import { AuthService } from '@features/auth/services/auth.service';

type CallState = 'ready' | 'incoming' | 'calling' | 'connected' | 'ended';

@Component({
  selector: 'app-videocall',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, MatTooltipModule],
  templateUrl: './videocall.component.html',
  styleUrls: ['./videocall.component.css']
})
export class VideocallComponent implements OnInit, AfterViewInit, OnDestroy {
  private _localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('localVideo') set localVideoRefSetter(ref: ElementRef<HTMLVideoElement> | undefined) {
    this._localVideoRef = ref;
    if (ref && this.localStream) {
      ref.nativeElement.srcObject = this.localStream;
    }
  }
  get localVideoRef(): ElementRef<HTMLVideoElement> { return this._localVideoRef!; }
  @ViewChildren('participantVideo') private readonly participantVideoRefs!: QueryList<ElementRef<HTMLVideoElement>>;

  @ViewChild('localScreenRef') set localScreenRefSetter(ref: ElementRef<HTMLVideoElement> | undefined) {
    if (ref && this.screenStreamForUI) {
      ref.nativeElement.srcObject = this.screenStreamForUI;
    }
  }

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);
  private readonly webrtc = inject(MediaServiceService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ngZone = inject(NgZone);

  callState: CallState = 'ready';
  currentUserId: string | number | null = null;
  targetUserId: string | null = null;
  targetUserName = '';
  channelId: string | null = null;
  channelName = '';
  incomingCallerId: string | null = null;
  incomingIsChannel = false;
  remoteParticipants: Array<{ peerId: string; stream: MediaStream; label: string; hasVideo?: boolean; initials?: string }> = [];

  micEnabled = true;
  camEnabled = true;
  mediaError = false;
  hasRemoteStream = false;
  screenSharing = false;
  remoteIsSharing = false;
  screenSharerId: string | null = null;
  private screenStreamForUI: MediaStream | null = null;

  get isSharing() { return this.screenSharing || this.remoteIsSharing; }

  get screenParticipant() {
    return this.remoteParticipants.find(p => p.peerId === this.screenSharerId) ?? null;
  }

  get cameraParticipants() {
    if (!this.remoteIsSharing || !this.screenSharerId) return this.remoteParticipants;
    return this.remoteParticipants.filter(p => p.peerId !== this.screenSharerId);
  }

  /** mm:ss formatted call duration, shown while connected */
  callDuration = '00:00';

  localStream: MediaStream | null = null;
  private mediaReady = false;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private callStartedAt = 0;
  private navigatedAway = false;
  private readonly subs: Subscription[] = [];

  get stateLabel(): string {
    switch (this.callState) {
      case 'incoming': return 'Incoming call…';
      case 'calling': return 'Calling…';
      case 'connected': return 'Connected';
      case 'ended': return 'Call ended';
      default: return 'Ready';
    }
  }

  get displayName(): string {
    if (this.callState === 'incoming' && this.incomingCallerId) {
      return `User #${this.incomingCallerId}`;
    }
    if (this.channelId) {
      return this.channelName || `Channel #${this.channelId}`;
    }
    return this.targetUserName || (this.targetUserId ? `user #${this.targetUserId}` : 'Video call');
  }

  ngOnInit(): void {
    void this.init();
  }

  private async init(): Promise<void> {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId) {
      this.router.navigate(['/home']);
      return;
    }

    this.currentUserId = currentUserId;
    this.webrtc.registerUser(currentUserId);

    this.subs.push(
      this.route.queryParamMap.subscribe(params => {
        this.targetUserId = params.get('targetUserId');
        this.targetUserName = params.get('targetUserName') ?? '';
        this.channelId = params.get('channelId');
        this.channelName = params.get('channelName') ?? '';
        if (this.channelId && this.mediaReady && this.callState === 'ready' && !this.targetUserId) {
          this.startCall();
        }
        if (this.targetUserId !== null && this.mediaReady && this.callState === 'ready') {
          this.startCall();
        }
      })
    );

    await this.initMedia();
  }

  private async initMedia(): Promise<void> {
    try {
      this.localStream = await this.webrtc.initializeMedia();
      this.mediaReady = true;
      this.mediaError = false;
      this.localVideoRef.nativeElement.srcObject = this.localStream;
      this.camEnabled = this.localStream.getVideoTracks().some(t => t.enabled);
      this.micEnabled = this.localStream.getAudioTracks().some(t => t.enabled);

      if (this.channelId) {
        await this.webrtc.joinChannel(this.channelId);
      }

      this.subs.push(
        this.webrtc.incomingCall.subscribe(info => {
          this.ngZone.run(() => {
            this.incomingCallerId = info.callerId;
            this.callState = 'incoming';
          });
        }),

        this.webrtc.incomingChannelCall.subscribe(info => {
          if (!this.channelId) return;
          this.ngZone.run(() => {
            this.incomingCallerId = info.callerId;
            this.incomingIsChannel = true;
            this.callState = 'incoming';
          });
        }),

        this.webrtc.remoteStreamsChanged.subscribe(items => {
          this.ngZone.run(() => {
            this.remoteParticipants = items.map(item => ({
              peerId: item.peerId,
              stream: item.stream,
              label: item.peerId === this.currentUserId ? 'You' : `User #${item.peerId}`,
              hasVideo: (item.stream && item.stream.getVideoTracks && item.stream.getVideoTracks().some(t => t.enabled)) || false,
              initials: this.initialsOf(item.peerId === this.currentUserId ? 'You' : `User ${item.peerId}`),
            } as any));
            this.hasRemoteStream = this.remoteParticipants.length > 0;
            if (this.hasRemoteStream && this.callState !== 'connected') {
              this.setConnected();
            }
            setTimeout(() => this.assignParticipantStreams(), 0);
          });
        }),

        this.webrtc.screenShareChanged.subscribe(({ userId, sharing }) => {
          this.ngZone.run(() => {
            if (sharing) {
              this.remoteIsSharing = userId !== String(this.currentUserId);
              this.screenSharerId = userId;
            } else if (this.screenSharerId === userId) {
              this.remoteIsSharing = false;
              this.screenSharerId = null;
            }
          });
        }),

        this.webrtc.screenShareBlocked.subscribe(() => {
          this.ngZone.run(() => {
            this.snackBar.open('Someone is already sharing their screen.', 'OK', { duration: 3000 });
          });
        }),

        this.webrtc.localScreenSharingStopped.subscribe(() => {
          this.ngZone.run(() => {
            this.screenSharing = false;
            this.screenStreamForUI = null;
            this.localVideoRef.nativeElement.srcObject = this.localStream;
          });
        })
      );

      const pendingCallerId = this.webrtc.getPendingCallerId();
      if (pendingCallerId !== null) {
        this.incomingCallerId = pendingCallerId;
        this.callState = 'incoming';
      } else if (this.targetUserId !== null) {
        this.startCall();
      } else if (this.channelId) {
        this.startCall();
      }
    } catch {
      this.mediaError = true;
      this.snackBar
        .open('Camera/microphone access denied.', 'Retry', { duration: 8000 })
        .onAction()
        .subscribe(() => this.initMedia());
    }
  }

  // ── Call control ────────────────────────────────────────────────────────

  startCall(): void {
    if (!this.mediaReady) return;
    this.callState = 'calling';

    if (this.channelId && !this.targetUserId) {
      this.webrtc.startChannelMeeting(this.channelId).catch(() => {
        this.callState = 'ready';
        this.snackBar.open('Could not start the channel meeting.', 'Dismiss', { duration: 4000 });
      });
      return;
    }

    if (!this.targetUserId) {
      this.callState = 'ready';
      return;
    }

    this.webrtc.startCall(this.targetUserId).catch(() => {
      this.callState = 'ready';
      this.snackBar.open('Could not start the call.', 'Dismiss', { duration: 4000 });
    });
  }

  acceptCall(): void {
    this.webrtc.acceptCall()
      .then(() => this.setConnected())
      .catch(() => {
        this.callState = 'ready';
        this.snackBar.open('Could not accept the call.', 'Dismiss', { duration: 4000 });
      });
  }

  rejectCall(): void {
    this.webrtc.rejectCall();
    this.incomingCallerId = null;
    this.callState = 'ready';
    this.detachRemote();
  }

  endCall(): void {
    this.webrtc.stopCall();
    this.onCallTerminated();
  }

  goBack(): void {
    this.navigateBack();
  }

  retryMedia(): void {
    void this.initMedia();
  }

  // ── Mic / camera toggles (track.enabled only — no new signaling) ───────

  toggleMic(): void {
    if (!this.localStream) return;
    this.micEnabled = !this.micEnabled;
    this.localStream.getAudioTracks().forEach(t => { t.enabled = this.micEnabled; });
  }

  toggleCam(): void {
    if (!this.localStream) return;
    this.camEnabled = !this.camEnabled;
    this.localStream.getVideoTracks().forEach(t => { t.enabled = this.camEnabled; });
  }

  async toggleScreenShare(): Promise<void> {
    if (this.screenSharing) {
      await this.webrtc.stopScreenShare();
      // localScreenSharingStopped subscription handles state reset
    } else {
      try {
        const screenStream = await this.webrtc.startScreenShare();
        this.screenSharing = true;
        this.screenStreamForUI = screenStream;
        // localVideoRef keeps showing camera; localScreenRefSetter assigns stream
        // once *ngIf renders the #localScreenRef element
      } catch {
        // user cancelled the picker — do nothing
      }
    }
  }

  // ── Internal state helpers ─────────────────────────────────────────────

  private setConnected(): void {
    if (this.callState === 'connected') return;
    this.callState = 'connected';
    this.callStartedAt = Date.now();
    this.durationTimer = setInterval(() => {
      const total = Math.floor((Date.now() - this.callStartedAt) / 1000);
      const m = String(Math.floor(total / 60)).padStart(2, '0');
      const s = String(total % 60).padStart(2, '0');
      this.callDuration = `${m}:${s}`;
    }, 1000);
  }

  /** Local or remote hang-up: clean the stage, then leave the page. */
  private onCallTerminated(): void {
    this.callState = 'ended';
    this.stopDurationTimer();
    this.detachRemote();
    this.incomingCallerId = null;

    // Brief pause so "Call ended" is visible, then navigate back
    setTimeout(() => this.navigateBack(), 800);
  }

  private navigateBack(): void {
    if (this.navigatedAway) return;
    this.navigatedAway = true;
    this.teardownMedia();
    if (globalThis.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/home']);
    }
  }

  private detachRemote(): void {
    this.remoteParticipants = [];
    this.hasRemoteStream = false;
  }

  private initialsOf(nameOrId: string): string {
    if (!nameOrId) return '?';
    const name = String(nameOrId).replace(/[^\p{L}\s]/gu, ' ');
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return (String(nameOrId).slice(0, 2) || '?').toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Accept incoming call with option to enable/disable local video
  acceptIncoming(acceptWithVideo = true): void {
    if (this.incomingIsChannel) {
      // Accept channel meeting: tell service to send 'channel-ready'
      this.webrtc.acceptChannelCall(!!acceptWithVideo).then(() => {
        this.incomingIsChannel = false;
        this.incomingCallerId = null;
        this.setConnected();
      }).catch(() => {
        this.snackBar.open('Could not join channel meeting.', 'Dismiss', { duration: 4000 });
        this.callState = 'ready';
      });
      return;
    }

    if (!this.localStream) return this.acceptCall();
    try {
      this.localStream.getVideoTracks().forEach(t => { t.enabled = !!acceptWithVideo; });
      this.camEnabled = !!acceptWithVideo;
    } finally {
      this.acceptCall();
    }
  }

  // Explicit reject handler for incoming calls
  rejectIncoming(): void {
    if (this.incomingIsChannel) {
      this.webrtc.rejectChannelCall();
      this.incomingIsChannel = false;
      this.incomingCallerId = null;
      this.callState = 'ready';
      return;
    }
    this.rejectCall();
  }

  private assignParticipantStreams(): void {
    this.participantVideoRefs?.forEach(videoRef => {
      const peerId = (videoRef.nativeElement.dataset as DOMStringMap)['peerId'];
      if (!peerId) return;
      const participant = this.remoteParticipants.find(item => item.peerId === peerId);
      if (participant && videoRef.nativeElement.srcObject !== participant.stream) {
        videoRef.nativeElement.srcObject = participant.stream;
      }
    });
  }

  /**
   * MANDATORY teardown: the camera light must go off no matter how the
   * user leaves this page (End Call, Back, route change, browser nav).
   */
  private teardownMedia(): void {
    this.stopDurationTimer();

    if (this.callState === 'calling' || this.callState === 'connected') {
      // Notifies the peer AND stops local tracks + closes the RTCPeerConnection
      this.webrtc.stopCall();
    }

    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;

    this.localVideoRef.nativeElement.srcObject = null;
    this.detachRemote();
  }

  private stopDurationTimer(): void {
    if (this.durationTimer !== null) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  ngAfterViewInit(): void {
    this.participantVideoRefs.changes.subscribe(() => this.assignParticipantStreams());
    this.assignParticipantStreams();
  }

  ngOnDestroy(): void {
    this.teardownMedia();
    this.subs.forEach(s => s.unsubscribe());
  }
}
