import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { OrganizationMemberRole } from '../../models/organization.model';
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
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './update-member-role-dialog.component.html',
  styleUrls: ['./update-member-role-dialog.component.css']
})
export class UpdateMemberRoleDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UpdateMemberRoleDialogComponent>);
  readonly dialogData: UpdateRoleDialogData = inject(MAT_DIALOG_DATA);

  readonly roleOptions = Object.values(OrganizationMemberRole)
    .filter(r => r !== OrganizationMemberRole.ORG_ADMIN || this.dialogData.canAssignOrgAdmin)
    .map(r => ({ label: ROLE_LABELS[r], value: r }));

  readonly selectedRole = signal<OrganizationMemberRole>(this.dialogData.currentRole);

  confirm(): void {
    this.dialogRef.close({ role: this.selectedRole() });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
