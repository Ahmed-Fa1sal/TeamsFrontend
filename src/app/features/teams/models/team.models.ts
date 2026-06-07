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
  createdAt?: string;
  updatedAt?: string;
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

// ── Query / pagination params ─────────────────────────────────────────────────

export interface TeamQueryParams {
  page?: number;
  size?: number;
  sort?: string;
}
