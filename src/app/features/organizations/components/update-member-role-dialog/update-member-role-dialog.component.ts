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

export interface UpdateRoleDialogData {
  currentRole: OrganizationMemberRole;
  memberName: string;
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
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);

  readonly dialogData: UpdateRoleDialogData = this.config.data;
  readonly roleOptions = Object.values(OrganizationMemberRole).map(r => ({ label: r, value: r }));
  readonly selectedRole = signal<OrganizationMemberRole>(this.dialogData.currentRole);

  confirm(): void {
    this.ref.close({ role: this.selectedRole() } as UpdateMemberRoleRequest);
  }

  cancel(): void {
    this.ref.close(null);
  }
}
