import { Routes } from '@angular/router';
import { authGuardFn } from '@core/guards/auth.guard';

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
    path: '**',
    redirectTo: 'login',
  },
];
