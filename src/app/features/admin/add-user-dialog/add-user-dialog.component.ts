import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminUserService, CreateUserRequest } from '../admin-user.service';

@Component({
  selector: 'app-add-user-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './add-user-dialog.component.html',
  styleUrls: ['./add-user-dialog.component.css']
})
export class AddUserDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddUserDialogComponent>);
  private readonly adminUserService = inject(AdminUserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly submitting = signal(false);

  readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName:  ['', [Validators.required, Validators.minLength(2)]],
    username:  ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^\w+$/)]],
    email:     ['', [Validators.required, Validators.email]],
    password:  ['', [Validators.required, Validators.minLength(8), AddUserDialogComponent.passwordPolicy]]
  });

  /** Backend requires upper + lower + number — mirror it so weak
   *  passwords are caught here instead of failing server-side. */
  private static passwordPolicy(control: AbstractControl): ValidationErrors | null {
    const value: string = control.value ?? '';
    if (!value) return null;
    const ok = /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
    return ok ? null : { weakPassword: true };
  }

  getError(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors || !ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'This field is required';
    if (ctrl.hasError('email'))     return 'Enter a valid email address';
    if (ctrl.hasError('minlength'))
      return `Minimum ${ctrl.errors['minlength'].requiredLength} characters`;
    if (ctrl.hasError('pattern'))   return 'Only letters, numbers and underscores';
    if (ctrl.hasError('weakPassword'))
      return 'Must include an uppercase letter, a lowercase letter, and a number';
    return null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue() as CreateUserRequest;

    this.adminUserService.createUser(value).subscribe({
      next: created => {
        this.submitting.set(false);
        const name = created?.username ?? value.username;
        this.snackBar.open(`User "${name}" created successfully.`, 'Dismiss', { duration: 4000 });
        this.dialogRef.close(true);
      },
      error: err => {
        this.submitting.set(false);
        this.snackBar.open(this.describeError(err), 'Dismiss', { duration: 6000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  /** Surface the backend's real message + status instead of a generic line. */
  private describeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Cannot reach the server. Is the backend running?';
      }
      // Backend sends duplicate-user and validation failures as 400 with a
      // message body, e.g. {"message":"Email already registered"}.
      const serverMsg: string | undefined =
        err.error?.message ?? err.error?.error ?? undefined;
      if (serverMsg) return serverMsg;
      if (err.status === 403) {
        return 'You are not allowed to create users (server returned 403).';
      }
      return `Failed to create user (error ${err.status}).`;
    }
    return 'Failed to create user. Please try again.';
  }
}
