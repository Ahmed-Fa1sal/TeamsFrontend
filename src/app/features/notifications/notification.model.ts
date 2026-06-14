export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  teamId?: string;
  channelId?: string;
  messageId?: string;
  callId?: string;
  actorId?: string;
}

export interface NotificationPage {
  content: Notification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface UnreadCountResponse {
  count: number;
}
