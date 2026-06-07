/**
 * Register Component
 * Standalone component for user registration
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { MessagesModule } from 'primeng/messages';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    MessagesModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  messages: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  get passwordStrength(): { score: number; label: string; color: string } {
    const value = this.registerForm?.get('password')?.value || '';
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
    if (score === 2) return { score, label: 'Fair', color: '#f97316' };
    if (score === 3) return { score, label: 'Good', color: '#eab308' };
    if (score === 4) return { score, label: 'Strong', color: '#22c55e' };
    return { score, label: 'Very strong', color: '#16a34a' };
  }

  private initializeForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          this.passwordValidator.bind(this)
        ]
      ]
    });
  }

  /**
   * Password validator - must contain uppercase, lowercase, and number
   */
  private passwordValidator(control: any): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return { invalidPassword: true };
    }

    return null;
  }

  /**
   * Handle register form submission
   */
  onRegister(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.messages = [];

    this.authService
      .register(this.registerForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.isLoading = false;
          this.messages = [
            {
              severity: 'error',
              summary: 'Registration Failed',
              detail: error?.error?.message || 'An error occurred during registration'
            }
          ];
        }
      });
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string | null {
    const field = this.registerForm.get(fieldName);
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
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }

    if (field.hasError('invalidPassword')) {
      return 'Password must contain uppercase, lowercase, and number';
    }

    return null;
  }
}
