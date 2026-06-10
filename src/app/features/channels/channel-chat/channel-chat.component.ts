import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface ChatMessage {
  id: number;
  author: string;
  text: string;
  time: string;
}

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatSnackBarModule, MatTooltipModule, MatFormFieldModule, MatInputModule],
  templateUrl: './channel-chat.component.html',
  styleUrls: ['./channel-chat.component.css'],
})
export class ChannelChatComponent implements OnInit {
  channelId = 0;
  channelName = '';
  teamName = '';
  messageText = '';
  messages: ChatMessage[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.channelId = idParam ? Number(idParam) : 0;

    const state = window.history.state as { teamName?: string; channelName?: string };
    this.teamName = state?.teamName ?? '';
    this.channelName = state?.channelName ?? '';
  }

  onBack(): void {
    this.router.navigate(['/home']);
  }

  onSendMessage(): void {
    const text = this.messageText.trim();
    if (!text) {
      return;
    }

    const message: ChatMessage = {
      id: this.messages.length + 1,
      author: 'You',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    this.messages = [...this.messages, message];
    this.messageText = '';
  }

  onStartMeeting(): void {
    this.snackBar.open('Meeting started for this channel.', 'Dismiss', { duration: 3000 });
  }
}
