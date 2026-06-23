import { Injectable, OnDestroy, inject } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, takeUntil } from 'rxjs/operators';
import { AuthService } from '@features/auth/services/auth.service';
import { API_CONFIG } from '@core/config/api.config';

@Injectable({ providedIn: 'root' })
export class ChatWebSocketService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private client: Client | null = null;
  // The JWT that was used to build the current STOMP client.
  // Any change means the authenticated identity has changed and the client must be rebuilt.
  private activeToken: string | null = null;
  private readonly connected$ = new BehaviorSubject<boolean>(false);
  private readonly destroy$ = new Subject<void>();

  readonly isConnected$ = this.connected$.asObservable();

  constructor() {
    // React to auth-state changes so the WebSocket is never left alive after
    // logout. When the token is cleared (null), destroyClient() runs immediately,
    // before the next user's login has a chance to call getOrCreateClient().
    this.authService.getAuthState().pipe(
      map(state => state.token),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(token => {
      if (!token) {
        this.destroyClient();
      }
    });
  }

  /**
   * Subscribes to incoming messages for a conversation.
   * Automatically resubscribes after a STOMP reconnect.
   * Caller must unsubscribe (via takeUntil / destroy$) to release the topic.
   */
  subscribeToConversation(conversationId: number): Observable<unknown> {
    const client = this.getOrCreateClient();
    const topic = `/topic/conversations/${conversationId}`;
    console.log('[WS] subscribing to topic:', topic);

    return new Observable(observer => {
      let stompSub: StompSubscription | null = null;

      const resubscribe = (): void => {
        stompSub?.unsubscribe();
        console.log('[WS] (re)subscribing to', topic);
        stompSub = client.subscribe(topic, (msg: IMessage) => {
          console.log('[WS] message received on', topic, msg.body);
          try { observer.next(JSON.parse(msg.body) as unknown); }
          catch { observer.next(msg.body); }
        });
      };

      const connectSub = this.connected$.pipe(filter(Boolean)).subscribe(() => resubscribe());
      return () => { connectSub.unsubscribe(); stompSub?.unsubscribe(); };
    });
  }

  /**
   * Publishes a message to the conversation.
   * Throws if not connected — caller should fall back to HTTP.
   */
  sendToConversation(conversationId: number, body: object): void {
    const dest = `/app/conversations/${conversationId}/send`;
    console.log('[WS] publishing to', dest, body);
    const client = this.getOrCreateClient();
    client.publish({ destination: dest, body: JSON.stringify(body) });
  }

  get isConnected(): boolean {
    return this.connected$.value;
  }

  /** Pre-warm the connection so it is ready when the user first sends. */
  connect(): void {
    this.getOrCreateClient();
  }

  /**
   * Tears down the STOMP client and marks the connection as closed.
   * Call this on logout so the next user cannot reuse a client that carries
   * a previous user's JWT in its STOMP CONNECT headers.
   */
  disconnect(): void {
    this.destroyClient();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyClient();
  }

  private getOrCreateClient(): Client {
    const token = this.authService.getToken();

    // If the stored token differs from what the live client was built with,
    // tear it down. This is the second line of defence after the reactive
    // subscription above: it catches the edge case where connect() / send()
    // is called with a new token before the subscription fires.
    if (this.client && token !== this.activeToken) {
      console.warn('[WS] token changed — rebuilding STOMP client');
      this.destroyClient();
    }

    if (this.client) return this.client;

    const wsUrl = `${API_CONFIG.BASE_URL}/ws`;
    this.activeToken = token;
    console.log('[WS] creating STOMP client | url:', wsUrl, '| token present:', !!token);
    this.client = new Client({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webSocketFactory: () => new (SockJS as any)(wsUrl) as WebSocket,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('[WS] STOMP connected ✓');
        this.connected$.next(true);
      },
      onDisconnect: () => {
        console.warn('[WS] STOMP disconnected');
        this.connected$.next(false);
      },
      onStompError: frame => {
        console.error('[WS] STOMP broker error:', frame.headers?.['message'], frame);
        this.connected$.next(false);
      },
    });
    this.client.activate();
    return this.client;
  }

  private destroyClient(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.activeToken = null;
    this.connected$.next(false);
  }
}
