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
export const authGuardFn: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    console.log('Is authenticated:', authService.isAuthenticated());

    if (authService.isAuthenticated()) {
        return true;
    }

    return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
    });
};

