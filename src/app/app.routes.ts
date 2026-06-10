import { Routes } from '@angular/router';
import { authGuardFn } from '@core/guards/auth.guard';
import { systemAdminGuard } from '@core/guards/system-admin.guard';
import { orgAccessGuard } from '@core/guards/org-access.guard';

export const APP_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('@features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('@features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('@features/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuardFn],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('@features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuardFn],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('@features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuardFn],
  },
  {
    path: 'teams/new',
    loadComponent: () =>
      import('@features/teams/pages/create-team/create-team.component').then(m => m.CreateTeamComponent),
    canActivate: [authGuardFn],
  },
  {
    path: 'teams/:id',
    loadComponent: () =>
      import('@features/teams/pages/team-detail/team-detail.component').then(m => m.TeamDetailComponent),
    canActivate: [authGuardFn],
  },
  {
    path: 'channels/:id',
    loadComponent: () =>
      import('@features/channels/channel-chat/channel-chat.component').then(m => m.ChannelChatComponent),
    canActivate: [authGuardFn],
  },
  {
    path: 'videocall',
    loadComponent: () =>
      import('@app/videocall/videocall.component').then(m => m.VideocallComponent),
    canActivate: [authGuardFn],
  },
  {
    // Only SYSTEM_ADMIN may see the full list of all organizations
    path: 'organizations',
    loadComponent: () =>
      import('@features/organizations/pages/organization-list/organization-list.component')
        .then(m => m.OrganizationListComponent),
    canActivate: [systemAdminGuard],
  },
  {
    // SYSTEM_ADMIN → any org; authenticated member → only their own org
    path: 'organizations/:id',
    loadComponent: () =>
      import('@features/organizations/pages/organization-detail/organization-detail.component')
        .then(m => m.OrganizationDetailComponent),
    canActivate: [orgAccessGuard],
  },
  // Example: future admin-only pages use systemAdminGuard
  // { path: 'admin', ..., canActivate: [systemAdminGuard] },
  {
    path: '**',
    redirectTo: 'login',
  },
];

// Re-export for use in other guards/tests
export { systemAdminGuard };
