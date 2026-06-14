import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import gsap from 'gsap';

import { AuthService } from '../services/auth.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';
import { REDUCED_MOTION } from '@core/animations/page-animations';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    LogoComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage: string | null = null;
  private returnUrl = '/home';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  ngAfterViewInit(): void {
    if (REDUCED_MOTION) return;
    gsap.from('.auth-panel', { y: 32, opacity: 0, duration: 0.45, ease: 'power2.out' });
    gsap.from('.form-logo', { y: -16, opacity: 0, duration: 0.6, ease: 'power2.out', delay: 0.15 });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onLogin(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.authService
      .login(this.loginForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          if (this.authService.isAuthenticated()) {
            this.router.navigateByUrl(this.returnUrl);
            return;
          }

          this.errorMessage = response?.message || 'Invalid credentials';
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error?.error?.message || 'Invalid credentials';
        }
      });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.loginForm.get(fieldName);
    if (!field || !field.errors || !field.touched) {
      return null;
    }

    if (field.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }

    if (field.hasError('email')) {
      return 'Please enter a valid email address';
    }

    if (field.hasError('minlength')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors?.['minlength']?.requiredLength} characters`;
    }

    return null;
  }
}
