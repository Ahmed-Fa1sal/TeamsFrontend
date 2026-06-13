import {
  AfterViewInit,
  Component,
  ElementRef,
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

import gsap from 'gsap';

import { AuthService } from '@features/auth/services/auth.service';
import {
  ChannelMessage,
  MessageGroup,
  groupMessages,
  startsAuthorGroup,
  endsAuthorGroup,
  timeLabelFor,
} from '../utils/group-messages';

const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    TextFieldModule,
  ],
  templateUrl: './channel-chat.component.html',
  styleUrls: ['./channel-chat.component.css'],
})
export class ChannelChatComponent implements OnInit, AfterViewInit {
  @ViewChild('messagesArea') private readonly messagesArea?: ElementRef<HTMLElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);

  channelId = 0;
  channelName = '';
  teamName = '';
  messageText = '';
  sending = false;
  showNewPill = false;

  messages: ChannelMessage[] = [];
  groups: MessageGroup[] = [];

  private currentUserId: string | number = 'me';
  private currentUserName = 'You';
  private currentUserInitials = 'YO';

  // expose pure helpers to the template
  readonly startsAuthorGroup = startsAuthorGroup;
  readonly endsAuthorGroup = endsAuthorGroup;
  readonly timeLabelFor = timeLabelFor;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.channelId = idParam ? Number(idParam) : 0;

    const state = globalThis.history.state as { teamName?: string; channelName?: string };
    this.teamName = state?.teamName ?? '';
    this.channelName = state?.channelName ?? '';

    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId = user.id ?? 'me';
      this.currentUserName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username;
      this.currentUserInitials = this.initialsOf(this.currentUserName || user.username);
    }

    // TODO: load existing messages from the channel messages endpoint when one
    // exists (no GET /channels/:id/messages is available yet). Until then the
    // thread starts empty and holds locally-sent messages for this session.
    this.rebuildGroups();
  }

  ngAfterViewInit(): void {
    this.scrollToBottom(false);
    if (this.messages.length === 0 && !REDUCED_MOTION) {
      const el = this.messagesArea?.nativeElement.querySelector('.chat-empty');
      if (el) gsap.from(el, { opacity: 0, scale: 0.96, duration: 0.35, ease: 'back.out(1.4)' });
    }
  }

  onBack(): void {
    this.router.navigate(['/home']);
  }

  onStartMeeting(): void {
    this.snackBar.open('Meeting started for this channel.', 'Dismiss', { duration: 3000 });
  }

  /** Enter sends (when non-empty), Shift+Enter newline, Esc blurs. */
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
    if (!text || this.sending) return;

    const message: ChannelMessage = {
      id: `${Date.now()}`,
      authorId: this.currentUserId,
      authorName: this.currentUserName,
      authorInitials: this.currentUserInitials,
      isOwn: true,
      text,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };

    // TODO: POST to the channel messages endpoint when available; for now the
    // message is appended to local session state only.
    this.messages = [...this.messages, message];
    this.messageText = '';
    this.rebuildGroups();
    this.showNewPill = false;

    queueMicrotask(() => {
      this.scrollToBottom(true);
      this.animateLastMessage();
    });
  }

  onMessagesScroll(): void {
    if (this.isNearBottom()) this.showNewPill = false;
  }

  scrollToLatest(): void {
    this.scrollToBottom(true);
    this.showNewPill = false;
  }

  ariaForMessage(m: ChannelMessage): string {
    return `${m.authorName} said ${m.text} at ${this.timeLabelFor(m.sentAt)}`;
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private rebuildGroups(): void {
    this.groups = groupMessages(this.messages);
  }

  private initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
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
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !REDUCED_MOTION ? 'smooth' : 'auto' });
  }

  private animateLastMessage(): void {
    if (REDUCED_MOTION) return;
    const rows = this.messagesArea?.nativeElement.querySelectorAll('.msg-row');
    const last = rows?.[rows.length - 1];
    if (last) gsap.from(last, { opacity: 0, y: 8, duration: 0.2, ease: 'power2.out' });
  }
}
