import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import {
  OrganizationMemberRole,
  UpdateMemberRoleRequest
} from '../../models/organization.model';
import { ROLE_LABELS } from '../../pipes/org-role-label.pipe';

export interface UpdateRoleDialogData {
  currentRole: OrganizationMemberRole;
  memberName: string;
  /** Only SYSTEM_ADMIN may assign the ORG_ADMIN role. */
  canAssignOrgAdmin: boolean;
}

@Component({
  selector: 'app-update-member-role-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule
  ],
  templateUrl: './update-member-role-dialog.component.html',
  styleUrls: ['./update-member-role-dialog.component.css']
})
export class UpdateMemberRoleDialogComponent {
  private readonly ref    = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);

  readonly dialogData: UpdateRoleDialogData = this.config.data;

  /** ORG_ADMIN role is only offered when the caller is SYSTEM_ADMIN. */
  readonly roleOptions = Object.values(OrganizationMemberRole)
    .filter(r => r !== OrganizationMemberRole.ORG_ADMIN || this.dialogData.canAssignOrgAdmin)
    .map(r => ({ label: ROLE_LABELS[r], value: r }));

  readonly selectedRole = signal<OrganizationMemberRole>(this.dialogData.currentRole);

  confirm(): void {
    this.ref.close({ role: this.selectedRole() } as UpdateMemberRoleRequest);
  }

  cancel(): void {
    this.ref.close(null);
  }
}
