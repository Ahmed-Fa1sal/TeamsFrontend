import { Component, Input } from '@angular/core';

/**
 * Renders one or more shimmer-animated placeholder bars.
 *
 * Usage examples:
 *   <!-- single bar -->
 *   <app-skeleton />
 *
 *   <!-- avatar circle + two text bars -->
 *   <app-skeleton [avatar]="true" [lines]="2" />
 *
 *   <!-- table row: icon column + three bars -->
 *   <app-skeleton type="table-row" />
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  templateUrl: './skeleton.component.html',
  styleUrls: ['./skeleton.component.css'],
  host: { 'aria-hidden': 'true' }
})
export class SkeletonComponent {
  @Input() lines = 1;
  @Input() avatar = false;
  /** 'bar' = stacked text bars; 'table-row' = cell-sized blocks in a row */
  @Input() type: 'bar' | 'table-row' = 'bar';
  @Input() height = '14px';
  @Input() width = '100%';

  get linesArray(): number[] {
    return Array.from({ length: this.lines }, (_, i) => i);
  }
}
