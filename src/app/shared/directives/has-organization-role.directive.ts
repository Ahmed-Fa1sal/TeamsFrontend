import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect, signal } from '@angular/core';
import { OrganizationRole } from '@core/auth/roles';
import { PermissionService } from '@core/services/permission.service';

/**
 * Renders its host only when the current organization context role
 * matches at least one of the specified roles.
 *
 * The consuming page must call PermissionService.setOrgContext() after
 * loading the user's organization membership.
 *
 * Reactive: re-evaluates whenever the orgRole signal in PermissionService changes.
 *
 * @example
 *   <div *hasOrganizationRole="'ORG_ADMIN'">Org admin only</div>
 */
@Directive({ selector: '[hasOrganizationRole]', standalone: true })
export class HasOrganizationRoleDirective {
  private readonly _roles = signal<OrganizationRole[]>([]);

  @Input('hasOrganizationRole') set role(val: OrganizationRole | OrganizationRole[]) {
    this._roles.set(val ? (Array.isArray(val) ? val : [val]) : []);
  }

  private readonly tpl  = inject(TemplateRef<unknown>);
  private readonly vc   = inject(ViewContainerRef);
  private readonly perm = inject(PermissionService);

  constructor() {
    effect(() => {
      const roles = this._roles();
      const show  = !roles.length || this.perm.hasOrganizationRole(roles);
      if (show) {
        if (!this.vc.length) this.vc.createEmbeddedView(this.tpl);
      } else {
        this.vc.clear();
      }
    });
  }
}
