import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject, EMPTY, forkJoin, Observable, Subject,
  fromEvent, of, timer
} from 'rxjs';
import {
  catchError, distinctUntilChanged, map,
  retry, shareReplay, startWith, switchMap, tap, takeUntil
} from 'rxjs/operators';
import { NotificationFetcherService } from './notification-fetcher.service';
import { Notification, NotificationPage, UnreadCountResponse } from './notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly fetcher = inject(NotificationFetcherService);

  // Tracks the last successfully fetched count for use as a fallback on error
  private lastKnownCount = 0;

  private readonly _unreadCount = new BehaviorSubject<number>(0);
  private readonly _notifications = new BehaviorSubject<Notification[]>([]);
  private readonly _unreadNotifications = new BehaviorSubject<Notification[]>([]);
  private readonly _loading = new BehaviorSubject<boolean>(false);
  private readonly _newNotifications = new Subject<Notification[]>();
  private lastKnownNotificationIds = new Set<string>();

  // Subject that tears down the polling subscription when stopPolling() is called
  private readonly pollingStop$ = new Subject<void>();

  // shareReplay(1): all badge subscribers share a single emitted value,
  // not a new HTTP request per subscriber.
  readonly unreadCount$: Observable<number> =
    this._unreadCount.asObservable().pipe(shareReplay(1));

  readonly notifications$: Observable<Notification[]> =
    this._notifications.asObservable();

  readonly unreadNotifications$: Observable<Notification[]> =
    this._unreadNotifications.asObservable();

  readonly newNotifications$: Observable<Notification[]> =
    this._newNotifications.asObservable();

  readonly loading$: Observable<boolean> =
    this._loading.asObservable();

  private pollingActive = false;

  /**
   * Starts the unread-count poll. Safe to call multiple times — subsequent
   * calls are no-ops once polling is active.
   *
   * Pauses automatically when the tab is hidden and resumes (with an
   * immediate fetch) when it becomes visible again.
   */
  startPolling(): void {
    if (this.pollingActive) return;
    this.pollingActive = true;

    fromEvent(document, 'visibilitychange').pipe(
      map(() => document.visibilityState === 'visible'),
      startWith(true),
      distinctUntilChanged(),
      // Switch to a timer (immediate + every 60 s) when visible; EMPTY when hidden
      switchMap(visible => visible ? timer(0, 60_000) : EMPTY),
      switchMap(() => {
        const emptyPage: NotificationPage = {
          content: [],
          page: 0,
          size: 0,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
        };

        return forkJoin({
          count: this.fetcher.getUnreadCount().pipe(
            retry({ count: 2, delay: () => timer(5_000) }),
            catchError(() => of({ count: this.lastKnownCount } as UnreadCountResponse))
          ),
          unread: this.fetcher.getUnread(0, 20).pipe(
            retry({ count: 2, delay: () => timer(5_000) }),
            catchError(() => of(emptyPage))
          )
        }).pipe(
          catchError(() => of({
            count: { count: this.lastKnownCount },
            unread: emptyPage,
          }))
        );
      }),
      tap(res => { this.lastKnownCount = res.count.count; }),
      takeUntil(this.pollingStop$)
    ).subscribe(res => {
      this._unreadCount.next(res.count.count);
      this._unreadNotifications.next(res.unread.content);

      const newItems = res.unread.content.filter(n => !this.lastKnownNotificationIds.has(n.id));
      if (newItems.length) {
        this._newNotifications.next(newItems);
      }
      this.lastKnownNotificationIds = new Set(res.unread.content.map(n => n.id));
    });
  }

  /** Stops the polling subscription. Polling can be restarted with startPolling(). */
  stopPolling(): void {
    this.pollingActive = false;
    this.pollingStop$.next();
  }

  loadAll(page = 0, size = 20): void {
    this._loading.next(true);
    this.fetcher.getAll(page, size).pipe(
      catchError(() => {
        this._loading.next(false);
        return EMPTY;
      })
    ).subscribe((res: NotificationPage) => {
      this._notifications.next(res.content);
      this._loading.next(false);
    });
  }

  markAsRead(id: string): void {
    const current = this._notifications.getValue();
    const target = current.find(n => n.id === id);
    if (!target || target.isRead) return;

    // Optimistic update — don't wait for the HTTP round-trip
    this._notifications.next(current.map(n => n.id === id ? { ...n, isRead: true } : n));
    const newCount = Math.max(0, this.lastKnownCount - 1);
    this.lastKnownCount = newCount;
    this._unreadCount.next(newCount);

    this.fetcher.markAsRead(id).pipe(catchError(() => EMPTY)).subscribe();
  }

  /**
   * Zeroes the badge immediately (optimistic) then fires the HTTP call.
   * Call this when the notification panel is opened.
   */
  markAllAsRead(): void {
    this.lastKnownCount = 0;
    this._unreadCount.next(0);
    this._unreadNotifications.next([]);
    this.lastKnownNotificationIds.clear();
    this._notifications.next(
      this._notifications.getValue().map(n => ({ ...n, isRead: true }))
    );

    this.fetcher.markAllAsRead().pipe(catchError(() => EMPTY)).subscribe();
  }

  delete(id: string): void {
    const current = this._notifications.getValue();
    const target = current.find(n => n.id === id);
    this._notifications.next(current.filter(n => n.id !== id));

    if (target && !target.isRead) {
      const newCount = Math.max(0, this.lastKnownCount - 1);
      this.lastKnownCount = newCount;
      this._unreadCount.next(newCount);
    }

    this.fetcher.delete(id).pipe(catchError(() => EMPTY)).subscribe();
  }
}
