import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from '@features/auth/services/auth.service';
import { SystemRole, OrganizationRole, TeamRole } from '@core/auth/roles';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authService = inject(AuthService);

  // ── Context signals — set by pages when they load membership data ────────────

  private readonly _orgRole  = signal<OrganizationRole | null>(null);
  private readonly _teamRole = signal<TeamRole | null>(null);

  /** Read-only view of the current organization context role. */
  readonly orgRole  = this._orgRole.asReadonly();
  /** Read-only view of the current team context role. */
  readonly teamRole = this._teamRole.asReadonly();

  setOrgContext(role: OrganizationRole | null): void {
    console.log('[PermissionService] setOrgContext →', role);
    this._orgRole.set(role);
  }
  setTeamContext(role: TeamRole | null): void {
    console.log('[PermissionService] setTeamContext →', role);
    this._teamRole.set(role);
  }
  clearOrgContext(): void  { this._orgRole.set(null); }
  clearTeamContext(): void { this._teamRole.set(null); }

  // ── Computed permission signals (reactive) ────────────────────────────────

  readonly isSystemAdmin$ = computed(() => this.isSystemAdmin());
  readonly canManageOrganization$ = computed(() => this.canManageOrganization());
  readonly canManageTeam$ = computed(() => this.canManageTeam());
  readonly canManageChannel$ = computed(() => this.canManageChannel());

  // ── System role helpers ────────────────────────────────────────────────────

  hasSystemRole(role: SystemRole): boolean {
    const user = this.authService.getCurrentUser();
    const has  = user?.roles?.includes(role) ?? false;
    console.log('[PermissionService] hasSystemRole', role, '→', has, '| user roles:', user?.roles);
    return has;
  }

  isSystemAdmin(): boolean {
    return this.hasSystemRole(SystemRole.SYSTEM_ADMIN);
  }

  // ── Organization role helpers ──────────────────────────────────────────────

  hasOrganizationRole(role: OrganizationRole | OrganizationRole[]): boolean {
    const current = this._orgRole();
    if (!current) {
      console.log('[PermissionService] hasOrganizationRole', role, '→ false (no org context set)');
      return false;
    }
    const has = Array.isArray(role) ? role.includes(current) : current === role;
    console.log('[PermissionService] hasOrganizationRole', role, '→', has, '| orgRole:', current);
    return has;
  }

  canManageOrganization(): boolean {
    const result = this.isSystemAdmin() || this._orgRole() === OrganizationRole.ORG_ADMIN;
    console.log('[PermissionService] canManageOrganization →', result, '| orgRole:', this._orgRole());
    return result;
  }

  // ── Team role helpers ──────────────────────────────────────────────────────

  hasTeamRole(role: TeamRole | TeamRole[]): boolean {
    const current = this._teamRole();
    if (!current) {
      console.log('[PermissionService] hasTeamRole', role, '→ false (no team context set)');
      return false;
    }
    const has = Array.isArray(role) ? role.includes(current) : current === role;
    console.log('[PermissionService] hasTeamRole', role, '→', has, '| teamRole:', current);
    return has;
  }

  canManageTeam(): boolean {
    return (
      this.isSystemAdmin() ||
      this.canManageOrganization() ||
      this.hasTeamRole([TeamRole.OWNER, TeamRole.ADMIN])
    );
  }

  /**
   * Channels have no separate roles — they inherit from the parent team.
   * OWNER/ADMIN → full channel management; MEMBER → view and participate.
   */
  canManageChannel(): boolean {
    return (
      this.isSystemAdmin() ||
      this.canManageOrganization() ||
      this.hasTeamRole([TeamRole.OWNER, TeamRole.ADMIN])
    );
  }

  /** Dump the full permission state to the console — useful when debugging. */
  logState(): void {
    const user = this.authService.getCurrentUser();
    console.group('[PermissionService] state snapshot');
    console.log('user:', user?.email, '| id:', user?.id);
    console.log('system roles:', user?.roles);
    console.log('orgRole:', this._orgRole());
    console.log('teamRole:', this._teamRole());
    console.log('isSystemAdmin:', this.isSystemAdmin());
    console.log('canManageOrganization:', this.canManageOrganization());
    console.log('canManageTeam:', this.canManageTeam());
    console.groupEnd();
  }
}
