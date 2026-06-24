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
    data: { animation: 'Login' }
  },
  {
    path: 'register',
    loadComponent: () =>
      import('@features/auth/register/register.component').then(m => m.RegisterComponent),
    data: { animation: 'Register' }
  },
  {
    path: 'home',
    loadComponent: () =>
      import('@features/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuardFn],
    data: { animation: 'Home' }
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('@features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuardFn],
    data: { animation: 'Dashboard' }
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('@features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuardFn],
    data: { animation: 'Profile' }
  },
  {
    path: 'teams/new',
    loadComponent: () =>
      import('@features/teams/pages/create-team/create-team.component').then(m => m.CreateTeamComponent),
    canActivate: [authGuardFn],
    data: { animation: 'CreateTeam' }
  },
  {
    path: 'teams/:id',
    loadComponent: () =>
      import('@features/teams/pages/team-detail/team-detail.component').then(m => m.TeamDetailComponent),
    canActivate: [authGuardFn],
    data: { animation: 'TeamDetail' }
  },
  {
    path: 'chats',
    loadComponent: () =>
      import('@features/chats/chats-page.component').then(m => m.ChatsPageComponent),
    canActivate: [authGuardFn],
    data: { animation: 'Chats' }
  },
  // ── Chat routes (all served by ChatPageComponent) ───────────────────────────
  {
    path: 'chat/conversations/:conversationId',
    loadComponent: () =>
      import('./features/chat/chat-page.component').then(m => m.ChatPageComponent),
    canActivate: [authGuardFn],
    data: { animation: 'Chat' }
  },
  {
    path: 'chat/direct/:userId',
    loadComponent: () =>
      import('./features/chat/chat-page.component').then(m => m.ChatPageComponent),
    canActivate: [authGuardFn],
    data: { animation: 'Chat' }
  },
  {
    path: 'chat/team/:teamId',
    loadComponent: () =>
      import('./features/chat/chat-page.component').then(m => m.ChatPageComponent),
    canActivate: [authGuardFn],
    data: { animation: 'Chat' }
  },
  {
    path: 'chat/channel/:channelId',
    loadComponent: () =>
      import('./features/chat/chat-page.component').then(m => m.ChatPageComponent),
    canActivate: [authGuardFn],
    data: { animation: 'Chat' }
  },
  // ── Channel detail ───────────────────────────────────────────────────────────
  {
    path: 'teams/:teamId/channels/:channelId',
    loadComponent: () =>
      import('@features/channels/channel-detail/channel-detail.component').then(m => m.ChannelDetailComponent),
    canActivate: [authGuardFn],
    data: { animation: 'ChannelDetail' }
  },
  {
    path: 'videocall',
    loadComponent: () =>
      import('@app/videocall/videocall.component').then(m => m.VideocallComponent),
    canActivate: [authGuardFn],
    data: { animation: 'Videocall' }
  },
  {
    path: 'organizations',
    loadComponent: () =>
      import('@features/organizations/pages/organization-list/organization-list.component')
        .then(m => m.OrganizationListComponent),
    canActivate: [systemAdminGuard],
    data: { animation: 'Organizations' }
  },
  {
    path: 'organizations/:id',
    loadComponent: () =>
      import('@features/organizations/pages/organization-detail/organization-detail.component')
        .then(m => m.OrganizationDetailComponent),
    canActivate: [orgAccessGuard],
    data: { animation: 'OrgDetail' }
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

export { systemAdminGuard };
