import {
  Directive,
  Input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
  inject
} from '@angular/core';
import { AuthService } from '@features/auth/services/auth.service';
import { UserRole } from '@features/auth/models/auth.models';

/**
 * Structural directive that renders its host only when the current user
 * has at least one of the specified roles.
 *
 * Usage:
 *   <div *appHasRole="'admin'">Admin only</div>
 *   <div *appHasRole="['admin', 'owner']">Admin or Owner</div>
 */
@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective implements OnInit {
  @Input('appHasRole') requiredRoles: UserRole | UserRole[] = [];

  private readonly templateRef = inject(TemplateRef<Record<string, unknown>>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    const roles = Array.isArray(this.requiredRoles)
      ? this.requiredRoles
      : [this.requiredRoles];

    const user = this.authService.getCurrentUser();
    const userRoles: UserRole[] = user?.roles?.length ? user.roles : ['member'];
    const show = roles.length === 0 || roles.some(r => userRoles.includes(r));

    if (show) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
