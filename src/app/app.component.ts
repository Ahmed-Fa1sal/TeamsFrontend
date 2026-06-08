/**
 * Application Root Component
 * Main component that bootstraps the entire application
 */

import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ScrollbarComponent } from './shared/components/scrollbar/scrollbar.component';
import { LoadingService } from '@core/services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ScrollbarComponent, NgIf, AsyncPipe, MatProgressSpinnerModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  readonly isLoading$ = inject(LoadingService).isLoading$;
  title = 'Teams Frontend';
}
