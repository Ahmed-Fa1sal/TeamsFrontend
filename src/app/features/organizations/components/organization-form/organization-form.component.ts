import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormErrorComponent } from '@shared/components/form-error/form-error.component';
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
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ProgressSpinnerModule,
    FormErrorComponent
  ],
  templateUrl: './organization-form.component.html',
  styleUrls: ['./organization-form.component.css']
})
export class OrganizationFormComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly fb = inject(FormBuilder);

  readonly dialogData: OrgFormDialogData = this.config.data;
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
    this.ref.close({
      name: name!,
      description: description || undefined,
      logoUrl: logoUrl || undefined,
      tier: tier!
    } as OrgFormResult);
  }

  cancel(): void {
    this.ref.close(null);
  }
}
