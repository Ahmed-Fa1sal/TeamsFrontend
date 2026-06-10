import { EventEmitter, Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

interface SignalingPayload {
  from: string;
  to: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

@Injectable({
  providedIn: 'root'
})
export class MediaServiceService {
  private socket: Socket;  // Socket.IO client instance for signaling
  private peerConnection!: RTCPeerConnection;  // WebRTC peer connection
  private localStream: MediaStream | null = null;  // Local media stream (audio/video)
  private currentUserId: string | null = null;
  private currentPeerId: string | null = null;
  private pendingCallerId: string | null = null;
  
  public incomingCall = new EventEmitter<{ callerId: string }>();  // Notify when there's an incoming call
  public remoteStream = new EventEmitter<MediaStream>();  // Emit the remote video stream
  public callEnded = new EventEmitter<void>();
  
  constructor() {
    this.socket = io('https://192.168.100.87:3000', { transports: ['websocket'] });
    this.initializeSocketEvents();
  }

  registerUser(userId: string | number): void {
    this.currentUserId = String(userId);
    this.socket.emit('register', { userId: this.currentUserId });
  }

  async initializeMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return this.localStream;
    } catch (error: any) {
      console.warn('Video access failed, trying audio-only fallback.', error);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        return this.localStream;
      } catch (audioError) {
        console.error('Error accessing media devices.', audioError);
        throw audioError;
      }
    }
  }

  private initializeSocketEvents() {
    this.socket.on('connect', () => {
      console.log('Socket connected', this.socket.id);
    });

    this.socket.on('offer', async (payload: SignalingPayload) => {
      if (payload.to !== this.currentUserId) return;
      console.log('Received offer from', payload.from);
      this.pendingCallerId = payload.from;
      this.incomingCall.emit({ callerId: payload.from });
      await this.createPeerConnection();
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.offer as RTCSessionDescriptionInit));
    });

    this.socket.on('answer', async (payload: SignalingPayload) => {
      if (payload.to !== this.currentUserId) return;
      console.log('Received answer from', payload.from);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer as RTCSessionDescriptionInit));
    });

    this.socket.on('candidate', async (payload: SignalingPayload) => {
      if (payload.to !== this.currentUserId || !payload.candidate) return;
      console.log('Received ICE candidate from', payload.from);
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
    });

    this.socket.on('hangup', (payload: SignalingPayload) => {
      if (payload.to !== this.currentUserId) return;
      console.log('Call ended by peer', payload.from);
      this.cleanup();
      this.callEnded.emit();
    });

    this.socket.on('reject', (payload: SignalingPayload) => {
      if (payload.to !== this.currentUserId) return;
      console.log('Call rejected by peer', payload.from);
      this.cleanup();
      this.callEnded.emit();
    });
  }

  private createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (!event.candidate || this.currentUserId === null || this.currentPeerId === null) return;
      this.socket.emit('candidate', {
        from: this.currentUserId,
        to: this.currentPeerId,
        candidate: event.candidate.toJSON(),
      });
    };

    this.peerConnection.ontrack = (event) => {
      console.log('Setting remote stream');
      this.remoteStream.emit(event.streams[0]);
    };
  }

  async startCall(targetUserId: string | number) {
    if (this.currentUserId === null) {
      throw new Error('Current user is not registered for signaling.');
    }
    const stream = this.localStream;
    if (!stream) {
      throw new Error('Local media stream is not available.');
    }
    const targetId = String(targetUserId);
    this.currentPeerId = targetId;
    await this.createPeerConnection();
    stream.getTracks().forEach(track => this.peerConnection.addTrack(track, stream));
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.socket.emit('offer', {
      from: this.currentUserId,
      to: targetId,
      offer: this.peerConnection.localDescription,
    });
  }

  async acceptCall() {
    if (this.currentUserId === null || this.pendingCallerId === null) {
      throw new Error('No incoming call to accept.');
    }
    const stream = this.localStream;
    if (!stream) {
      throw new Error('Local media stream is not available.');
    }
    this.currentPeerId = String(this.pendingCallerId);
    stream.getTracks().forEach(track => this.peerConnection.addTrack(track, stream));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.socket.emit('answer', {
      from: this.currentUserId,
      to: this.currentPeerId,
      answer: this.peerConnection.localDescription,
    });
    this.pendingCallerId = null;
  }

  rejectCall() {
    if (this.currentUserId !== null && this.pendingCallerId !== null) {
      this.socket.emit('reject', {
        from: this.currentUserId,
        to: String(this.pendingCallerId),
      });
    }
    this.pendingCallerId = null;
    this.cleanup();
  }

  getPendingCallerId(): string | null {
    return this.pendingCallerId;
  }

  stopCall() {
    if (this.currentUserId !== null && this.currentPeerId !== null) {
      this.socket.emit('hangup', {
        from: this.currentUserId,
        to: this.currentPeerId,
      });
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    this.cleanup();
    this.remoteStream.emit(null as any);
  }

  private cleanup() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null as any;
    }
    this.currentPeerId = null;
    this.pendingCallerId = null;
  }
}
