import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@features/auth/services/auth.service';
import { PermissionService } from '@core/services/permission.service';

/**
 * Route guard: allows access only to SYSTEM_ADMIN users.
 * Unauthenticated → /login; authenticated non-admin → /home.
 *
 * Usage: canActivate: [systemAdminGuard]
 */
export const systemAdminGuard: CanActivateFn = (_route, state) => {
  const auth        = inject(AuthService);
  const permissions = inject(PermissionService);
  const router      = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  return permissions.isSystemAdmin()
    ? true
    : router.createUrlTree(['/home']);
};
