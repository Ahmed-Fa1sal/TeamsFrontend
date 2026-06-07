import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormErrorComponent } from '@shared/components/form-error/form-error.component';
import {
  AddOrganizationMemberRequest,
  OrganizationMemberRole
} from '../../models/organization.model';

export interface AddMemberDialogData {
  orgId: number;
}

@Component({
  selector: 'app-add-member-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ProgressSpinnerModule,
    FormErrorComponent
  ],
  templateUrl: './add-member-dialog.component.html',
  styleUrls: ['./add-member-dialog.component.css']
})
export class AddMemberDialogComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly fb = inject(FormBuilder);

  readonly dialogData: AddMemberDialogData = this.config.data;
  readonly submitting = signal(false);
  readonly roleOptions = Object.values(OrganizationMemberRole).map(r => ({ label: r, value: r }));

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
    this.ref.close({ userId: Number(userId!), role: role! } as AddOrganizationMemberRequest);
  }

  cancel(): void {
    this.ref.close(null);
  }
}
