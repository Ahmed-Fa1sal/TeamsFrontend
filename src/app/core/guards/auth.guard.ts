/**
 * Authentication Guard
 * Protects routes that require authentication
 */

import { inject } from '@angular/core';
import {
  Router,
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Functional auth guard using canActivate
 * Protects routes from unauthorized access
 */
export const authGuardFn: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login if not authenticated
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
