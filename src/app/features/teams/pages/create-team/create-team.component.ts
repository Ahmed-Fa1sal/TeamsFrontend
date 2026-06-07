import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import gsap from 'gsap';

import { HttpErrorResponse } from '@angular/common/http';

import { TeamManagementFetcherService } from '../../services/team-management-fetcher.service';
import { CreateTeamRequest } from '../../models/team.models';

@Component({
  selector: 'app-create-team',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
  ],
  templateUrl: './create-team.component.html',
  styleUrl: './create-team.component.css',
})
export class CreateTeamComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isSubmitting = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly teamService: TeamManagementFetcherService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: [''],
      imageUrl: [''],
      isPublic: [true],
      // TODO: replace hardcoded organization_id with real organization selection/current organization API
      organization_id: [1, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      gsap.from('.page-card', { y: 24, opacity: 0, duration: 0.4, ease: 'power2.out' });
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const v = this.form.value as {
      name: string;
      description: string;
      imageUrl: string;
      isPublic: boolean;
      organization_id: number;
    };

    const request: CreateTeamRequest = {
      name: v.name.trim(),
      ...(v.description?.trim() && { description: v.description.trim() }),
      ...(v.imageUrl?.trim()    && { imageUrl:     v.imageUrl.trim() }),
      isPublic: v.isPublic,
      // TODO: replace hardcoded organization_id with real organization selection/current organization API
      organization_id: Number(v.organization_id),
    };

    this.teamService
      .createTeam(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: team => {
          this.snackBar.open(`"${team.name}" created successfully.`, 'Dismiss', { duration: 3000 });
          this.router.navigate(['/teams', team.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting = false;
          const msg = this.describeError(err);
          this.snackBar.open(msg, 'Dismiss', { duration: 6000 });
        },
      });
  }

  onCancel(): void {
    this.router.navigate(['/home']);
  }

  private describeError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Cannot reach the server (http://localhost:8080). Is the backend running?';
    }
    const serverMsg: string | undefined =
      err.error?.message ?? err.error?.error ?? err.message;
    return `Error ${err.status}: ${serverMsg ?? 'Unexpected server error.'}`;
  }
}
