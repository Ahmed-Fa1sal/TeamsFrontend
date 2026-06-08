import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import gsap from 'gsap';

import { AuthService } from '@features/auth/services/auth.service';
import { User, UserRole } from '@features/auth/models/auth.models';
import { ProfileService } from './services/profile.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  isSavingProfile = false;
  isChangingPassword = false;
  isLoggingOut = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly profileService: ProfileService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = this.authService.getCurrentUser();
    this.buildForms();

    setTimeout(() => {
      gsap.from('.profile-card', {
        y: 20, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out',
      });
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get userInitials(): string {
    if (!this.currentUser) return '?';
    const f = this.currentUser.firstName?.charAt(0) ?? '';
    const l = this.currentUser.lastName?.charAt(0) ?? '';
    return (f + l).toUpperCase() || this.currentUser.email.charAt(0).toUpperCase();
  }

  get fullName(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.firstName ?? ''} ${this.currentUser.lastName ?? ''}`.trim()
      || this.currentUser.username;
  }

  get userRoles(): UserRole[] {
    return this.currentUser?.roles?.length ? this.currentUser.roles : ['member'];
  }

  getRoleLabel(role: UserRole): string {
    const map: Partial<Record<UserRole, string>> = {
      admin: 'Admin',
      owner: 'Owner',
      member: 'Member',
      viewer: 'Viewer',
      ROLE_SYSTEM_ADMIN: 'System Admin',
    };
    return map[role] ?? role;
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) return;
    this.isSavingProfile = true;
    const { firstName, lastName, username } = this.profileForm.getRawValue() as {
      firstName: string; lastName: string; username: string;
    };
    this.profileService.updateProfile({ firstName, lastName, username })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          this.currentUser = updated;
          this.isSavingProfile = false;
          this.snackBar.open('Profile updated successfully', 'Dismiss', { duration: 3000 });
        },
        error: err => {
          this.isSavingProfile = false;
          this.snackBar.open(
            err.error?.message ?? 'Failed to update profile', 'Dismiss', { duration: 4000 },
          );
        },
      });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) return;
    this.isChangingPassword = true;
    const { currentPassword, newPassword } = this.passwordForm.value as {
      currentPassword: string; newPassword: string;
    };
    this.profileService.changePassword({ currentPassword, newPassword })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isChangingPassword = false;
          this.passwordForm.reset();
          this.snackBar.open('Password changed successfully', 'Dismiss', { duration: 3000 });
        },
        error: err => {
          this.isChangingPassword = false;
          this.snackBar.open(
            err.error?.message ?? 'Failed to change password', 'Dismiss', { duration: 4000 },
          );
        },
      });
  }

  onLogout(): void {
    const data: ConfirmDialogData = {
      header: 'Sign out?',
      message: 'You will be signed out of Teams.',
      acceptLabel: 'Sign out',
      rejectLabel: 'Cancel',
    };
    this.dialog.open(ConfirmDialogComponent, { data, width: '360px', panelClass: 'signout-dialog' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.isLoggingOut = true;
        this.authService.logout().pipe(takeUntil(this.destroy$)).subscribe({
          next: () => this.router.navigate(['/login']),
          error: () => this.router.navigate(['/login']),
        });
      });
  }

  onNavigate(path: string): void {
    this.router.navigate([path]);
  }

  private buildForms(): void {
    this.profileForm = this.fb.group({
      firstName: [
        this.currentUser?.firstName ?? '',
        [Validators.required, Validators.minLength(2)],
      ],
      lastName: [
        this.currentUser?.lastName ?? '',
        [Validators.required, Validators.minLength(2)],
      ],
      username: [
        this.currentUser?.username ?? '',
        [Validators.required, Validators.minLength(3), Validators.pattern(/^\w+$/)],
      ],
      email: [{ value: this.currentUser?.email ?? '', disabled: true }],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required, Validators.minLength(6)]],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: ProfileComponent.passwordMatch },
    );
  }

  private static passwordMatch(group: AbstractControl): { mismatch: true } | null {
    const a = group.get('newPassword')?.value;
    const b = group.get('confirmPassword')?.value;
    return a === b ? null : { mismatch: true };
  }
}