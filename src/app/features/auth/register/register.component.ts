import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import gsap from 'gsap';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  registerForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage: string | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  ngAfterViewInit(): void {
    gsap.from('.auth-panel', { y: 32, opacity: 0, duration: 0.45, ease: 'power2.out' });
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
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z\d]/.test(value)) score++;
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

  private passwordValidator(control: { value: string }): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return { invalidPassword: true };
    }
    return null;
  }

  onRegister(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

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
          this.errorMessage = error?.error?.message || 'An error occurred during registration';
        }
      });
  }

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
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors?.['minlength']?.['requiredLength']} characters`;
    }

    if (field.hasError('invalidPassword')) {
      return 'Password must contain uppercase, lowercase, and number';
    }

    return null;
  }
}
