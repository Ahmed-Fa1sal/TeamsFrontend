/**
 * Application Root Component
 * Main component that bootstraps the entire application
 */

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScrollbarComponent } from './shared/components/scrollbar/scrollbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ScrollbarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Teams Frontend';
}
