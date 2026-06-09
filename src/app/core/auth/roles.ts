/** System-level role stored in AuthResponse.user.roles */
export enum SystemRole {
  SYSTEM_ADMIN = 'ROLE_SYSTEM_ADMIN'
}

/** Organization membership role from OrganizationMemberResponse.role */
export enum OrganizationRole {
  ORG_ADMIN  = 'ORG_ADMIN',
  TEAM_ADMIN = 'TEAM_ADMIN',
  MEMBER     = 'MEMBER'
}

/** Team membership role from TeamMemberDto.role.
 *  Also used for Channel permissions — channels inherit from their parent team. */
export enum TeamRole {
  OWNER  = 'OWNER',
  ADMIN  = 'ADMIN',
  MEMBER = 'MEMBER'
}
