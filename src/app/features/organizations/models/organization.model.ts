// features/organizations/models/organization.model.ts

export enum OrganizationMemberRole {
    ORG_ADMIN = 'ORG_ADMIN',
    TEAM_ADMIN = 'TEAM_ADMIN',
    MEMBER = 'MEMBER'
}

export const OrganizationMemberRoleLabels: Record<OrganizationMemberRole, string> = {
    [OrganizationMemberRole.ORG_ADMIN]: 'Organization Admin',
    [OrganizationMemberRole.TEAM_ADMIN]: 'Team Admin',
    [OrganizationMemberRole.MEMBER]: 'Member'
};

export type OrganizationTier = 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface OrganizationResponse {
    id: number;
    name: string;
    description?: string;
    logoUrl?: string;
    active: boolean;
    tier?: OrganizationTier;
    memberCount: number;
    teamCount: number;
    createdBy?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateOrganizationRequest {
    name: string;
    description?: string;
    logoUrl?: string;
    tier?: OrganizationTier;
}

export interface UpdateOrganizationRequest {
    name?: string;
    description?: string;
    logoUrl?: string;
    tier?: OrganizationTier;
}

export interface OrganizationMemberResponse {
    id: number;
    organizationId: number;
    organizationName: string;
    userId: number;
    username: string;
    fullName: string;
    email: string;
    profileImageUrl?: string;
    role: OrganizationMemberRole;
    joinedAt: string;
    createdBy?: number;
    createdAt: string;
    updatedAt: string;
}

export interface AddOrganizationMemberRequest {
    userId: number;
    role: OrganizationMemberRole;
}

export interface UpdateMemberRoleRequest {
    role: OrganizationMemberRole;
}

export interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

export interface Pageable {
    page?: number;
    size?: number;
    sort?: string;
}