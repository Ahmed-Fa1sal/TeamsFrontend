import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { OrganizationMemberRole } from '../../models/organization.model';
import { ROLE_LABELS } from '../../pipes/org-role-label.pipe';

export interface AddMemberDialogData {
  orgId: number;
}

@Component({
  selector: 'app-add-member-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './add-member-dialog.component.html',
  styleUrls: ['./add-member-dialog.component.css']
})
export class AddMemberDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddMemberDialogComponent>);
  readonly dialogData: AddMemberDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly submitting = signal(false);
  readonly roleOptions = Object.values(OrganizationMemberRole).map(r => ({
    label: ROLE_LABELS[r],
    value: r
  }));

  readonly form = this.fb.group({
    userId: ['', Validators.required],
    role: [OrganizationMemberRole.MEMBER, Validators.required]
  });

  getError(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors || !ctrl.touched) return null;
    if (ctrl.hasError('required'))
      return field === 'userId' ? 'User ID is required' : 'Role is required';
    return null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { userId, role } = this.form.getRawValue();
    this.dialogRef.close({ userId: Number(userId!), role: role! });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
