import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

import { OrganizationService } from '../../services/organization.service';
import { AuthService } from '@features/auth/services/auth.service';
import {
  AddOrganizationMemberRequest,
  OrganizationMemberResponse,
  OrganizationMemberRole,
  OrganizationResponse,
  UpdateMemberRoleRequest
} from '../../models/organization.model';
import { FormErrorComponent } from '@shared/components/form-error/form-error.component';
import { OrgRoleLabelPipe, ROLE_LABELS } from '../../pipes/org-role-label.pipe';
import {
  OrgFormResult,
  OrganizationFormComponent
} from '../../components/organization-form/organization-form.component';
import { AddMemberDialogComponent } from '../../components/add-member-dialog/add-member-dialog.component';
import {
  UpdateMemberRoleDialogComponent,
  UpdateRoleDialogData
} from '../../components/update-member-role-dialog/update-member-role-dialog.component';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    SelectModule,
    ProgressSpinnerModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    PaginatorModule,
    DividerModule,
    FormErrorComponent,
    OrgRoleLabelPipe
  ],
  templateUrl: './organization-detail.component.html',
  styleUrls: ['./organization-detail.component.css']
})
export class OrganizationDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orgService = inject(OrganizationService);
  private readonly authService = inject(AuthService);
  private readonly dialogService = inject(DialogService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroy$ = new Subject<void>();
  private dialogRef: DynamicDialogRef | null = null;

  readonly orgId = signal<number>(0);
  readonly organization = signal<OrganizationResponse | null>(null);
  readonly members = signal<OrganizationMemberResponse[]>([]);
  readonly loadingOrg = signal(false);
  readonly loadingMembers = signal(false);
  readonly errorOrg = signal<string | null>(null);
  readonly errorMembers = signal<string | null>(null);
  readonly membersTotal = signal(0);
  readonly membersPage = signal(0);
  readonly membersPageSize = signal(10);
  readonly roleFilter = signal<OrganizationMemberRole | null>(null);

  readonly roleFilterOptions = [
    { label: 'All roles', value: null },
    ...Object.values(OrganizationMemberRole).map(r => ({ label: ROLE_LABELS[r], value: r }))
  ];

  readonly currentUserId = computed(() => Number(this.authService.getCurrentUser()?.id ?? 0));
  readonly isSystemAdmin = computed(
    () => this.authService.getCurrentUser()?.roles?.includes('ROLE_SYSTEM_ADMIN') ?? false
  );
  readonly currentMembership = computed(() =>
    this.members().find(m => m.userId === this.currentUserId())
  );
  readonly isOrgAdmin = computed(() =>
    this.isSystemAdmin() ||
    this.currentMembership()?.role === OrganizationMemberRole.ORG_ADMIN
  );
  readonly canLeave = computed(() => {
    const role = this.currentMembership()?.role;
    return role !== undefined && role !== OrganizationMemberRole.ORG_ADMIN;
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.orgId.set(id);
    this.loadOrganization();
    this.loadMembers();
  }

  loadOrganization(): void {
    this.loadingOrg.set(true);
    this.errorOrg.set(null);

    this.orgService.getOrganizationById(this.orgId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: org => { this.organization.set(org); this.loadingOrg.set(false); },
        error: err => {
          this.errorOrg.set(err.error?.message ?? 'Failed to load organization');
          this.loadingOrg.set(false);
        }
      });
  }

  loadMembers(): void {
    this.loadingMembers.set(true);
    this.errorMembers.set(null);

    const pageable = { page: this.membersPage(), size: this.membersPageSize() };
    const role = this.roleFilter() ?? undefined;

    this.orgService.getMembers(this.orgId(), pageable, role)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.members.set(res.content);
          this.membersTotal.set(res.totalElements);
          this.loadingMembers.set(false);
        },
        error: err => {
          this.errorMembers.set(err.error?.message ?? 'Failed to load members');
          this.loadingMembers.set(false);
        }
      });
  }

  onMembersPageChange(event: PaginatorState): void {
    this.membersPage.set(event.page ?? 0);
    this.membersPageSize.set(event.rows ?? this.membersPageSize());
    this.loadMembers();
  }

  onRoleFilterChange(role: OrganizationMemberRole | null): void {
    this.roleFilter.set(role);
    this.membersPage.set(0);
    this.loadMembers();
  }

  openEditDialog(): void {
    const org = this.organization();
    if (!org) return;

    this.dialogRef = this.dialogService.open(OrganizationFormComponent, {
      header: 'Edit Organization',
      width: '500px',
      modal: true,
      data: { mode: 'edit', organization: org } satisfies import('../../components/organization-form/organization-form.component').OrgFormDialogData
    });

    this.dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe((result: OrgFormResult | null) => {
      if (!result) return;
      this.orgService.updateOrganization(org.id, result)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: updated => {
            this.organization.set(updated);
            this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Organization updated' });
          },
          error: err =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Failed to update' })
        });
    });
  }

  toggleActivation(): void {
    const org = this.organization();
    if (!org) return;

    const action$ = org.active
      ? this.orgService.deactivateOrganization(org.id)
      : this.orgService.activateOrganization(org.id);

    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: updated => {
        this.organization.set(updated);
        this.messageService.add({
          severity: 'success',
          summary: org.active ? 'Deactivated' : 'Activated',
          detail: org.active ? 'Organization deactivated' : 'Organization activated'
        });
      },
      error: err =>
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Action failed' })
    });
  }

  openAddMemberDialog(): void {
    this.dialogRef = this.dialogService.open(AddMemberDialogComponent, {
      header: 'Add Member',
      width: '440px',
      modal: true,
      data: { orgId: this.orgId() } satisfies import('../../components/add-member-dialog/add-member-dialog.component').AddMemberDialogData
    });

    this.dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe(
      (result: AddOrganizationMemberRequest | null) => {
        if (!result) return;
        this.orgService.addMember(this.orgId(), result)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Added', detail: 'Member added' });
              this.loadMembers();
            },
            error: err =>
              this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Failed to add member' })
          });
      }
    );
  }

  openChangeRoleDialog(member: OrganizationMemberResponse): void {
    this.dialogRef = this.dialogService.open(UpdateMemberRoleDialogComponent, {
      header: 'Change Role',
      width: '380px',
      modal: true,
      data: { currentRole: member.role, memberName: member.fullName } satisfies UpdateRoleDialogData
    });

    this.dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe(
      (result: UpdateMemberRoleRequest | null) => {
        if (!result) return;
        this.orgService.updateMemberRole(this.orgId(), member.userId, result)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Role updated' });
              this.loadMembers();
            },
            error: err =>
              this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Failed to update role' })
          });
      }
    );
  }

  confirmRemoveMember(member: OrganizationMemberResponse): void {
    this.confirmationService.confirm({
      header: 'Remove Member',
      message: `Remove ${member.fullName} from this organization?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.orgService.removeMember(this.orgId(), member.userId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Removed', detail: 'Member removed' });
              this.loadMembers();
            },
            error: err =>
              this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Failed to remove member' })
          });
      }
    });
  }

  leaveOrganization(): void {
    this.confirmationService.confirm({
      header: 'Leave Organization',
      message: 'Are you sure you want to leave this organization?',
      icon: 'pi pi-sign-out',
      acceptLabel: 'Leave',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => {
        this.orgService.leaveOrganization(this.orgId())
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'info', summary: 'Left', detail: 'You have left the organization' });
              this.router.navigate(['/organizations']);
            },
            error: err =>
              this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Failed to leave' })
          });
      }
    });
  }

  roleSeverity(role: OrganizationMemberRole): 'warn' | 'info' | 'secondary' {
    if (role === OrganizationMemberRole.ORG_ADMIN) return 'warn';
    if (role === OrganizationMemberRole.TEAM_ADMIN) return 'info';
    return 'secondary';
  }

  goBack(): void {
    this.router.navigate(['/organizations']);
  }

  ngOnDestroy(): void {
    this.dialogRef?.close();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
