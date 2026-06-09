import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '@features/auth/services/auth.service';
import { PermissionService } from '@core/services/permission.service';
import { OrganizationService } from '@features/organizations/services/organization.service';
import { OrganizationRole } from '@core/auth/roles';

/**
 * Guards `/organizations/:id`.
 *
 * Access rules:
 *  - SYSTEM_ADMIN → always allowed (any org)
 *  - Any authenticated user who is a member of the specific org → allowed
 *  - Everyone else → redirect to /home
 *
 * Fast path: if PermissionService already has org context loaded (e.g. from
 * the home page), no extra API call is made.
 *
 * Slow path (cold navigation): calls GET /organizations/:id/members/:userId
 * to verify membership and, on success, pre-populates org context.
 */
export const orgAccessGuard: CanActivateFn = (route, state) => {
  const auth        = inject(AuthService);
  const permissions = inject(PermissionService);
  const orgService  = inject(OrganizationService);
  const router      = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (permissions.isSystemAdmin()) return true;

  const orgId = Number(route.paramMap.get('id'));
  if (!orgId) return router.createUrlTree(['/home']);

  // Fast path: context already loaded for this org
  if (permissions.canAccessOrg(orgId)) {
    console.log('[orgAccessGuard] fast-path allowed | orgId:', orgId);
    return true;
  }

  // Slow path: verify via API
  const userId = Number(auth.getCurrentUser()?.id);
  console.log('[orgAccessGuard] slow-path: checking membership | orgId:', orgId, '| userId:', userId);

  return orgService.getMember(orgId, userId).pipe(
    map(membership => {
      console.log('[orgAccessGuard] membership found → role:', membership.role, '| allowing');
      permissions.setOrgContext(membership.role as unknown as OrganizationRole, orgId);
      return true;
    }),
    catchError(err => {
      console.warn('[orgAccessGuard] membership check failed → denied | orgId:', orgId, err);
      return of(router.createUrlTree(['/home']));
    })
  );
};
