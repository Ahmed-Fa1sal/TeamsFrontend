import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
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
export class VideocallComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo', { static: true }) private readonly localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo', { static: true }) private readonly remoteVideoRef!: ElementRef<HTMLVideoElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);
  private readonly webrtc = inject(MediaServiceService);
  private readonly snackBar = inject(MatSnackBar);

  callState: CallState = 'ready';
  targetUserId: string | null = null;
  targetUserName = '';
  incomingCallerId: string | null = null;

  micEnabled = true;
  camEnabled = true;
  mediaError = false;
  hasRemoteStream = false;

  /** mm:ss formatted call duration, shown while connected */
  callDuration = '00:00';

  private localStream: MediaStream | null = null;
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

    this.webrtc.registerUser(currentUserId);

    this.subs.push(
      this.route.queryParamMap.subscribe(params => {
        this.targetUserId = params.get('targetUserId');
        this.targetUserName = params.get('targetUserName') ?? '';
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

      this.subs.push(
        this.webrtc.incomingCall.subscribe(info => {
          this.incomingCallerId = info.callerId;
          this.callState = 'incoming';
        }),

        this.webrtc.remoteStream.subscribe(stream => {
          const remote = this.remoteVideoRef.nativeElement;
          if (stream) {
            remote.srcObject = stream;
            this.hasRemoteStream = true;
            this.setConnected();
          } else {
            remote.srcObject = null;
            this.hasRemoteStream = false;
          }
        }),

        this.webrtc.callEnded.subscribe(() => this.onCallTerminated())
      );

      const pendingCallerId = this.webrtc.getPendingCallerId();
      if (pendingCallerId !== null) {
        this.incomingCallerId = pendingCallerId;
        this.callState = 'incoming';
      } else if (this.targetUserId !== null) {
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
    if (!this.targetUserId || !this.mediaReady) return;
    this.callState = 'calling';
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
    this.remoteVideoRef.nativeElement.srcObject = null;
    this.hasRemoteStream = false;
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
    this.remoteVideoRef.nativeElement.srcObject = null;
  }

  private stopDurationTimer(): void {
    if (this.durationTimer !== null) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.teardownMedia();
    this.subs.forEach(s => s.unsubscribe());
  }
}
