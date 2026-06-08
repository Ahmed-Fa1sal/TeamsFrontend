import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '@features/auth/services/auth.service';
import { SystemRole } from '@core/auth/roles';

/**
 * Structural directive: renders its host only when the current user
 * holds at least one of the specified system-level roles.
 *
 * Prefer the more specific *hasSystemRole directive for new code.
 *
 * @example
 *   <div *appHasRole="'SYSTEM_ADMIN'">Admin only</div>
 */
@Directive({ selector: '[appHasRole]', standalone: true })
export class HasRoleDirective implements OnInit {
  @Input('appHasRole') requiredRoles: SystemRole | SystemRole[] = [];

  private readonly tpl  = inject(TemplateRef<Record<string, unknown>>);
  private readonly vc   = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    const roles     = Array.isArray(this.requiredRoles) ? this.requiredRoles : [this.requiredRoles];
    const userRoles = this.auth.getCurrentUser()?.roles ?? [];
    const show      = !roles.length || roles.some(r => userRoles.includes(r));
    show ? this.vc.createEmbeddedView(this.tpl) : this.vc.clear();
  }
}
