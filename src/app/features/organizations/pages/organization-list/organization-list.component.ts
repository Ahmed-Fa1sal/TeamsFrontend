import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { OrganizationService } from '../../services/organization.service';
import { PermissionService } from '@core/services/permission.service';
import { SystemRole } from '@core/auth/roles';
import { CreateOrganizationRequest, OrganizationResponse } from '../../models/organization.model';
import { HasRoleDirective } from '@shared/directives/has-role.directive';
import { FormErrorComponent } from '@shared/components/form-error/form-error.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  OrgFormResult,
  OrganizationFormComponent,
  OrgFormDialogData
} from '../../components/organization-form/organization-form.component';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { animatePageEntrance, animateListUpdate } from '@core/animations/page-animations';

@Component({
  selector: 'app-organization-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    HasRoleDirective,
    FormErrorComponent,
    SkeletonComponent
  ],
  templateUrl: './organization-list.component.html',
  styleUrls: ['./organization-list.component.css']
})
export class OrganizationListComponent implements OnInit, OnDestroy {
  private readonly orgService = inject(OrganizationService);
  private readonly permissions = inject(PermissionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroy$ = new Subject<void>();
  private tl?: ReturnType<typeof animatePageEntrance>;
  private hasAnimatedEntrance = false;

  readonly SystemRole = SystemRole;

  readonly organizations = signal<OrganizationResponse[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly isAdminView = signal(false);
  readonly currentSearch = signal('');

  readonly searchControl = new FormControl('');
  readonly isSystemAdmin = computed(() => this.permissions.isSystemAdmin());

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

    let request$;
    if (query) {
      request$ = this.orgService.searchOrganizations(query, pageable);
    } else if (this.isAdminView()) {
      request$ = this.orgService.getAllOrganizations(pageable);
    } else {
      request$ = this.orgService.getMyOrganizations(pageable);
    }

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.organizations.set(response.content);
        this.total.set(response.totalElements);
        this.loading.set(false);
        this.cdr.markForCheck();
        this.animateAfterLoad();
      },
      error: err => {
        this.error.set(err.error?.message ?? 'Failed to load organizations');
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * First successful load → full page-entrance timeline.
   * Subsequent loads (search/filter/pagination) → quick row fade only.
   * Runs in setTimeout so Angular renders the new rows first.
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

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadOrganizations();
  }

  onAdminToggle(checked: boolean): void {
    this.isAdminView.set(checked);
    this.page.set(0);
    this.loadOrganizations();
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(OrganizationFormComponent, {
      width: '500px',
      data: { mode: 'create' } satisfies OrgFormDialogData
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: OrgFormResult | null) => {
      if (!result) return;
      this.orgService.createOrganization(result as CreateOrganizationRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Organization created', 'Dismiss', { duration: 3000 });
            this.loadOrganizations();
          },
          error: err =>
            this.snackBar.open(err.error?.message ?? 'Failed to create organization', 'Dismiss', { duration: 4000 })
        });
    });
  }

  openEditDialog(org: OrganizationResponse): void {
    const ref = this.dialog.open(OrganizationFormComponent, {
      width: '500px',
      data: { mode: 'edit', organization: org } satisfies OrgFormDialogData
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: OrgFormResult | null) => {
      if (!result) return;
      this.orgService.updateOrganization(org.id, result)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Organization updated', 'Dismiss', { duration: 3000 });
            this.loadOrganizations();
          },
          error: err =>
            this.snackBar.open(err.error?.message ?? 'Failed to update organization', 'Dismiss', { duration: 4000 })
        });
    });
  }

  confirmDelete(org: OrganizationResponse): void {
    const data: ConfirmDialogData = {
      header: 'Delete Organization',
      message: `Delete "${org.name}"? This cannot be undone.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel'
    };

    this.dialog.open(ConfirmDialogComponent, { data, width: '360px' })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.orgService.deleteOrganization(org.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Organization deleted', 'Dismiss', { duration: 3000 });
              this.loadOrganizations();
            },
            error: err =>
              this.snackBar.open(err.error?.message ?? 'Failed to delete', 'Dismiss', { duration: 4000 })
          });
      });
  }

  toggleActivation(org: OrganizationResponse): void {
    const action$ = org.active
      ? this.orgService.deactivateOrganization(org.id)
      : this.orgService.activateOrganization(org.id);

    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open(
          org.active ? 'Organization deactivated' : 'Organization activated',
          'Dismiss',
          { duration: 3000 }
        );
        this.loadOrganizations();
      },
      error: err =>
        this.snackBar.open(err.error?.message ?? 'Action failed', 'Dismiss', { duration: 4000 })
    });
  }

  viewOrg(id: number): void {
    this.router.navigate(['/organizations', id]);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  ngOnDestroy(): void {
    this.tl?.kill();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
