export type ConversationType = 'DIRECT' | 'TEAM' | 'CHANNEL';

export interface MessageSender {
  id: number;
  username: string;
  fullName: string;
  profileImageUrl: string | null;
}

export interface MessageDto {
  id: number;
  content: string;
  sender: MessageSender;
  conversationId: number;
  replyTo: MessageDto | null;
  edited: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface ConversationDto {
  id: number;
  name: string;
  imageUrl: string | null;
  type: ConversationType;
  teamId: number | null;
  channelId: number | null;
  isGroup: boolean;
  members: MessageSender[];
  createdAt: string;
  updatedAt: string | null;
}

export interface SendMessageRequest {
  content: string;
  replyToId?: number | null;
}

/** View-model mapped from MessageDto for rendering. */
export interface ChatMessage {
  id: string | number;
  authorId: string | number;
  authorName: string;
  authorInitials: string;
  isOwn: boolean;
  text: string;
  sentAt: string;
  replyTo?: { senderName: string; text: string };
}

export interface ChatMessageGroup {
  dateLabel: string;
  messages: ChatMessage[];
}
