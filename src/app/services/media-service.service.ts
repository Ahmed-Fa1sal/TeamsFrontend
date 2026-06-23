import { EventEmitter, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

interface SignalingPayload {
  from: string;
  to?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  channelId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MediaServiceService {
  private socket: Socket;  // Socket.IO client instance for signaling
  private localStream: MediaStream | null = null;  // Local media stream (audio/video)
  private currentUserId: string | null = null;
  private currentChannelId: string | null = null;
  private currentPeerId: string | null = null;
  private pendingCallerId: string | null = null;
  private pendingChannelCallerId: string | null = null;
  private incomingCallPending = false;
  private callActive = false;
  private candidateQueues = new Map<string, RTCIceCandidateInit[]>();

  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();

  public incomingCall = new EventEmitter<{ callerId: string }>();
  public incomingChannelCall = new EventEmitter<{ callerId: string; channelId: string }>();
  public missedCall = new EventEmitter<{ callerId: string }>();
  public remoteStream = new BehaviorSubject<MediaStream | null>(null);
  public remoteStreamsChanged = new EventEmitter<{ peerId: string; stream: MediaStream }[]>();
  public callEnded = new EventEmitter<void>();
  public screenShareChanged = new EventEmitter<{ userId: string; sharing: boolean }>();
  public screenShareBlocked = new EventEmitter<void>();
  public localScreenSharingStopped = new EventEmitter<void>();

  public screenSharingActive = false;
  private screenStream: MediaStream | null = null;
  private cameraVideoTrack: MediaStreamTrack | null = null;

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
      if (payload.to !== this.currentUserId || !payload.offer || !payload.from) return;
      console.log('Received offer from', payload.from);
      const peerId = payload.from;
      const pc = this.createPeerConnection(peerId);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer as RTCSessionDescriptionInit));

      if (this.currentChannelId !== null && payload.channelId === this.currentChannelId) {
        this.pendingChannelCallerId = peerId;
        await this.answerPeerOffer(peerId);
        return;
      }

      this.pendingCallerId = peerId;
      this.incomingCallPending = true;
      this.callActive = false;
      this.incomingCall.emit({ callerId: peerId });
    });

    this.socket.on('answer', async (payload: SignalingPayload) => {
      if (payload.to !== this.currentUserId || !payload.answer || !payload.from) return;
      console.log('Received answer from', payload.from);
      const pc = this.peerConnections.get(payload.from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer as RTCSessionDescriptionInit));
      }
    });

    this.socket.on('candidate', async (payload: SignalingPayload) => {
      if (payload.to !== this.currentUserId || !payload.candidate || !payload.from) return;
      console.log('Received ICE candidate from', payload.from);
      const pc = this.peerConnections.get(payload.from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } else {
        const queued = this.candidateQueues.get(payload.from) ?? [];
        queued.push(payload.candidate);
        this.candidateQueues.set(payload.from, queued);
      }
    });

    this.socket.on('channel-call-request', (payload: SignalingPayload) => {
      if (!payload.from || !payload.channelId || payload.channelId !== this.currentChannelId) return;
      console.log('Received channel call request from', payload.from, 'for channel', payload.channelId);
      // mark pending channel caller and let the UI decide to accept/reject
      this.pendingChannelCallerId = payload.from;
      this.incomingChannelCall.emit({ callerId: payload.from, channelId: payload.channelId });
    });

    this.socket.on('channel-ready', async (payload: SignalingPayload) => {
      if (!payload.from || payload.to !== this.currentUserId) return;
      console.log('Participant ready for channel call:', payload.from);
      await this.startDirectOfferToPeer(payload.from, payload.channelId);
    });

    this.socket.on('hangup', (payload: SignalingPayload) => {
      if (payload.to !== this.currentUserId) return;
      console.log('Call ended by peer', payload.from);
      if (this.incomingCallPending && payload.from === this.pendingCallerId) {
        this.missedCall.emit({ callerId: payload.from });
      }
      this.cleanup();
      this.callEnded.emit();
    });

    this.socket.on('reject', (payload: SignalingPayload) => {
      if (payload.to !== this.currentUserId) return;
      console.log('Call rejected by peer', payload.from);
      if (this.incomingCallPending && payload.from === this.pendingCallerId) {
        this.missedCall.emit({ callerId: payload.from });
      }
      this.cleanup();
      this.callEnded.emit();
    });

    this.socket.on('screen-share-started', (payload: { from: string }) => {
      this.screenShareChanged.emit({ userId: payload.from, sharing: true });
    });

    this.socket.on('screen-share-stopped', (payload: { from: string }) => {
      this.screenShareChanged.emit({ userId: payload.from, sharing: false });
    });

    this.socket.on('screen-share-blocked', () => {
      this.screenShareBlocked.emit();
    });

    this.socket.on('channel-peer-joined', async (payload: { from: string; channelId: string }) => {
      if (!this.currentChannelId || payload.channelId !== this.currentChannelId) return;
      if (!this.currentUserId || payload.from === this.currentUserId) return;
      if (this.peerConnections.has(payload.from)) return;
      // Tie-breaking: higher userId initiates the offer to avoid collisions
      if (String(this.currentUserId) > payload.from) {
        await this.startDirectOfferToPeer(payload.from, this.currentChannelId);
      }
    });
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const existing = this.peerConnections.get(peerId);
    if (existing) {
      return existing;
    }

    const connection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    connection.onicecandidate = (event) => {
      if (!event.candidate || this.currentUserId === null) return;
      this.socket.emit('candidate', {
        from: this.currentUserId,
        to: peerId,
        candidate: event.candidate.toJSON(),
      });
    };

    connection.ontrack = (event) => {
      const stream = event.streams?.[0] ?? new MediaStream([event.track]);
      this.remoteStreams.set(peerId, stream);
      this.remoteStreamsChanged.emit(
        Array.from(this.remoteStreams.entries()).map(([id, remoteStream]) => ({ peerId: id, stream: remoteStream }))
      );
      this.remoteStream.next(stream);
    };

    this.peerConnections.set(peerId, connection);

    const queuedCandidates = this.candidateQueues.get(peerId) ?? [];
    if (queuedCandidates.length > 0) {
      queuedCandidates.forEach(async candidate => {
        try {
          await connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Failed to apply queued ICE candidate for', peerId, e);
        }
      });
      this.candidateQueues.delete(peerId);
    }

    return connection;
  }

  private async addLocalTracks(peerId: string): Promise<void> {
    const stream = this.localStream;
    if (!stream) {
      throw new Error('Local media stream is not available.');
    }
    const connection = this.createPeerConnection(peerId);
    const hasTracks = connection.getSenders().some(sender => sender.track?.kind === 'audio' || sender.track?.kind === 'video');
    if (!hasTracks) {
      stream.getTracks().forEach(track => connection.addTrack(track, stream));
    }
  }

  private async startDirectOfferToPeer(targetId: string, channelId?: string): Promise<void> {
    if (this.currentUserId === null) {
      throw new Error('Current user is not registered for signaling.');
    }
    this.currentPeerId = targetId;
    await this.addLocalTracks(targetId);
    const pc = this.createPeerConnection(targetId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.emit('offer', {
      from: this.currentUserId,
      to: targetId,
      channelId,
      offer: pc.localDescription,
    });
  }

  private async answerPeerOffer(peerId: string): Promise<void> {
    if (this.currentUserId === null) {
      throw new Error('Current user is not registered for signaling.');
    }
    const stream = this.localStream;
    if (!stream) {
      throw new Error('Local media stream is not available.');
    }
    const connection = this.createPeerConnection(peerId);
    stream.getTracks().forEach(track => connection.addTrack(track, stream));
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    this.socket.emit('answer', {
      from: this.currentUserId,
      to: peerId,
      channelId: this.currentChannelId ?? undefined,
      answer: connection.localDescription,
    });
    this.callActive = true;
    this.pendingChannelCallerId = null;
  }

  async startCall(targetUserId: string | number) {
    if (this.currentUserId === null) {
      throw new Error('Current user is not registered for signaling.');
    }
    const targetId = String(targetUserId);
    this.callActive = true;
    await this.startDirectOfferToPeer(targetId);
  }

  async acceptCall() {
    const callerId = this.pendingCallerId;
    if (this.currentUserId === null || !callerId) {
      throw new Error('No incoming call to accept.');
    }
    this.pendingCallerId = null;
    this.incomingCallPending = false;
    this.callActive = true;
    await this.answerPeerOffer(callerId);
  }

  rejectCall() {
    if (this.currentUserId !== null && this.pendingCallerId !== null) {
      this.socket.emit('reject', {
        from: this.currentUserId,
        to: String(this.pendingCallerId),
      });
    }
    this.pendingCallerId = null;
    this.incomingCallPending = false;
    this.callActive = false;
    this.cleanup();
  }

  getPendingCallerId(): string | null {
    return this.pendingCallerId;
  }

  async joinChannel(channelId: string) {
    if (this.currentUserId === null) {
      throw new Error('Current user is not registered for signaling.');
    }
    this.currentChannelId = channelId;
    this.socket.emit('join-channel', { channelId });
  }

  async leaveChannel(channelId: string | null = this.currentChannelId) {
    if (this.currentUserId === null || !channelId) return;
    this.socket.emit('leave-channel', { channelId });
    if (this.currentChannelId === channelId) {
      this.currentChannelId = null;
    }
  }

  async startChannelMeeting(channelId: string) {
    if (this.currentUserId === null) {
      throw new Error('Current user is not registered for signaling.');
    }
    this.currentChannelId = channelId;
    this.callActive = true;
    this.socket.emit('start-channel-call', { from: this.currentUserId, channelId });
    // Announce presence so late joiners can open mesh connections to us
    this.socket.emit('channel-peer-joined', { from: this.currentUserId, channelId });
  }

  /**
   * Called when the local user accepts an incoming channel meeting.
   * If acceptWithVideo is false, local video tracks will be disabled before signaling readiness.
   */
  async acceptChannelCall(acceptWithVideo = true) {
    if (this.currentUserId === null || !this.pendingChannelCallerId || !this.currentChannelId) return;
    // configure local video tracks according to accept preference
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = !!acceptWithVideo);
    }
    // notify caller we're ready to receive direct offers
    this.socket.emit('channel-ready', {
      from: this.currentUserId,
      to: this.pendingChannelCallerId,
      channelId: this.currentChannelId,
    });
    // Announce to all channel members so they open mesh connections to us
    this.socket.emit('channel-peer-joined', { from: this.currentUserId, channelId: this.currentChannelId });
    this.callActive = true;
    this.pendingChannelCallerId = null;
  }

  rejectChannelCall() {
    if (this.currentUserId !== null && this.pendingChannelCallerId !== null) {
      this.socket.emit('reject', {
        from: this.currentUserId,
        to: String(this.pendingChannelCallerId),
      });
    }
    this.pendingChannelCallerId = null;
  }

  async startScreenShare(): Promise<MediaStream> {
    const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
    const screenTrack: MediaStreamTrack = screenStream.getVideoTracks()[0];

    this.cameraVideoTrack = this.localStream?.getVideoTracks()[0] ?? null;
    this.screenStream = screenStream;

    for (const pc of this.peerConnections.values()) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);
    }

    screenTrack.onended = () => { void this.stopScreenShare(); };
    this.screenSharingActive = true;

    const peerId = this.currentPeerId;
    if (this.currentChannelId && this.currentUserId) {
      this.socket.emit('screen-share-started', { from: this.currentUserId, channelId: this.currentChannelId });
    } else if (peerId && this.currentUserId) {
      this.socket.emit('screen-share-started', { from: this.currentUserId, to: peerId });
    }

    return screenStream;
  }

  async stopScreenShare(): Promise<void> {
    if (!this.screenSharingActive) return;

    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = null;

    const cameraTrack = this.cameraVideoTrack ?? this.localStream?.getVideoTracks()[0] ?? null;
    for (const pc of this.peerConnections.values()) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
    }

    this.cameraVideoTrack = null;
    this.screenSharingActive = false;
    this.localScreenSharingStopped.emit();

    const peerId = this.currentPeerId;
    if (this.currentChannelId && this.currentUserId) {
      this.socket.emit('screen-share-stopped', { from: this.currentUserId, channelId: this.currentChannelId });
    } else if (peerId && this.currentUserId) {
      this.socket.emit('screen-share-stopped', { from: this.currentUserId, to: peerId });
    }
  }

  stopCall() {
    if (this.currentUserId !== null) {
      for (const peerId of this.peerConnections.keys()) {
        this.socket.emit('hangup', {
          from: this.currentUserId,
          to: peerId,
        });
      }
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    this.cleanup();
    this.remoteStream.next(null);
    this.remoteStreamsChanged.emit([]);
  }

  private cleanup() {
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = null;
    this.cameraVideoTrack = null;
    this.screenSharingActive = false;

    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.currentPeerId = null;
    this.pendingCallerId = null;
    this.pendingChannelCallerId = null;
    this.incomingCallPending = false;
    this.callActive = false;
    // Keep currentChannelId while the user remains in an opened channel.
  }
}
