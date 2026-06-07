import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import gsap from 'gsap';

@Component({
  selector: 'app-scrollbar',
  standalone: true,
  imports: [],
  template: `
    <div class="sb-track" #track (click)="onTrackClick($event)">
      <div class="sb-thumb" #thumb (mousedown)="onThumbDown($event)"></div>
    </div>
  `,
  styles: [`
    .sb-track {
      position: fixed;
      right: 4px;
      top: 8px;
      bottom: 8px;
      width: 6px;
      border-radius: 99px;
      z-index: 9999;
      cursor: pointer;
    }

    .sb-thumb {
      position: absolute;
      left: 0;
      width: 6px;
      min-height: 30px;
      border-radius: 99px;
      background: rgba(0, 0, 0, 0.22);
      cursor: grab;
      will-change: transform;
      transition: background 0.15s ease;
    }

    .sb-track:hover .sb-thumb {
      background: rgba(0, 0, 0, 0.38);
    }

    .sb-thumb.is-dragging {
      background: rgba(0, 0, 0, 0.5) !important;
      cursor: grabbing;
    }
  `],
})
export class ScrollbarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('track') private readonly trackRef!: ElementRef<HTMLDivElement>;
  @ViewChild('thumb') private readonly thumbRef!: ElementRef<HTMLDivElement>;

  private thumbH = 0;
  private trackH = 0;

  private dragging = false;
  private dragStartY = 0;
  private dragStartScrollTop = 0;

  // proxy object for GSAP smooth-scroll (no plugin needed)
  private readonly scrollProxy = { y: 0 };

  private readonly handleScroll = () => this.sync();
  private readonly handleResize  = () => this.sync();
  private readonly handleMouseMove = (e: MouseEvent) => this.onDragMove(e);
  private readonly handleMouseUp   = () => this.onDragEnd();

  ngAfterViewInit(): void {
    window.addEventListener('scroll',   this.handleScroll,    { passive: true });
    window.addEventListener('resize',   this.handleResize,    { passive: true });
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup',   this.handleMouseUp);

    this.sync();

    // entrance: slide in from the right
    gsap.fromTo(
      this.trackRef.nativeElement,
      { opacity: 0, x: 10 },
      { opacity: 1, x: 0, duration: 0.5, delay: 0.4, ease: 'power2.out' },
    );
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll',   this.handleScroll);
    window.removeEventListener('resize',   this.handleResize);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup',   this.handleMouseUp);
  }

  // ── sync thumb size + position ────────────────────────────────────────────

  private sync(): void {
    const track = this.trackRef?.nativeElement;
    const thumb = this.thumbRef?.nativeElement;
    if (!track || !thumb) return;

    const scrollTop    = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    if (scrollHeight <= clientHeight) {
      gsap.set(track, { opacity: 0 });
      return;
    }

    gsap.set(track, { opacity: 1 });

    this.trackH = track.clientHeight;
    this.thumbH = Math.max(30, (clientHeight / scrollHeight) * this.trackH);
    const maxY   = this.trackH - this.thumbH;
    const thumbY = (scrollTop / (scrollHeight - clientHeight)) * maxY;

    gsap.set(thumb, { height: this.thumbH, y: thumbY });
  }

  // ── click on track → smooth scroll ───────────────────────────────────────

  onTrackClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('sb-thumb')) return;

    const trackRect = this.trackRef.nativeElement.getBoundingClientRect();
    const clickY    = e.clientY - trackRect.top;
    const ratio     = Math.max(0, Math.min(1,
      (clickY - this.thumbH / 2) / (this.trackH - this.thumbH),
    ));
    const target = ratio * (document.documentElement.scrollHeight - window.innerHeight);

    // GSAP proxy — animates window.scrollY without ScrollToPlugin
    this.scrollProxy.y = window.scrollY;
    gsap.to(this.scrollProxy, {
      y: target,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => window.scrollTo(0, this.scrollProxy.y),
    });
  }

  // ── drag thumb ────────────────────────────────────────────────────────────

  onThumbDown(e: MouseEvent): void {
    e.preventDefault();
    this.dragging           = true;
    this.dragStartY         = e.clientY;
    this.dragStartScrollTop = window.scrollY;
    this.thumbRef.nativeElement.classList.add('is-dragging');
  }

  private onDragMove(e: MouseEvent): void {
    if (!this.dragging) return;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const ratio        = (scrollHeight - clientHeight) / (this.trackH - this.thumbH);
    window.scrollTo(0, this.dragStartScrollTop + (e.clientY - this.dragStartY) * ratio);
  }

  private onDragEnd(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.thumbRef.nativeElement.classList.remove('is-dragging');
  }
}
