import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable } from 'rxjs';

const SHOW_DELAY_MS = 200;
const SAFETY_TIMEOUT_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly snackBar = inject(MatSnackBar);

  private activeRequests = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  get isLoading$(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  show(): void {
    this.activeRequests += 1;
    if (this.activeRequests === 1 && !this.showTimer) {
      // 200 ms debounce — requests faster than this never flash the overlay
      this.showTimer = setTimeout(() => {
        this.showTimer = null;
        if (this.activeRequests > 0) {
          this.loadingSubject.next(true);
          this.startSafetyTimer();
        }
      }, SHOW_DELAY_MS);
    }
  }

  hide(): void {
    if (this.activeRequests <= 0) return;
    this.activeRequests -= 1;
    if (this.activeRequests === 0) {
      this.clearTimers();
      this.loadingSubject.next(false);
    }
  }

  /**
   * Hard cap: the blocking overlay never stays up longer than 5 s.
   * If requests are still pending after that, switch to a non-blocking
   * "Still working…" snackbar so the user is informed but not locked out.
   */
  private startSafetyTimer(): void {
    if (this.safetyTimer !== null) clearTimeout(this.safetyTimer);
    this.safetyTimer = setTimeout(() => {
      this.safetyTimer = null;
      if (this.activeRequests > 0 && this.loadingSubject.getValue()) {
        this.loadingSubject.next(false);
        this.snackBar.open('Still working…', undefined, { duration: 3000 });
      }
    }, SAFETY_TIMEOUT_MS);
  }

  private clearTimers(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.safetyTimer !== null) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }
}
