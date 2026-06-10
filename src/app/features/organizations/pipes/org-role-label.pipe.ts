import { Pipe, PipeTransform } from '@angular/core';
import { OrganizationMemberRole } from '../models/organization.model';

export const ROLE_LABELS: Record<OrganizationMemberRole, string> = {
  [OrganizationMemberRole.ORG_ADMIN]: 'Organization Admin',
  [OrganizationMemberRole.TEAM_ADMIN]: 'Team Admin',
  [OrganizationMemberRole.MEMBER]: 'Member'
};

@Pipe({ name: 'orgRoleLabel', standalone: true, pure: true })
export class OrgRoleLabelPipe implements PipeTransform {
  transform(role: OrganizationMemberRole): string {
    return ROLE_LABELS[role] ?? role;
  }
}
