/**
 * Application Root Component
 * Main component that bootstraps the entire application
 */

import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ScrollbarComponent } from './shared/components/scrollbar/scrollbar.component';
import { LoadingService } from '@core/services/loading.service';
import { AuthService } from '@features/auth/services/auth.service';
import { MediaServiceService } from '@app/services/media-service.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ScrollbarComponent, NgIf, AsyncPipe, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  readonly isLoading$ = inject(LoadingService).isLoading$;
  private readonly authService = inject(AuthService);
  private readonly mediaService = inject(MediaServiceService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  title = 'Teams Frontend';

  ngOnInit(): void {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (currentUserId) {
      this.mediaService.registerUser(currentUserId);
    }

    this.mediaService.incomingCall.subscribe(({ callerId }) => {
      const message = `Incoming call from user #${callerId}`;
      const snackRef = this.snackBar.open(message, 'Open', { duration: 10000 });

      snackRef.onAction().subscribe(() => {
        this.router.navigate(['/videocall']);
      });

      if (!this.router.url.startsWith('/videocall')) {
        this.router.navigate(['/videocall']);
      }
    });
  }
}
