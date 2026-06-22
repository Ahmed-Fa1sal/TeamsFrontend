import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TextFieldModule } from '@angular/cdk/text-field';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '@features/auth/services/auth.service';
import { ChatApiService } from './services/chat-api.service';
import { ChatWebSocketService } from './services/chat-websocket.service';
import { ChatMessage, ChatMessageGroup, ConversationDto, ConversationType, MessageDto } from './models/chat.models';
import { groupMessages, startsAuthorGroup, endsAuthorGroup, timeLabelFor } from './utils/group-messages';

interface ChatRouteState {
  type?: ConversationType;
  teamName?: string;
  channelName?: string;
  partnerName?: string;
}

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    TextFieldModule,
  ],
templateUrl: './chat-page.component.html',
styleUrls: ['./chat-page.component.css'],
})
export class ChatPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesArea') private readonly messagesArea?: ElementRef<HTMLElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);
  private readonly chatApi = inject(ChatApiService);
  private readonly chatWs = inject(ChatWebSocketService);
  private readonly destroy$ = new Subject<void>();

  conversationId = 0;
  conversationType: ConversationType = 'CHANNEL';
  headerTitle = '';
  headerBreadcrumb = '';

  messageText = '';
  sending = false;
  loading = false;
  loadError = '';
  showNewPill = false;

  messages: ChatMessage[] = [];
  groups: ChatMessageGroup[] = [];

  private currentUserId: number | string = 0;
  private currentUserName = '';   // display name  (firstName + lastName)
  private currentUsername = '';   // login username (user.username)
  private currentUserEmail = '';
  private readonly seenIds = new Set<number | string>();
  private resolverFn: (() => Observable<ConversationDto>) | null = null;

  readonly startsAuthorGroup = startsAuthorGroup;
  readonly endsAuthorGroup = endsAuthorGroup;
  readonly timeLabelFor = timeLabelFor;

  ngOnInit(): void {
    const routePath = this.route.snapshot.routeConfig?.path ?? '';
    const params = this.route.snapshot.paramMap;

    console.log('[Chat] route path:', routePath);
    console.log('[Chat] route params:', Object.fromEntries(
      ['conversationId', 'userId', 'teamId', 'channelId']
        .filter(k => params.has(k))
        .map(k => [k, params.get(k)])
    ));

    const state = (globalThis.history?.state ?? {}) as ChatRouteState;
    this.conversationType = state.type ?? 'CHANNEL';
    this.buildHeader(state);

    const user = this.authService.getCurrentUser();
    if (user) {
      // user.id is typed string|undefined — fall back to JWT sub claim if absent
      this.currentUserId    = user.id ?? this.extractIdFromJwt() ?? 0;
      this.currentUsername  = user.username ?? '';
      this.currentUserEmail = user.email ?? '';
      this.currentUserName  =
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || this.currentUsername;
    }
    console.log('[Chat] identity — userId:', this.currentUserId,
      '| username:', this.currentUsername,
      '| email:', this.currentUserEmail,
      '| displayName:', this.currentUserName);

    // Pre-warm WebSocket so the handshake is done by the time user sends.
    this.chatWs.connect();

    // Route param names embed the semantic: no guessing needed.
    // Each branch reads only the named param that belongs to that route.
    if (routePath.includes(':conversationId')) {
      const id = this.resolveParam(params.get('conversationId'), 'conversationId');
      if (id === null) return;
      this.conversationId = id;
      console.log('[Chat] resolved conversationId directly from route:', id);
      this.loadMessages();
      this.connectWs();
    } else if (routePath.includes(':userId')) {
      const userId = this.resolveParam(params.get('userId'), 'userId');
      if (userId === null) return;
      this.conversationType = 'DIRECT';
      console.log('[Chat] resolving DIRECT conversation for userId:', userId);
      this.resolveAndLoad(() => this.chatApi.getOrCreateDirect(userId));
    } else if (routePath.includes(':teamId')) {
      const teamId = this.resolveParam(params.get('teamId'), 'teamId');
      if (teamId === null) return;
      this.conversationType = 'TEAM';
      console.log('[Chat] resolving TEAM conversation for teamId:', teamId);
      this.resolveAndLoad(() => this.chatApi.getTeamConversation(teamId));
    } else if (routePath.includes(':channelId')) {
      const channelId = this.resolveParam(params.get('channelId'), 'channelId');
      if (channelId === null) return;
      this.conversationType = 'CHANNEL';
      console.log('[Chat] resolving CHANNEL conversation for channelId:', channelId);
      this.resolveAndLoad(() => this.chatApi.getChannelConversation(channelId));
    } else {
      this.loadError = 'Unknown chat route. Navigate from Home or a team page.';
      console.error('[Chat] unrecognised route path:', routePath);
    }
  }

  ngAfterViewInit(): void {
    this.scrollToBottom(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBack(): void {
    this.router.navigate(['/home']);
  }

  onStartMeeting(): void {
    this.snackBar.open('Video calls are coming soon.', 'Dismiss', { duration: 3000 });
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSendMessage();
    } else if (event.key === 'Escape') {
      (event.target as HTMLElement | null)?.blur();
    }
  }

  onSendMessage(): void {
    const text = this.messageText.trim();
    if (!text || this.sending || !this.conversationId) return;

    // Try WebSocket first; fall back to HTTP if not connected or publish throws.
    if (this.chatWs.isConnected) {
      try {
        this.chatWs.sendToConversation(this.conversationId, { content: text });
        this.messageText = '';
        return;
      } catch {
        // fall through
      }
    }
    this.sendViaHttp(text);
  }

  onMessagesScroll(): void {
    if (this.isNearBottom()) this.showNewPill = false;
  }

  scrollToLatest(): void {
    this.scrollToBottom(true);
    this.showNewPill = false;
  }

  retryLoad(): void {
    this.loadError = '';
    if (this.resolverFn) {
      this.resolveAndLoad(this.resolverFn);
    } else if (this.conversationId) {
      this.loadMessages();
    }
  }

  ariaForMessage(m: ChatMessage): string {
    return `${m.authorName} said: ${m.text} at ${timeLabelFor(m.sentAt)}`;
  }

  // ── private ────────────────────────────────────────────────────────────────

  private resolveParam(raw: string | null, name: string): number | null {
    if (!raw) {
      this.loadError = `Navigation error: missing "${name}" parameter.`;
      console.error('[ChatPageComponent] Missing route param:', name, '| route:', this.route.snapshot.routeConfig?.path);
      return null;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      this.loadError = `Navigation error: "${name}" is not a valid ID (got "${raw}").`;
      console.error('[ChatPageComponent] Invalid route param:', name, '=', raw);
      return null;
    }
    return n;
  }

  private resolveAndLoad(fn: () => Observable<ConversationDto>): void {
    this.resolverFn = fn;
    this.loading = true;
    this.loadError = '';
    fn().pipe(takeUntil(this.destroy$)).subscribe({
      next: conv => {
        console.log('[Chat] conversation resolved:', { id: conv.id, type: conv.type, name: conv.name });
        this.conversationId = conv.id;
        if (!this.headerTitle) this.headerTitle = conv.name;
        this.loadMessages();
        this.connectWs();
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.loading = false;
        this.loadError = err?.error?.message ?? 'Failed to load conversation.';
        console.error('[Chat] conversation resolve failed — HTTP', err?.status, err?.error?.message);
      },
    });
  }

  private loadMessages(): void {
    this.loading = true;
    this.loadError = '';
    console.log('[Chat] loading messages for conversationId:', this.conversationId);
    this.chatApi.getMessages(this.conversationId).pipe(takeUntil(this.destroy$)).subscribe({
      next: msgs => {
        this.loading = false;
        console.log('[Chat] messages loaded:', msgs.length);
        this.messages = msgs.map(m => { this.seenIds.add(m.id); return this.toView(m); });
        this.rebuildGroups();
        queueMicrotask(() => { this.scrollToBottom(false); });
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.loading = false;
        this.loadError = err?.error?.message ?? 'Failed to load messages.';
        console.error('[Chat] loadMessages failed — HTTP', err?.status, err?.error?.message);
      },
    });
  }

  private connectWs(): void {
    console.log('[Chat] connecting WebSocket for conversationId:', this.conversationId,
      '| WS already connected:', this.chatWs.isConnected);
    this.chatWs.subscribeToConversation(this.conversationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(raw => {
        const msg = raw as MessageDto;
        console.log('[Chat] WS message received — id:', msg?.id);
        if (!msg?.id || this.seenIds.has(msg.id)) return;
        this.seenIds.add(msg.id);
        const view = this.toView(msg);
        const wasNearBottom = this.isNearBottom();
        this.appendMsg(view);
        if (!wasNearBottom && !view.isOwn) {
          this.showNewPill = true;
        } else {
          queueMicrotask(() => { this.scrollToBottom(true); this.animateLast(); });
        }
      });
  }

  private sendViaHttp(text: string): void {
    this.sending = true;
    this.messageText = '';
    this.chatApi.sendMessage(this.conversationId, { content: text })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: msg => {
          this.sending = false;
          if (!this.seenIds.has(msg.id)) {
            this.seenIds.add(msg.id);
            const wasNearBottom = this.isNearBottom();
            this.appendMsg(this.toView(msg));
            if (wasNearBottom) queueMicrotask(() => { this.scrollToBottom(true); this.animateLast(); });
          }
        },
        error: () => {
          this.sending = false;
          this.messageText = text;
          this.snackBar.open('Failed to send message. Please try again.', 'Dismiss', { duration: 4000 });
        },
      });
  }

  private toView(m: MessageDto): ChatMessage {
    const senderId       = String(m.sender.id);
    const myId           = String(this.currentUserId);
    const senderFullName = m.sender.fullName?.trim() ?? '';

    // Four independent signals — first truthy one wins.
    const byId       = myId !== '0' && senderId === myId;
    const byUsername = !!this.currentUsername && m.sender.username === this.currentUsername;
    const byFullName = !!this.currentUserName  && senderFullName   === this.currentUserName;
    const byEmail    = !!this.currentUserEmail && m.sender.username === this.currentUserEmail;
    const isOwn = byId || byUsername || byFullName || byEmail;

    console.log('[Chat] toView — sender.id:', m.sender.id,
      '| sender.username:', m.sender.username,
      '| sender.fullName:', senderFullName,
      '| myId:', myId, '| myUsername:', this.currentUsername,
      '| byId:', byId, '| byUsername:', byUsername,
      '| byFullName:', byFullName, '| byEmail:', byEmail,
      '→ isOwn:', isOwn);

    const authorName = senderFullName || m.sender.username;
    return {
      id: m.id,
      authorId: m.sender.id,
      authorName,
      authorInitials: this.initials(authorName),
      isOwn,
      text: m.content,
      sentAt: m.createdAt,
      replyTo: m.replyTo
        ? { senderName: m.replyTo.sender.fullName?.trim() || m.replyTo.sender.username, text: m.replyTo.content }
        : undefined,
    };
  }

  private appendMsg(msg: ChatMessage): void {
    this.messages = [...this.messages, msg];
    this.rebuildGroups();
  }

  private rebuildGroups(): void {
    this.groups = groupMessages(this.messages);
  }

  private buildHeader(state: ChatRouteState): void {
    switch (this.conversationType) {
      case 'DIRECT':
        this.headerBreadcrumb = 'Direct Message';
        this.headerTitle = state.partnerName ?? 'Direct Message';
        break;
      case 'TEAM':
        this.headerBreadcrumb = 'Team Chat';
        this.headerTitle = state.teamName ?? 'Team Chat';
        break;
      default:
        this.headerBreadcrumb = state.teamName ?? 'Channel';
        this.headerTitle = state.channelName ?? 'Channel';
    }
  }

  private initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private isNearBottom(): boolean {
    const el = this.messagesArea?.nativeElement;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }

  private scrollToBottom(smooth: boolean): void {
    const el = this.messagesArea?.nativeElement;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }

  private extractIdFromJwt(): string | number | null {
    const token = this.authService.getToken();
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;
      const id = payload['sub'] ?? payload['userId'] ?? payload['id'] ?? null;
      console.log('[Chat] JWT payload fields — sub:', payload['sub'],
        '| userId:', payload['userId'], '| id:', payload['id']);
      return id as string | number | null;
    } catch {
      return null;
    }
  }

  private animateLast(): void { /* animations disabled — re-add gsap after TDZ fix confirmed */ }
}
