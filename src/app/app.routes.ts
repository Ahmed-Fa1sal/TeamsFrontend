/**
 * Application Routes
 * Defines all routing configuration for the application
 */

import { Routes } from '@angular/router';
import { authGuardFn } from '@core/guards/auth.guard';

export const APP_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('@features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('@features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'home',
    loadComponent: () =>
      import('@features/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuardFn]
  },
  {
    path: 'organizations',
    loadComponent: () =>
      import('@features/organizations/pages/organization-list/organization-list.component')
        .then(m => m.OrganizationListComponent),
    canActivate: [authGuardFn]
  },
  {
    path: 'organizations/:id',
    loadComponent: () =>
      import('@features/organizations/pages/organization-detail/organization-detail.component')
        .then(m => m.OrganizationDetailComponent),
    canActivate: [authGuardFn]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
