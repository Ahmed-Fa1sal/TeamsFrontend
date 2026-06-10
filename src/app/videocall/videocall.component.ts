import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaServiceService } from '@app/services/media-service.service';
import { AuthService } from '@features/auth/services/auth.service';

@Component({
  selector: 'app-videocall',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './videocall.component.html',
  styleUrl: './videocall.component.css'
})
export class VideocallComponent implements OnInit {
  localStream!: MediaStream;  // Holds the local media stream (video/audio)
  incomingCall = false;  // Flag to indicate if there’s an incoming call
  callInProgress = false;  // Flag to track if a call is active
  targetUserId: number | null = null;
  targetUserName = '';
  incomingCallerId: number | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly WebrtcService: MediaServiceService,
  ) {}

  async ngOnInit(): Promise<void> {
    const currentUserId = Number(this.authService.getCurrentUser()?.id);
    if (!currentUserId) {
      console.error('Cannot start call without authenticated user.');
      this.router.navigate(['/home']);
      return;
    }

    this.WebrtcService.registerUser(currentUserId);

    this.route.queryParamMap.subscribe(params => {
      const targetIdParam = params.get('targetUserId');
      this.targetUserId = targetIdParam ? Number(targetIdParam) : null;
      this.targetUserName = params.get('targetUserName') ?? '';
    });

    try {
      this.localStream = await this.WebrtcService.initializeMedia();
      const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
      if (localVideo) localVideo.srcObject = this.localStream;

      this.WebrtcService.incomingCall.subscribe(info => {
        this.incomingCallerId = info.callerId;
        this.incomingCall = true;
      });

      this.WebrtcService.remoteStream.subscribe(remoteStream => {
        const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
        if (remoteVideo) remoteVideo.srcObject = remoteStream;
      });
    } catch (error) {
      console.error('Error initializing media:', error);
    }
  }

  rejectCall() {
    this.WebrtcService.rejectCall();
    this.incomingCall = false;
    this.callInProgress = false;

    const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
    if (remoteVideo) remoteVideo.srcObject = null;
  }

  acceptCall() {
    this.WebrtcService.acceptCall();
    this.incomingCall = false;
    this.callInProgress = true;
  }

  stopCall() {
    this.WebrtcService.stopCall();
    this.callInProgress = false;

    const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
    if (localVideo) localVideo.srcObject = null;
  }

  startCall() {
    if (!this.targetUserId) {
      console.error('No target user specified for call.');
      return;
    }
    this.WebrtcService.startCall(this.targetUserId);
    this.callInProgress = true;
  }
}
