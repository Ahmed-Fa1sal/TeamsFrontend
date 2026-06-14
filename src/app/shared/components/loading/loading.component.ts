import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import gsap from 'gsap';
import { LoadingService } from '@core/services/loading.service';
import { REDUCED_MOTION } from '@core/animations/page-animations';

@Component({
  selector: 'app-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.css']
})
export class LoadingComponent implements OnInit, OnDestroy {
  @ViewChild('overlay', { static: true }) private overlayRef!: ElementRef<HTMLDivElement>;
  @ViewChild('spinnerWrap', { static: true }) private spinnerRef!: ElementRef<HTMLDivElement>;

  private readonly loadingService = inject(LoadingService);
  private readonly destroy$ = new Subject<void>();
  private outTl?: gsap.core.Timeline;

  ngOnInit(): void {
    this.loadingService.isLoading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      if (loading) this.animateIn();
      else this.animateOut();
    });
  }

  private animateIn(): void {
    this.outTl?.kill();
    const overlay = this.overlayRef.nativeElement;
    const spinner = this.spinnerRef.nativeElement;
    overlay.style.display = 'flex';

    if (REDUCED_MOTION) {
      gsap.set(overlay, { opacity: 1 });
      return;
    }

    gsap.fromTo(overlay,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: 'power2.out' }
    );
    gsap.fromTo(spinner,
      { scale: 0.8 },
      { scale: 1, duration: 0.35, ease: 'back.out(1.7)' }
    );
  }

  private animateOut(): void {
    const overlay = this.overlayRef.nativeElement;
    if (overlay.style.display === 'none') return;

    if (REDUCED_MOTION) {
      overlay.style.display = 'none';
      return;
    }

    this.outTl = gsap.timeline().to(overlay, {
      opacity: 0,
      duration: 0.2,
      onComplete: () => { overlay.style.display = 'none'; }
    });
  }

  ngOnDestroy(): void {
    this.outTl?.kill();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
