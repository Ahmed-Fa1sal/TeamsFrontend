import {
  Directive,
  Input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
  inject
} from '@angular/core';
import { AuthService } from '@features/auth/services/auth.service';

@Directive({ selector: '[hasRole]', standalone: true })
export class HasRoleDirective implements OnInit {
  @Input('hasRole') role: string | string[] = [];

  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vc = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    const userRoles: string[] = this.auth.getCurrentUser()?.roles ?? [];
    const required = Array.isArray(this.role) ? this.role : [this.role];

    if (!required.length || required.some(r => userRoles.includes(r))) {
      this.vc.createEmbeddedView(this.tpl);
    }
  }
}
