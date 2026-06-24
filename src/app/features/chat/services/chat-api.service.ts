import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getApiUrl } from '@core/config/api.config';
import { ConversationDto, ConversationSummary, MessageDto, SendMessageRequest } from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly http = inject(HttpClient);

  /** GET /conversations/{id}/messages — unwraps { status, data: { content: [...] } } */
  getMessages(conversationId: number, page = 0, size = 20): Observable<MessageDto[]> {
    const url = getApiUrl(`/conversations/${conversationId}/messages`);
    console.log('[ChatAPI] GET messages:', url);
    return this.http
      .get<unknown>(url, {
        params: { page: String(page), size: String(size), sort: 'createdAt,asc' },
      })
      .pipe(map(res => this.extractMessages(res)));
  }

  /** POST /conversations/{id}/messages */
  sendMessage(conversationId: number, req: SendMessageRequest): Observable<MessageDto> {
    const url = getApiUrl(`/conversations/${conversationId}/messages`);
    console.log('[ChatAPI] POST message:', url, req);
    return this.http
      .post<unknown>(url, req)
      .pipe(map(res => this.unwrap(res) as MessageDto));
  }

  /** POST /conversations/direct { targetUserId } → ConversationDto */
  getOrCreateDirect(targetUserId: number): Observable<ConversationDto> {
    const url = getApiUrl('/conversations/direct');
    console.log('[ChatAPI] POST direct conversation:', url, { targetUserId });
    return this.http
      .post<unknown>(url, { targetUserId })
      .pipe(map(res => this.unwrap(res) as ConversationDto));
  }

  /** GET /channels/{channelId}/conversation → ConversationDto */
  getChannelConversation(channelId: number): Observable<ConversationDto> {
    const url = getApiUrl(`/channels/${channelId}/conversation`);
    console.log('[ChatAPI] GET channel conversation:', url);
    return this.http
      .get<unknown>(url)
      .pipe(map(res => this.unwrap(res) as ConversationDto));
  }

  /** GET /teams/{teamId}/conversation → ConversationDto */
  getTeamConversation(teamId: number): Observable<ConversationDto> {
    const url = getApiUrl(`/teams/${teamId}/conversation`);
    console.log('[ChatAPI] GET team conversation:', url);
    return this.http
      .get<unknown>(url)
      .pipe(map(res => this.unwrap(res) as ConversationDto));
  }

  /** GET /conversations/my → ConversationSummary[] */
  getMyConversations(): Observable<ConversationSummary[]> {
    const url = getApiUrl('/conversations/my');
    console.log('[ChatAPI] GET my conversations:', url);
    return this.http
      .get<unknown>(url)
      .pipe(map(res => this.extractList<ConversationSummary>(res)));
  }

  // ── Response helpers ────────────────────────────────────────────────────────

  private unwrap(res: unknown): unknown {
    if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) {
      return (res as Record<string, unknown>)['data'];
    }
    return res;
  }

  private extractMessages(res: unknown): MessageDto[] {
    return this.extractList<MessageDto>(res);
  }

  private extractList<T>(res: unknown): T[] {
    const data = this.unwrap(res);
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object') {
      const content = (data as Record<string, unknown>)['content'];
      if (Array.isArray(content)) return content as T[];
    }
    return [];
  }
}
