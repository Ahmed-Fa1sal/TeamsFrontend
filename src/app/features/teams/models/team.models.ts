// ── Generic backend envelope ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
  path?: string;
  error?: Record<string, unknown>;
}

// ── Spring Page wrapper ───────────────────────────────────────────────────────

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// ── Domain types ──────────────────────────────────────────────────────────────

export type TeamMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface TeamUser {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
}

export interface TeamMember {
  id: number;
  user: TeamUser;
  role: TeamMemberRole;
  joinedAt?: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  owner?: TeamUser;
  isPublic: boolean;
  archived: boolean;
  members?: TeamUser[];
  teamMembers?: TeamMember[];
  memberCount?: number;
  channelCount?: number;
  conversationId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChannelMember {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
}

export interface Channel {
  /** Primary key — Spring Boot usually serialises this as "id". */
  id?: number;
  /** Some backends return "channelId" instead of "id". */
  channelId?: number;
  name: string;
  description?: string;
  isPublic: boolean;
  teamId?: number;
  teamName?: string;
  memberCount?: number;
  members?: ChannelMember[];
  /** Flat form: conversationId is returned at the top level. */
  conversationId?: number;
  /** Nested form: conversation object returned with its own id. */
  conversation?: { id: number };
}

// ── Request bodies ────────────────────────────────────────────────────────────

export interface CreateTeamRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  isPublic?: boolean;
  organization_id: number; // backend expects this exact key
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
  isPublic?: boolean;
  archived?: boolean;
}

export interface CreateChannelRequest {
  teamId: number;
  name: string;
  description?: string;
  isPublic: boolean;
}

// ── Query / pagination params ─────────────────────────────────────────────────

export interface TeamQueryParams {
  page?: number;
  size?: number;
  sort?: string;
}
