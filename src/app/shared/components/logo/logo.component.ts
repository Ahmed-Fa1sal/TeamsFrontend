import { Component, Input } from '@angular/core';

/**
 * Reusable brand logo.
 *
 * @example
 * <!-- Default wordmark, 32 px tall -->
 * <app-logo />
 *
 * <!-- White wordmark for dark navbars -->
 * <app-logo variant="wordmark_white" [height]="32" />
 *
 * <!-- Square icon mark only -->
 * <app-logo variant="icon" [height]="36" />
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <img
      [src]="'assets/logo/teams_app_' + variant + '.svg'"
      alt="Teams App"
      [style.height.px]="height"
      style="width: auto; display: block;"
    />
  `
})
export class LogoComponent {
  @Input() variant: 'icon' | 'wordmark' | 'wordmark_white' = 'wordmark';
  @Input() height = 32;
}
