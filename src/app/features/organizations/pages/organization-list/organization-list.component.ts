import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    computed,
    inject,
    signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PaginatorState } from 'primeng/paginator';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { PrimeNgModule } from '@shared/modules/primeng.module';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

import { OrganizationService } from '../../services/organization.service';
import { AuthService } from '@features/auth/services/auth.service';
import { OrganizationResponse } from '../../models/organization.model';
import { HasRoleDirective } from '@shared/directives/has-role.directive';
import { FormErrorComponent } from '@shared/components/form-error/form-error.component';
import {
    OrgFormResult,
    OrganizationFormComponent,
    OrgFormDialogData
} from '../../components/organization-form/organization-form.component';
import { CreateOrganizationRequest } from '../../models/organization.model';

@Component({
    selector: 'app-organization-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        PrimeNgModule,
        RouterLink,
        HasRoleDirective,
        FormErrorComponent
    ],
    templateUrl: './organization-list.component.html',
    styleUrls: ['./organization-list.component.css']
})
export class OrganizationListComponent implements OnInit, OnDestroy {
    private readonly orgService = inject(OrganizationService);
    private readonly authService = inject(AuthService);
    private readonly dialogService = inject(DialogService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly router = inject(Router);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroy$ = new Subject<void>();
    private dialogRef: DynamicDialogRef | null = null;

    readonly organizations = signal<OrganizationResponse[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly total = signal(0);
    readonly page = signal(0);
    readonly pageSize = signal(10);
    readonly isAdminView = signal(false);
    readonly currentSearch = signal('');

    readonly searchControl = new FormControl('');

    readonly isSystemAdmin = computed(
        () => this.authService.getCurrentUser()?.roles?.includes('ROLE_SYSTEM_ADMIN') ?? false
    );

    ngOnInit(): void {
        this.searchControl.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(query => {
            this.currentSearch.set(query ?? '');
            this.page.set(0);
            this.loadOrganizations();
        });

        this.loadOrganizations();
    }

    loadOrganizations(): void {
        const pageable = { page: this.page(), size: this.pageSize() };
        const query = this.currentSearch();

        this.loading.set(true);
        this.error.set(null);
        this.cdr.markForCheck();

        const request$ = query
            ? this.orgService.searchOrganizations(query, pageable)
            : this.isAdminView()
                ? this.orgService.getAllOrganizations(pageable)
                : this.orgService.getMyOrganizations(pageable);

        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: response => {
                this.organizations.set(response.content);
                this.total.set(response.totalElements);
                this.loading.set(false);
                this.cdr.markForCheck();
            },
            error: err => {
                this.error.set(err.error?.message ?? 'Failed to load organizations');
                this.loading.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    onPageChange(event: PaginatorState): void {
        this.page.set(event.page ?? 0);
        this.pageSize.set(event.rows ?? this.pageSize());
        this.loadOrganizations();
    }

    onAdminToggle(checked: boolean): void {
        this.isAdminView.set(checked);
        this.page.set(0);
        this.loadOrganizations();
    }

    openCreateDialog(): void {
        this.dialogRef = this.dialogService.open(OrganizationFormComponent, {
            header: 'New Organization',
            width: '500px',
            modal: true,
            closable: true,
            data: { mode: 'create' } satisfies OrgFormDialogData
        });

        this.dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe((result: OrgFormResult | null) => {
            if (!result) return;
            this.orgService.createOrganization(result as CreateOrganizationRequest)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Organization created' });
                        this.loadOrganizations();
                    },
                    error: err =>
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Failed to create organization' })
                });
        });
    }

    openEditDialog(org: OrganizationResponse): void {
        this.dialogRef = this.dialogService.open(OrganizationFormComponent, {
            header: 'Edit Organization',
            width: '500px',
            modal: true,
            data: { mode: 'edit', organization: org } satisfies OrgFormDialogData
        });

        this.dialogRef.onClose.pipe(takeUntil(this.destroy$)).subscribe((result: OrgFormResult | null) => {
            if (!result) return;
            this.orgService.updateOrganization(org.id, result)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Organization updated' });
                        this.loadOrganizations();
                    },
                    error: err =>
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Failed to update organization' })
                });
        });
    }

    confirmDelete(org: OrganizationResponse): void {
        this.confirmationService.confirm({
            header: 'Delete Organization',
            message: `Delete "${org.name}"? This cannot be undone.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.orgService.deleteOrganization(org.id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Organization deleted' });
                            this.loadOrganizations();
                        },
                        error: err =>
                            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Failed to delete' })
                    });
            }
        });
    }

    toggleActivation(org: OrganizationResponse): void {
        const action$ = org.active
            ? this.orgService.deactivateOrganization(org.id)
            : this.orgService.activateOrganization(org.id);

        action$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: org.active ? 'Deactivated' : 'Activated',
                    detail: org.active ? 'Organization deactivated' : 'Organization activated'
                });
                this.loadOrganizations();
            },
            error: err =>
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Action failed' })
        });
    }

    viewOrg(id: number): void {
        this.router.navigate(['/organizations', id]);
    }

    ngOnDestroy(): void {
        this.dialogRef?.close();
        this.destroy$.next();
        this.destroy$.complete();
    }
}