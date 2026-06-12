import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationService } from '../notification.service';
import { Notification } from '../notification.model';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.css']
})
export class NotificationPanelComponent implements OnInit {
  readonly notifService = inject(NotificationService);

  readonly notifications$ = this.notifService.notifications$;
  readonly loading$ = this.notifService.loading$;

  ngOnInit(): void {
    this.notifService.loadAll();
  }

  trackById(_: number, n: Notification): string {
    return n.id;
  }

  onMarkRead(n: Notification): void {
    if (!n.isRead) {
      this.notifService.markAsRead(n.id);
    }
  }

  onMarkAllRead(): void {
    this.notifService.markAllAsRead();
  }

  onDelete(n: Notification, event: Event): void {
    event.stopPropagation();
    this.notifService.delete(n.id);
  }
}
