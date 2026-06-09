import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from '@features/auth/services/auth.service';
import { SystemRole, OrganizationRole, TeamRole } from '@core/auth/roles';

interface OrgContext {
  role: OrganizationRole;
  orgId: number;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authService = inject(AuthService);

  // ── Context signals — set by pages when they load membership data ────────────

  private readonly _orgContext = signal<OrgContext | null>(null);
  private readonly _teamRole   = signal<TeamRole | null>(null);

  /** Read-only role within the currently active organization context. */
  readonly orgRole  = computed(() => this._orgContext()?.role ?? null);
  /** Read-only role within the currently active team context. */
  readonly teamRole = this._teamRole.asReadonly();

  setOrgContext(role: OrganizationRole, orgId: number): void {
    console.log('[Permission] setOrgContext → role:', role, '| orgId:', orgId);
    this._orgContext.set({ role, orgId });
  }
  setTeamContext(role: TeamRole | null): void {
    console.log('[Permission] setTeamContext →', role);
    this._teamRole.set(role);
  }
  clearOrgContext(): void  { this._orgContext.set(null); }
  clearTeamContext(): void { this._teamRole.set(null); }

  // ── Computed permission signals (reactive) ────────────────────────────────

  readonly isSystemAdmin$         = computed(() => this.isSystemAdmin());
  readonly canManageOrganization$ = computed(() => this.canManageOrganization());
  readonly canManageTeam$         = computed(() => this.canManageTeam());
  readonly canManageChannel$      = computed(() => this.canManageChannel());

  // ── System role helpers ────────────────────────────────────────────────────

  hasSystemRole(role: SystemRole): boolean {
    return this.authService.getCurrentUser()?.roles?.includes(role) ?? false;
  }

  isSystemAdmin(): boolean {
    return this.hasSystemRole(SystemRole.SYSTEM_ADMIN);
  }

  // ── Organization role helpers ──────────────────────────────────────────────

  hasOrganizationRole(role: OrganizationRole | OrganizationRole[]): boolean {
    const current = this._orgContext()?.role ?? null;
    if (!current) return false;
    return Array.isArray(role) ? role.includes(current) : current === role;
  }

  /**
   * True when the current user can perform admin-level operations on their
   * scoped organization (e.g. add/remove members, edit org details).
   * SYSTEM_ADMIN can manage any org; ORG_ADMIN can only manage their own.
   */
  canManageOrganization(): boolean {
    return (
      this.isSystemAdmin() ||
      this._orgContext()?.role === OrganizationRole.ORG_ADMIN
    );
  }

  /**
   * The numeric ID of the organization this user is ORG_ADMIN of.
   * Null when not set or when the user's role is not ORG_ADMIN.
   */
  get managedOrgId(): number | null {
    const ctx = this._orgContext();
    return ctx?.role === OrganizationRole.ORG_ADMIN ? ctx.orgId : null;
  }

  /**
   * True when the current user is ORG_ADMIN of the given specific org ID.
   */
  isAdminOfOrg(orgId: number): boolean {
    const ctx = this._orgContext();
    return ctx?.role === OrganizationRole.ORG_ADMIN && ctx.orgId === orgId;
  }

  /**
   * True when the current user may navigate to `/organizations/:id`.
   * SYSTEM_ADMIN → any org. Others → only the org they belong to.
   */
  canAccessOrg(orgId: number): boolean {
    if (this.isSystemAdmin()) return true;
    return this._orgContext()?.orgId === orgId;
  }

  // ── Team role helpers ──────────────────────────────────────────────────────

  hasTeamRole(role: TeamRole | TeamRole[]): boolean {
    const current = this._teamRole();
    if (!current) return false;
    return Array.isArray(role) ? role.includes(current) : current === role;
  }

  canManageTeam(): boolean {
    return (
      this.isSystemAdmin() ||
      this.canManageOrganization() ||
      this.hasTeamRole([TeamRole.OWNER, TeamRole.ADMIN])
    );
  }

  canManageChannel(): boolean {
    return (
      this.isSystemAdmin() ||
      this.canManageOrganization() ||
      this.hasTeamRole([TeamRole.OWNER, TeamRole.ADMIN])
    );
  }

  /** Dump the full permission state to the console (call explicitly for debugging). */
  logState(): void {
    const user = this.authService.getCurrentUser();
    console.group('[Permission] state snapshot');
    console.log('user:', user?.email, '| id:', user?.id, '| system roles:', user?.roles);
    console.log('orgContext:', this._orgContext());
    console.log('teamRole:', this._teamRole());
    console.log('isSystemAdmin:', this.isSystemAdmin());
    console.log('canManageOrganization:', this.canManageOrganization());
    console.log('managedOrgId:', this.managedOrgId);
    console.groupEnd();
  }
}
