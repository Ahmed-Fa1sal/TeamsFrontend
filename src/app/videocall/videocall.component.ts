import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaServiceService } from '../services/media-service.service';
import { AuthService } from '@features/auth/services/auth.service';

@Component({
  selector: 'app-videocall',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './videocall.component.html',
  styleUrls: ['./videocall.component.css']
})
export class VideocallComponent implements OnInit {
  localStream!: MediaStream;  // Holds the local media stream (video/audio)
  incomingCall = false;  // Flag to indicate if there’s an incoming call
  callInProgress = false;  // Flag to track if a call is active
  targetUserId: string | null = null;
  targetUserName = '';
  incomingCallerId: string | null = null;
  private mediaReady = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly WebrtcService: MediaServiceService,
  ) {}

  rejectCall() {
  this.WebrtcService.rejectCall();
  this.incomingCall = false;
  this.callInProgress = false;

  const remoteVideo  = document.getElementById('remoteVideo') as HTMLVideoElement ;
  if(remoteVideo) remoteVideo.srcObject = null;
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

  async ngOnInit(): Promise<void> {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId) {
      console.error('Cannot start call without authenticated user.');
      this.router.navigate(['/home']);
      return;
    }

    this.WebrtcService.registerUser(currentUserId);

    this.route.queryParamMap.subscribe(params => {
      this.targetUserId = params.get('targetUserId');
      this.targetUserName = params.get('targetUserName') ?? '';

      if (this.targetUserId !== null && this.mediaReady && !this.incomingCall) {
        this.startCall();
      }
    });

    try {
      this.localStream = await this.WebrtcService.initializeMedia();
      this.mediaReady = true;
      const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
      if (localVideo) localVideo.srcObject = this.localStream;

      this.WebrtcService.incomingCall.subscribe(info => {
        this.incomingCallerId = info.callerId;
        this.incomingCall = true;
      });

      const pendingCallerId = this.WebrtcService.getPendingCallerId();
      if (pendingCallerId !== null) {
        this.incomingCallerId = pendingCallerId;
        this.incomingCall = true;
      }

      this.WebrtcService.remoteStream.subscribe(remoteStream => {
        const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
        if (remoteVideo) {
          remoteVideo.srcObject = remoteStream;
        }
      });

      this.WebrtcService.callEnded.subscribe(() => {
        this.callInProgress = false;
        this.incomingCall = false;
        this.incomingCallerId = null;
        const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
        if (remoteVideo) {
          remoteVideo.srcObject = null;
        }
      });
    } catch (error) {
      console.error('Error initializing media:', error);
    }
  }

}