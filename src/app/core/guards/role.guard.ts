import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@features/auth/services/auth.service';
import { UserRole } from '@features/auth/models/auth.models';

/**
 * Factory that returns a CanActivateFn restricted to the given roles.
 * Usage: canActivate: [roleGuard(['admin', 'owner'])]
 */
export const roleGuard = (requiredRoles: UserRole[]): CanActivateFn =>
  (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    const user = authService.getCurrentUser();
    // Default to 'member' so users without explicit roles aren't blocked
    const userRoles: UserRole[] = user?.roles?.length ? user.roles : ['member'];
    const hasRole = requiredRoles.some(r => userRoles.includes(r));

    return hasRole ? true : router.createUrlTree(['/home']);
  };
