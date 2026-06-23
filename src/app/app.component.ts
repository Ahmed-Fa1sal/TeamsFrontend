import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { trigger, transition, query, style, animate } from '@angular/animations';
import { Subject, filter, takeUntil } from 'rxjs';

import { ScrollbarComponent } from './shared/components/scrollbar/scrollbar.component';
import { LoadingComponent } from './shared/components/loading/loading.component';
import { AuthService } from '@features/auth/services/auth.service';
import { MediaServiceService } from '@app/services/media-service.service';
import { NotificationService } from '@features/notifications/notification.service';
import { REDUCED_MOTION } from '@core/animations/page-animations';

const routeAnimationTrigger = trigger('routeAnimation', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(16px)' }),
      animate('350ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
    ], { optional: true })
  ])
]);

@Component({
  selector: 'app-root',
  standalone: true,
  animations: [routeAnimationTrigger],
  imports: [
    RouterOutlet,
    ScrollbarComponent,
    MatSnackBarModule,
    LoadingComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly mediaService = inject(MediaServiceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  title = 'Teams App';

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.mediaService.registerUser(currentUser.id);
    }

    // Single source of truth for startPolling — guarded by pollingActive inside the service.
    // Checking on every NavigationEnd handles both:
    //   a) Users with an existing session (already authenticated when the app loads)
    //   b) Users who complete the login flow (first NavigationEnd after token is stored)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      filter(() => this.authService.isAuthenticated()),
      takeUntil(this.destroy$)
    ).subscribe(() => this.notificationService.startPolling());

    // Also try immediately in case this is a hard-refresh with a live session
    if (this.authService.isAuthenticated()) {
      this.notificationService.startPolling();
    }

    this.mediaService.incomingCall.pipe(takeUntil(this.destroy$)).subscribe(({ callerId }) => {
      const message = `Incoming call from user #${callerId}`;
      const snackRef = this.snackBar.open(message, 'Open', { duration: 10_000 });

      snackRef.onAction().pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.router.navigate(['/videocall']);
      });

      if (!this.router.url.startsWith('/videocall')) {
        this.router.navigate(['/videocall']);
      }
    });

    this.mediaService.incomingChannelCall.pipe(takeUntil(this.destroy$)).subscribe(({ callerId, channelId }) => {
      const message = `Channel meeting started by user #${callerId}`;
      const snackRef = this.snackBar.open(message, 'Join', { duration: 10_000 });

      snackRef.onAction().pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.router.navigate(['/videocall'], { queryParams: { channelId } });
      });

      if (!this.router.url.startsWith('/videocall')) {
        this.router.navigate(['/videocall'], { queryParams: { channelId } });
      }
    });

    this.mediaService.missedCall.pipe(takeUntil(this.destroy$)).subscribe(({ callerId }) => {
      const message = `Missed call from user #${callerId}`;
      const snackRef = this.snackBar.open(message, 'View', { duration: 10_000 });

      snackRef.onAction().pipe(takeUntil(this.destroy$)).subscribe(() => {
        if (!this.router.url.startsWith('/home')) {
          this.router.navigate(['/home']);
        }
      });
    });

    this.notificationService.newNotifications$.pipe(takeUntil(this.destroy$)).subscribe((notifications) => {
      if (!notifications.length) return;
      const first = notifications[0];
      const label = notifications.length === 1
        ? first.title || first.message || 'New notification'
        : `${notifications.length} new notifications`;
      const snackRef = this.snackBar.open(label, 'View', { duration: 10_000 });

      snackRef.onAction().pipe(takeUntil(this.destroy$)).subscribe(() => {
        if (!this.router.url.startsWith('/home')) {
          this.router.navigate(['/home']);
        }
      });
    });
  }

  getRouteState(outlet: RouterOutlet): string {
    // Constant state under reduced-motion → no state change → no transition runs
    if (REDUCED_MOTION) return 'static';
    return outlet?.activatedRouteData?.['animation'] ?? 'default';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
