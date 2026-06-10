import { EventEmitter, Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

interface SignalingPayload {
  from: number;
  to: number;
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
  private localStream!: MediaStream;  // Local media stream (audio/video)
  private currentUserId: number | null = null;
  private currentPeerId: number | null = null;
  private pendingCallerId: number | null = null;
  
  public incomingCall = new EventEmitter<{ callerId: number }>();  // Notify when there's an incoming call
  public callAccepted = new EventEmitter<MediaStream>();  // Notify when a call is accepted
  public remoteStream = new EventEmitter<MediaStream>();  // Emit the remote video stream
  public callEnded = new EventEmitter<void>();
  
  constructor() {
    this.socket = io('https://192.168.100.87:3000', { transports: ['websocket'] });
    this.initializeSocketEvents();
  }

  registerUser(userId: number): void {
    this.currentUserId = userId;
    this.socket.emit('register', { userId });
  }

  // Request access to the local media devices (camera and microphone)
  async initializeMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices.', error);
      throw error;
    }
  }

  // Setup events listeners for socket.io signaling messages
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

  // Starts a call by creating an offer and sending it to the selected member
  async startCall(targetUserId: number) {
    if (this.currentUserId === null) {
      throw new Error('Current user is not registered for signaling.');
    }
    this.currentPeerId = targetUserId;
    await this.createPeerConnection();
    this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.socket.emit('offer', {
      from: this.currentUserId,
      to: targetUserId,
      offer: this.peerConnection.localDescription,
    });
  }

  // Accepts an incoming call by creating an answer and sending it to the caller
  async acceptCall() {
    if (this.currentUserId === null || this.pendingCallerId === null) {
      throw new Error('No incoming call to accept.');
    }
    this.currentPeerId = this.pendingCallerId;
    this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));
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
        to: this.pendingCallerId,
      });
    }
    this.pendingCallerId = null;
    this.cleanup();
  }

  // Stops the call by notifying the peer, stopping local media, and cleaning up connections
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

  // Cleans up the peer connection by closing it and releasing resources
  private cleanup() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null as any;
    }
    this.currentPeerId = null;
    this.pendingCallerId = null;
  }
}
