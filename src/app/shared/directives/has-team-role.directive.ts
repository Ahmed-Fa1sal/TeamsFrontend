import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect, signal } from '@angular/core';
import { TeamRole } from '@core/auth/roles';
import { PermissionService } from '@core/services/permission.service';

/**
 * Renders its host only when the current team context role matches at
 * least one of the specified roles.  Also covers channel permissions
 * because channels inherit from their parent team.
 *
 * The consuming page must call PermissionService.setTeamContext() after
 * loading the user's team membership.
 *
 * Reactive: re-evaluates whenever the teamRole signal in PermissionService changes.
 *
 * @example
 *   <div *hasTeamRole="'OWNER'">Owner only</div>
 *   <div *hasTeamRole="['OWNER', 'ADMIN']">Owner or Admin</div>
 */
@Directive({ selector: '[hasTeamRole]', standalone: true })
export class HasTeamRoleDirective {
  private readonly _roles = signal<TeamRole[]>([]);

  @Input('hasTeamRole') set role(val: TeamRole | TeamRole[]) {
    this._roles.set(val ? (Array.isArray(val) ? val : [val]) : []);
  }

  private readonly tpl  = inject(TemplateRef<unknown>);
  private readonly vc   = inject(ViewContainerRef);
  private readonly perm = inject(PermissionService);

  constructor() {
    effect(() => {
      const roles = this._roles();
      const show  = !roles.length || this.perm.hasTeamRole(roles);
      if (show) {
        if (!this.vc.length) this.vc.createEmbeddedView(this.tpl);
      } else {
        this.vc.clear();
      }
    });
  }
}
