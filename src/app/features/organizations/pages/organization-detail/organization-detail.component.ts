import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

import { OrganizationService } from '../../services/organization.service';
import { AuthService } from '@features/auth/services/auth.service';
import { PermissionService } from '@core/services/permission.service';
import {
  AddOrganizationMemberRequest,
  OrganizationMemberResponse,
  OrganizationMemberRole,
  OrganizationResponse,
  UpdateMemberRoleRequest
} from '../../models/organization.model';
import { OrganizationRole } from '@core/auth/roles';
import { FormErrorComponent } from '@shared/components/form-error/form-error.component';
import { OrgRoleLabelPipe, ROLE_LABELS } from '../../pipes/org-role-label.pipe';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  OrgFormResult,
  OrganizationFormComponent
} from '../../components/organization-form/organization-form.component';
import {
  AddMemberDialogComponent,
  AddMemberDialogData
} from '../../components/add-member-dialog/add-member-dialog.component';
import {
  UpdateMemberRoleDialogComponent,
  UpdateRoleDialogData
} from '../../components/update-member-role-dialog/update-member-role-dialog.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { animatePageEntrance, animateListUpdate } from '@core/animations/page-animations';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    FormErrorComponent,
    OrgRoleLabelPipe,
    SkeletonComponent
  ],
  templateUrl: './organization-detail.component.html',
  styleUrls: ['./organization-detail.component.css']
})
export class OrganizationDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orgService = inject(OrganizationService);
  private readonly authService = inject(AuthService);
  private readonly permissions = inject(PermissionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroy$ = new Subject<void>();
  private tl?: ReturnType<typeof animatePageEntrance>;
  private hasAnimatedEntrance = false;

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

  readonly roleFilterOptions: Array<{ label: string; value: OrganizationMemberRole | null }> = [
    { label: 'All roles', value: null },
    ...Object.values(OrganizationMemberRole).map(r => ({ label: ROLE_LABELS[r], value: r }))
  ];

  readonly currentUserId = computed(() => Number(this.authService.getCurrentUser()?.id ?? 0));
  readonly isSystemAdmin = computed(() => this.permissions.isSystemAdmin());
  readonly currentMembership = computed(() =>
    this.members().find(m => m.userId === this.currentUserId())
  );
  readonly isOrgAdmin = computed(() =>
    this.isSystemAdmin() ||
    this.currentMembership()?.role === OrganizationMemberRole.ORG_ADMIN
  );

  private readonly _syncOrgContext = effect(() => {
    const membership = this.currentMembership();
    if (membership) {
      this.permissions.setOrgContext(membership.role as unknown as OrganizationRole, this.orgId());
    } else {
      this.permissions.clearOrgContext();
    }
  });

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
        next: org => {
          this.organization.set(org);
          this.loadingOrg.set(false);
          this.animateAfterLoad();
        },
        error: err => {
          this.errorOrg.set(err.error?.message ?? 'Failed to load organization');
          this.loadingOrg.set(false);
        }
      });
  }

  /**
   * First successful load → full page-entrance timeline.
   * Later member reloads (filter/pagination) → quick row fade only.
   */
  private animateAfterLoad(): void {
    setTimeout(() => {
      const host = this.el.nativeElement as HTMLElement;
      if (this.hasAnimatedEntrance) {
        const rows = Array.from(host.querySelectorAll<HTMLElement>('.animate-row'));
        animateListUpdate(rows);
      } else {
        this.hasAnimatedEntrance = true;
        this.tl = animatePageEntrance(host);
      }
    }, 0);
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
          this.animateAfterLoad();
        },
        error: err => {
          this.errorMembers.set(err.error?.message ?? 'Failed to load members');
          this.loadingMembers.set(false);
        }
      });
  }

  onMembersPageChange(event: PageEvent): void {
    this.membersPage.set(event.pageIndex);
    this.membersPageSize.set(event.pageSize);
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

    const ref = this.dialog.open(OrganizationFormComponent, {
      width: '500px',
      data: { mode: 'edit', organization: org }
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: OrgFormResult | null) => {
      if (!result) return;
      this.orgService.updateOrganization(org.id, result)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: updated => {
            this.organization.set(updated);
            this.snackBar.open('Organization updated', 'Dismiss', { duration: 3000 });
          },
          error: err =>
            this.snackBar.open(err.error?.message ?? 'Failed to update', 'Dismiss', { duration: 4000 })
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
        this.snackBar.open(
          org.active ? 'Organization deactivated' : 'Organization activated',
          'Dismiss',
          { duration: 3000 }
        );
      },
      error: err =>
        this.snackBar.open(err.error?.message ?? 'Action failed', 'Dismiss', { duration: 4000 })
    });
  }

  openAddMemberDialog(): void {
    const ref = this.dialog.open(AddMemberDialogComponent, {
      width: '440px',
      data: { orgId: this.orgId() } satisfies AddMemberDialogData
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(
      (result: AddOrganizationMemberRequest | null) => {
        if (!result) return;
        this.orgService.addMember(this.orgId(), result)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Member added', 'Dismiss', { duration: 3000 });
              this.loadMembers();
            },
            error: err =>
              this.snackBar.open(err.error?.message ?? 'Failed to add member', 'Dismiss', { duration: 4000 })
          });
      }
    );
  }

  openChangeRoleDialog(member: OrganizationMemberResponse): void {
    const ref = this.dialog.open(UpdateMemberRoleDialogComponent, {
      width: '380px',
      data: {
        currentRole: member.role,
        memberName: member.fullName,
        canAssignOrgAdmin: this.isSystemAdmin()
      } satisfies UpdateRoleDialogData
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(
      (result: UpdateMemberRoleRequest | null) => {
        if (!result) return;
        this.orgService.updateMemberRole(this.orgId(), member.userId, result)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Role updated', 'Dismiss', { duration: 3000 });
              this.loadMembers();
            },
            error: err =>
              this.snackBar.open(err.error?.message ?? 'Failed to update role', 'Dismiss', { duration: 4000 })
          });
      }
    );
  }

  confirmRemoveMember(member: OrganizationMemberResponse): void {
    const data: ConfirmDialogData = {
      header: 'Remove Member',
      message: `Remove ${member.fullName} from this organization?`,
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel'
    };

    this.dialog.open(ConfirmDialogComponent, { data, width: '360px' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.orgService.removeMember(this.orgId(), member.userId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Member removed', 'Dismiss', { duration: 3000 });
              this.loadMembers();
            },
            error: err =>
              this.snackBar.open(err.error?.message ?? 'Failed to remove member', 'Dismiss', { duration: 4000 })
          });
      });
  }

  leaveOrganization(): void {
    const data: ConfirmDialogData = {
      header: 'Leave Organization',
      message: 'Are you sure you want to leave this organization?',
      acceptLabel: 'Leave',
      rejectLabel: 'Cancel'
    };

    this.dialog.open(ConfirmDialogComponent, { data, width: '360px' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.orgService.leaveOrganization(this.orgId())
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('You have left the organization', 'Dismiss', { duration: 3000 });
              this.router.navigate([this.isSystemAdmin() ? '/organizations' : '/home']);
            },
            error: err =>
              this.snackBar.open(err.error?.message ?? 'Failed to leave', 'Dismiss', { duration: 4000 })
          });
      });
  }

  roleSeverity(role: OrganizationMemberRole): 'warn' | 'info' | 'secondary' {
    if (role === OrganizationMemberRole.ORG_ADMIN) return 'warn';
    if (role === OrganizationMemberRole.TEAM_ADMIN) return 'info';
    return 'secondary';
  }

  goBack(): void {
    this.router.navigate([this.isSystemAdmin() ? '/organizations' : '/home']);
  }

  ngOnDestroy(): void {
    this.tl?.kill();
    this.permissions.clearOrgContext();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
