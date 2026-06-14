import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import {
  CreateOrganizationRequest,
  OrganizationResponse,
  UpdateOrganizationRequest
} from '../../models/organization.model';

export interface OrgFormDialogData {
  mode: 'create' | 'edit';
  organization?: OrganizationResponse;
}

export type OrgFormResult = CreateOrganizationRequest | UpdateOrganizationRequest;

const TIER_OPTIONS = [
  { label: 'Free', value: 'FREE' },
  { label: 'Professional', value: 'PROFESSIONAL' },
  { label: 'Enterprise', value: 'ENTERPRISE' }
];

@Component({
  selector: 'app-organization-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './organization-form.component.html',
  styleUrls: ['./organization-form.component.css']
})
export class OrganizationFormComponent {
  private readonly dialogRef = inject(MatDialogRef<OrganizationFormComponent>);
  readonly dialogData: OrgFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly submitting = signal(false);
  readonly isEdit = computed(() => this.dialogData.mode === 'edit');
  readonly tierOptions = TIER_OPTIONS;

  readonly form = this.fb.group({
    name: [
      this.dialogData.organization?.name ?? '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
    ],
    description: [this.dialogData.organization?.description ?? ''],
    logoUrl: [this.dialogData.organization?.logoUrl ?? ''],
    tier: [
      this.dialogData.organization?.tier ?? 'FREE',
      Validators.required
    ]
  });

  getError(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors || !ctrl.touched) return null;
    if (ctrl.hasError('required'))
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    if (ctrl.hasError('minlength'))
      return `Minimum ${ctrl.errors['minlength'].requiredLength} characters`;
    if (ctrl.hasError('maxlength'))
      return `Maximum ${ctrl.errors['maxlength'].requiredLength} characters`;
    return null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, description, logoUrl, tier } = this.form.getRawValue();
    this.dialogRef.close({
      name: name!,
      description: description || undefined,
      logoUrl: logoUrl || undefined,
      tier: tier!
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
