import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-form-error',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf],
  template: `<p class="form-error" *ngIf="message">{{ message }}</p>`,
  styles: [`.form-error { color: #d32f2f; font-size: 0.8rem; margin: 4px 0 0; }`]
})
export class FormErrorComponent {
  @Input() message: string | null = null;
}
