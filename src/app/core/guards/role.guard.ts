import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@features/auth/services/auth.service';
import { SystemRole } from '@core/auth/roles';

/**
 * Factory that returns a CanActivateFn restricted to the given system roles.
 *
 * @example
 *   canActivate: [roleGuard([SystemRole.SYSTEM_ADMIN])]
 */
export const roleGuard = (requiredRoles: SystemRole[]): CanActivateFn =>
  (_route, state) => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    const userRoles = auth.getCurrentUser()?.roles ?? [];
    return requiredRoles.some(r => userRoles.includes(r))
      ? true
      : router.createUrlTree(['/home']);
  };
