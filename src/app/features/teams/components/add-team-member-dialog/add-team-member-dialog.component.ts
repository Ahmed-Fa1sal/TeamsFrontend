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
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

import { TeamManagementFetcherService } from '../../services/team-management-fetcher.service';
import { TeamMemberRole } from '../../models/team.models';

export interface AddTeamMemberDialogData {
  teamId: string | number;
  teamName: string;
  existingMemberIds: ReadonlyArray<string | number>;
}

/** Result the parent can use to reload / animate; role is captured for when a
 *  team change-role endpoint exists (see TODO in submit()). */
export interface AddTeamMemberResult {
  userId: number;
  role: Exclude<TeamMemberRole, 'OWNER'>;
}

@Component({
  selector: 'app-add-team-member-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './add-team-member-dialog.component.html',
  styleUrls: ['./add-team-member-dialog.component.css'],
})
export class AddTeamMemberDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddTeamMemberDialogComponent>);
  readonly data: AddTeamMemberDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly teamService = inject(TeamManagementFetcherService);
  private readonly snackBar = inject(MatSnackBar);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  // TODO: replace the raw User ID field with a user-search autocomplete once a
  // user lookup endpoint exists (e.g. GET /users/search?query=). No such
  // endpoint is available today, so we mirror the existing org "add member"
  // pattern and accept a user ID directly.
  readonly form = this.fb.group({
    userId: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    role: ['MEMBER' as Exclude<TeamMemberRole, 'OWNER'>, Validators.required],
  });

  getUserIdError(): string | null {
    const ctrl = this.form.get('userId');
    if (!ctrl?.touched) return null;
    if (ctrl.hasError('required')) return 'User ID is required';
    if (ctrl.hasError('pattern')) return 'Enter a numeric user ID';
    if (ctrl.hasError('alreadyMember')) return 'That user is already in this team';
    return null;
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = Number(this.form.controls.userId.value);
    const role = this.form.controls.role.value as Exclude<TeamMemberRole, 'OWNER'>;

    if (this.data.existingMemberIds.some(id => Number(id) === userId)) {
      this.form.controls.userId.setErrors({ alreadyMember: true });
      this.form.controls.userId.markAsTouched();
      return;
    }

    this.submitting.set(true);
    this.serverError.set(null);

    // NOTE: addTeamMember only accepts a userId.
    // TODO: apply the selected role after creation when a team change-role
    // endpoint/service method exists (e.g. PATCH /teams/{id}/members/{userId}/role
    // → TeamManagementFetcherService.changeMemberRole). Until then the member is
    // added with the backend's default role.
    this.teamService.addTeamMember(Number(this.data.teamId), userId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open('Member added.', 'Dismiss', { duration: 3000 });
        this.dialogRef.close({ userId, role } satisfies AddTeamMemberResult);
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
    if (err.status === 404) return 'No user found with that ID.';
    return err.error?.message ?? err.error?.error ?? `Failed to add member (error ${err.status}).`;
  }
}
