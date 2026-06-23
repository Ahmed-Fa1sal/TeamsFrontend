import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

import { TeamManagementFetcherService } from '../../../teams/services/team-management-fetcher.service';

export interface AddChannelMemberDialogData {
  teamId: number;
  channelId: number;
  channelName: string;
  existingMemberIds: ReadonlyArray<number>;
}

export interface AddChannelMemberResult {
  userId: number;
}

@Component({
  selector: 'app-add-channel-member-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './add-channel-member-dialog.component.html',
  styleUrls: ['./add-channel-member-dialog.component.css'],
})
export class AddChannelMemberDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddChannelMemberDialogComponent>);
  readonly data: AddChannelMemberDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly teamService = inject(TeamManagementFetcherService);
  private readonly snackBar = inject(MatSnackBar);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.group({
    userId: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
  });

  getUserIdError(): string | null {
    const ctrl = this.form.get('userId');
    if (!ctrl?.touched) return null;
    if (ctrl.hasError('required')) return 'User ID is required';
    if (ctrl.hasError('pattern')) return 'Enter a numeric user ID';
    if (ctrl.hasError('alreadyMember')) return 'That user is already in this channel';
    return null;
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = Number(this.form.controls.userId.value);

    if (this.data.existingMemberIds.some(id => id === userId)) {
      this.form.controls.userId.setErrors({ alreadyMember: true });
      this.form.controls.userId.markAsTouched();
      return;
    }

    this.submitting.set(true);
    this.serverError.set(null);

    this.teamService
      .addChannelMember(this.data.teamId, this.data.channelId, userId)
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.snackBar.open('Member added to channel.', 'Dismiss', { duration: 3000 });
          this.dialogRef.close({ userId } satisfies AddChannelMemberResult);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.serverError.set(this.describeError(err));
        },
      });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  private describeError(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Cannot reach the server. Is the backend running?';
    if (err.status === 403) return 'You do not have permission to add members to this channel.';
    if (err.status === 404) return 'No user found with that ID.';
    return err.error?.message ?? err.error?.error ?? `Failed to add member (error ${err.status}).`;
  }
}
