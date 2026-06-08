import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { SystemRole } from '@core/auth/roles';
import { PermissionService } from '@core/services/permission.service';

/**
 * Renders its host only when the current user holds at least one of
 * the specified system-level roles.
 *
 * @example
 *   <div *hasSystemRole="'SYSTEM_ADMIN'">Admin-only</div>
 *   <div *hasSystemRole="['SYSTEM_ADMIN']">Same</div>
 */
@Directive({ selector: '[hasSystemRole]', standalone: true })
export class HasSystemRoleDirective implements OnInit {
  @Input('hasSystemRole') role: SystemRole | SystemRole[] = [];

  private readonly tpl  = inject(TemplateRef<unknown>);
  private readonly vc   = inject(ViewContainerRef);
  private readonly perm = inject(PermissionService);

  ngOnInit(): void {
    const roles = Array.isArray(this.role) ? this.role : [this.role];
    const show  = !roles.length || roles.some(r => this.perm.hasSystemRole(r));
    show ? this.vc.createEmbeddedView(this.tpl) : this.vc.clear();
  }
}
