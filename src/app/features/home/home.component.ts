/**
 * Home Component
 * Standalone component for home page after successful login
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessagesModule } from 'primeng/messages';

import { AuthService } from '../auth/services/auth.service';
import { User } from '../auth/models/auth.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, MessagesModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  user: User | null = null;
  messages: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = this.authService.getCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle logout
   */
  onLogout(): void {
    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messages = [
            {
              severity: 'success',
              summary: 'Logged Out',
              detail: 'You have been successfully logged out'
            }
          ];
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        },
        error: () => {
          // Even if logout API fails, redirect to login
          this.router.navigate(['/login']);
        }
      });
  }
}
