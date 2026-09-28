import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Inject,
  Injectable,
  Injector,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { Socket, SocketOptions } from 'socket.io-client';
import { EMPTY, Observable, Subject, defer, share } from 'rxjs';
import type { SocketIoConfig } from './socket-io.config';
import {
  SOCKET_IO_CLIENT_FACTORY,
  SOCKET_IO_CONFIG,
  getNamedSocketIoToken,
  resolveSocketIoUrl,
  type SocketIoClientFactory,
} from './socket-io.tokens';
import type {
  DefaultEventsMap,
  EmitAckArgs,
  EmitAckResult,
  EmitEventArgs,
  EventNames,
  EventsMap,
  ListenEventPayload,
  SocketConnectionState,
} from './socket-io.types';

/**
 * Angular-friendly wrapper around the official Socket.IO client.
 *
 * Prefer `provideSocketIo` / `SocketIoModule.forRoot` so configuration is available.
 * Use {@link injectSocketIo} when you need strongly typed event maps or a named socket.
 *
 * @typeParam ListenEvents - Server-to-client events
 * @typeParam EmitEvents - Client-to-server events
 */
@Injectable()
export class SocketIoService<
  ListenEvents extends EventsMap = DefaultEventsMap,
  EmitEvents extends EventsMap = ListenEvents,
> {
  private readonly namespaces = new Map<string, SocketIoService>();
  private socket: Socket<ListenEvents, EmitEvents> | null = null;
  private destroyed = false;
  private readonly isBrowser: boolean;
  private readonly platformId: object;
  private readonly injector: Injector;
  private config: SocketIoConfig;

  private readonly eventStreams = new Map<string, Observable<unknown>>();
  /** Notifies {@link fromEvent} subscribers to re-attach after {@link recreateSocket}. */
  private readonly socketRecreated$ = new Subject<void>();

  private connectSubject?: Subject<void>;
  private disconnectSubject?: Subject<string>;
  private connectErrorSubject?: Subject<Error>;
  private errorSubject?: Subject<Error>;
  private reconnectAttemptSubject?: Subject<number>;
  private reconnectSubject?: Subject<number>;
  private reconnectErrorSubject?: Subject<Error>;
  private reconnectFailedSubject?: Subject<void>;

  /** Whether the socket is currently connected (Angular Signal). */
  readonly connected = signal(false);

  /** Whether the last successful connect recovered a previous session. */
  readonly recovered = signal(false);

  /** Current connection state (Angular Signal — source of truth). */
  readonly connectionState = signal<SocketConnectionState>('disconnected');

  /** Observable mirror of {@link connectionState}. */
  readonly connectionState$: Observable<SocketConnectionState>;

  /** Observable mirror of {@link connected}. */
  readonly connected$: Observable<boolean>;

  /**
   * Emits on every successful connect, including an immediate value when already connected.
   * Fixes the common race where subscribers miss the first `connect` event.
   */
  readonly connect$: Observable<void> = new Observable<void>((subscriber) => {
    if (this.socket?.connected) {
      subscriber.next();
    }
    return this.ensureConnectSubject().subscribe(subscriber);
  });

  readonly disconnect$ = defer(() => this.ensureDisconnectSubject().asObservable());
  readonly connectError$ = defer(() => this.ensureConnectErrorSubject().asObservable());
  readonly error$ = defer(() => this.ensureErrorSubject().asObservable());
  readonly reconnectAttempt$ = defer(() => this.ensureReconnectAttemptSubject().asObservable());
  readonly reconnect$ = defer(() => this.ensureReconnectSubject().asObservable());
  readonly reconnectError$ = defer(() => this.ensureReconnectErrorSubject().asObservable());
  readonly reconnectFailed$ = defer(() => this.ensureReconnectFailedSubject().asObservable());

  constructor(
    @Inject(SOCKET_IO_CONFIG) config: SocketIoConfig,
    @Inject(PLATFORM_ID) platformId: object,
    private readonly destroyRef: DestroyRef,
    @Inject(SOCKET_IO_CLIENT_FACTORY) private readonly clientFactory: SocketIoClientFactory,
    injector: Injector,
  ) {
    this.config = { ...config, options: { ...config.options } };
    this.platformId = platformId;
    this.injector = injector;
    this.isBrowser = isPlatformBrowser(platformId);
    this.connectionState$ = toObservable(this.connectionState, { injector });
    this.connected$ = toObservable(this.connected, { injector });
    this.destroyRef.onDestroy(() => this.destroy());

    if (this.isBrowser && this.config.autoConnect !== false) {
      this.createSocket(true);
    }
  }

  /**
   * Opens the connection. Safe to call multiple times.
   * No-op during SSR.
   */
  connect(): void {
    this.assertNotDestroyed();
    if (!this.isBrowser) {
      return;
    }

    const socket = this.ensureSocket(false);
    if (!socket.connected) {
      this.setConnectionState('connecting');
      socket.connect();
    }
  }

  /**
   * Closes the connection without disposing the client instance.
   * Call {@link connect} again to reconnect. No-op during SSR.
   */
  disconnect(): void {
    if (!this.isBrowser || !this.socket) {
      return;
    }

    this.socket.disconnect();
    this.connected.set(false);
    this.setConnectionState('disconnected');
  }

  /**
   * Alias of {@link connect}.
   */
  open(): void {
    this.connect();
  }

  /**
   * Alias of {@link disconnect}.
   */
  close(): void {
    this.disconnect();
  }

  /**
   * Returns whether the underlying socket reports as connected.
   */
  isConnected(): boolean {
    return this.socket?.connected === true;
  }

  /**
   * Emits an event to the server.
   * Creates the client if needed. When `autoConnect` is enabled and the socket is
   * disconnected, a connection attempt is started so emits are not dropped silently.
   */
  emit<Ev extends EventNames<EmitEvents>>(event: Ev, ...args: EmitEventArgs<EmitEvents, Ev>): void {
    this.assertNotDestroyed();
    if (!this.isBrowser) {
      return;
    }

    const shouldAutoConnect = this.config.autoConnect !== false;
    const socket = this.ensureSocket(shouldAutoConnect);
    if (shouldAutoConnect && !socket.connected && !socket.active) {
      socket.connect();
    }

    Reflect.apply(socket.emit as unknown as (...payload: unknown[]) => unknown, socket, [
      event,
      ...args,
    ]);
  }

  /**
   * Emits an event and resolves with the server acknowledgement.
   *
   * @example
   * ```ts
   * const reply = await socket.emitWithAck('hello', 'world');
   * const timed = await socket.timeout(1000).emitWithAck('hello', 'world');
   * ```
   */
  emitWithAck<Ev extends EventNames<EmitEvents>>(
    event: Ev,
    ...args: EmitAckArgs<EmitEvents, Ev>
  ): Promise<EmitAckResult<EmitEvents, Ev>> {
    this.assertNotDestroyed();
    if (!this.isBrowser) {
      return Promise.reject(
        new Error('ngxsmk-socket-io: emitWithAck() is only available in the browser.'),
      );
    }

    const socket = this.ensureSocket(this.config.autoConnect !== false);
    return (
      socket.emitWithAck as unknown as (
        ev: string,
        ...rest: unknown[]
      ) => Promise<EmitAckResult<EmitEvents, Ev>>
    )(event as string, ...(args as unknown[]));
  }

  /**
   * Returns emit helpers with an acknowledgement timeout applied.
   */
  timeout(ms: number): {
    emit: <Ev extends EventNames<EmitEvents>>(
      event: Ev,
      ...args: EmitEventArgs<EmitEvents, Ev>
    ) => void;
    emitWithAck: <Ev extends EventNames<EmitEvents>>(
      event: Ev,
      ...args: EmitAckArgs<EmitEvents, Ev>
    ) => Promise<EmitAckResult<EmitEvents, Ev>>;
  } {
    this.assertNotDestroyed();

    return {
      emit: (event, ...args) => {
        this.assertNotDestroyed();
        if (!this.isBrowser) {
          return;
        }
        const socket = this.ensureSocket(this.config.autoConnect !== false);
        const timed = socket.timeout(ms) as unknown as {
          emit(ev: string, ...rest: unknown[]): unknown;
        };
        timed.emit(event as string, ...(args as unknown[]));
      },
      emitWithAck: (event, ...args) => {
        this.assertNotDestroyed();
        if (!this.isBrowser) {
          return Promise.reject(
            new Error('ngxsmk-socket-io: emitWithAck() is only available in the browser.'),
          );
        }
        const socket = this.ensureSocket(this.config.autoConnect !== false);
        const timed = socket.timeout(ms) as unknown as {
          emitWithAck(ev: string, ...rest: unknown[]): Promise<unknown>;
        };
        return timed.emitWithAck(event as string, ...(args as unknown[])) as Promise<
          EmitAckResult<EmitEvents, typeof event>
        >;
      },
    };
  }

  /**
   * Creates a lazy Observable for a Socket.IO event.
   * Shared across subscribers; the native listener is removed when the last subscriber unsubscribes.
   *
   * For the reserved `connect` event, subscribers receive an immediate emission when
   * the socket is already connected (avoids missing the initial connect).
   */
  fromEvent<Ev extends EventNames<ListenEvents>>(
    event: Ev,
  ): Observable<ListenEventPayload<ListenEvents, Ev>>;
  fromEvent<T>(event: string): Observable<T>;
  fromEvent(event: string): Observable<unknown> {
    this.assertNotDestroyed();

    if (!this.isBrowser) {
      return EMPTY;
    }

    let stream = this.eventStreams.get(event);
    if (!stream) {
      stream = new Observable<unknown>((subscriber) => {
        const handler = (...payload: unknown[]) => {
          subscriber.next(payload.length <= 1 ? payload[0] : payload);
        };

        let attached: {
          on(eventName: string, listener: (...args: unknown[]) => void): void;
          off(eventName: string, listener: (...args: unknown[]) => void): void;
          connected: boolean;
        } | null = null;

        const detach = () => {
          if (attached) {
            attached.off(event, handler);
            attached = null;
          }
        };

        const attach = () => {
          if (this.destroyed) {
            return;
          }

          const socket = this.ensureSocket(this.config.autoConnect !== false) as unknown as {
            on(eventName: string, listener: (...args: unknown[]) => void): void;
            off(eventName: string, listener: (...args: unknown[]) => void): void;
            connected: boolean;
          };

          if (attached === socket) {
            return;
          }

          detach();
          attached = socket;
          socket.on(event, handler);

          // Replay connect for late subscribers (ngx-socket-io #167).
          if (event === 'connect' && socket.connected) {
            subscriber.next(undefined);
          }
        };

        attach();
        const recreatedSub = this.socketRecreated$.subscribe(() => attach());

        return () => {
          recreatedSub.unsubscribe();
          detach();
        };
      }).pipe(
        share({
          resetOnRefCountZero: true,
        }),
      );

      this.eventStreams.set(event, stream);
    }

    return stream;
  }

  /**
   * Alias of {@link fromEvent}.
   */
  on<Ev extends EventNames<ListenEvents>>(
    event: Ev,
  ): Observable<ListenEventPayload<ListenEvents, Ev>>;
  on<T>(event: string): Observable<T>;
  on(event: string): Observable<unknown> {
    return this.fromEvent(event);
  }

  /**
   * Emits the next occurrence of an event, then completes.
   * For `connect`, completes immediately when already connected.
   */
  once<Ev extends EventNames<ListenEvents>>(
    event: Ev,
  ): Observable<ListenEventPayload<ListenEvents, Ev>>;
  once<T>(event: string): Observable<T>;
  once(event: string): Observable<unknown> {
    this.assertNotDestroyed();

    if (!this.isBrowser) {
      return EMPTY;
    }

    return defer(() => {
      const socket = this.ensureSocket(this.config.autoConnect !== false);
      return new Observable<unknown>((subscriber) => {
        if (event === 'connect' && socket.connected) {
          subscriber.next(undefined);
          subscriber.complete();
          return;
        }

        const handler = (...payload: unknown[]) => {
          subscriber.next(payload.length <= 1 ? payload[0] : payload);
          subscriber.complete();
        };

        const untyped = socket as unknown as {
          once(eventName: string, listener: (...args: unknown[]) => void): void;
          off(eventName: string, listener: (...args: unknown[]) => void): void;
        };

        untyped.once(event, handler);

        return () => {
          untyped.off(event, handler);
        };
      });
    });
  }

  /**
   * Removes all listeners for an event on the underlying socket.
   * Also clears the cached shared Observable for that event.
   */
  off(event: string): void {
    this.eventStreams.delete(event);
    const socket = this.socket as unknown as {
      removeAllListeners(event?: string): void;
    } | null;
    socket?.removeAllListeners(event);
  }

  /**
   * Removes listeners for one event, or all user listeners when omitted.
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.off(event);
      return;
    }

    this.eventStreams.clear();
    this.socket?.removeAllListeners();
  }

  /**
   * Updates authentication credentials used on the next (re)connection.
   * Does not log or persist credentials.
   */
  setAuth(auth: SocketOptions['auth']): void {
    this.assertNotDestroyed();
    if (!this.isBrowser) {
      return;
    }

    const socket = this.ensureSocket(false);
    socket.auth = auth ?? {};
  }

  /**
   * Updates auth and (re)connects. Useful after async login (#166 / #137).
   */
  authenticateAndConnect(auth: SocketOptions['auth']): void {
    this.setAuth(auth);
    if (this.isConnected()) {
      this.disconnect();
    }
    this.connect();
  }

  /**
   * Returns a socket bound to another namespace, reusing the same host/options.
   * Empty or `/` returns this instance.
   */
  of(namespace: string): SocketIoService {
    this.assertNotDestroyed();

    if (!namespace || namespace === '/') {
      return this as SocketIoService;
    }

    const normalized = namespace.startsWith('/') ? namespace : `/${namespace}`;
    const existing = this.namespaces.get(normalized);
    if (existing) {
      return existing;
    }

    const childConfig: SocketIoConfig = {
      ...this.config,
      namespace: normalized,
      url: this.config.url,
    };

    const child = new SocketIoService(
      childConfig,
      this.platformId,
      this.destroyRef,
      this.clientFactory,
      this.injector,
    );
    this.namespaces.set(normalized, child);
    return child;
  }

  /**
   * Returns the native Socket.IO client.
   * Creates the client (without connecting) if it does not exist yet.
   *
   * @throws Error when called outside the browser or after destruction.
   */
  getSocket(): Socket<ListenEvents, EmitEvents> {
    this.assertNotDestroyed();
    if (!this.isBrowser) {
      throw new Error('ngxsmk-socket-io: getSocket() is only available in the browser.');
    }

    return this.ensureSocket(false);
  }

  /**
   * Returns the active configuration (read-only snapshot).
   */
  getConfig(): Readonly<SocketIoConfig> {
    return this.config;
  }

  /**
   * Updates configuration and optionally recreates the underlying client.
   * Useful when URL, namespace, or options are only known after bootstrap.
   *
   * @param partial - Fields to merge into the current config
   * @param options.reconnect - Recreate and connect when true (default). Pass `false` to only store config.
   */
  updateConfig(
    partial: Partial<Omit<SocketIoConfig, '__events'>>,
    options: { reconnect?: boolean } = {},
  ): void {
    this.assertNotDestroyed();

    this.config = {
      ...this.config,
      ...partial,
      options: {
        ...this.config.options,
        ...partial.options,
      },
    };

    if (!this.isBrowser) {
      return;
    }

    const shouldReconnect = options.reconnect !== false;
    if (!shouldReconnect) {
      if (partial.options?.auth !== undefined && this.socket) {
        this.socket.auth = partial.options.auth ?? {};
      }
      return;
    }

    this.recreateSocket(this.config.autoConnect !== false);
  }

  /**
   * Tears down the current client (if any) and creates a fresh one.
   */
  recreateSocket(autoConnect = this.config.autoConnect !== false): void {
    this.assertNotDestroyed();
    if (!this.isBrowser) {
      return;
    }

    this.teardownSocket();
    this.createSocket(autoConnect);
  }

  private ensureSocket(autoConnect: boolean): Socket<ListenEvents, EmitEvents> {
    if (!this.socket) {
      this.createSocket(autoConnect);
    }

    return this.socket as Socket<ListenEvents, EmitEvents>;
  }

  private teardownSocket(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.io.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.setConnectionState('disconnected');
  }

  private createSocket(autoConnect: boolean): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.socket) {
      return;
    }

    const url = resolveSocketIoUrl(this.config);
    const options: Partial<SocketOptions & Record<string, unknown>> = {
      ...this.config.options,
      autoConnect,
    };

    try {
      this.socket = this.clientFactory<ListenEvents, EmitEvents>(url, options);
    } catch (error) {
      this.setConnectionState('error');
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.ensureConnectErrorSubject().next(normalized);
      throw normalized;
    }

    this.bindLifecycle(this.socket);
    this.socketRecreated$.next();

    if (autoConnect) {
      this.recovered.set(!!this.socket.recovered);
      this.setConnectionState(this.socket.connected ? 'connected' : 'connecting');
      this.connected.set(this.socket.connected);
      if (this.socket.connected) {
        this.ensureConnectSubject().next();
      }
    }
  }

  private bindLifecycle(socket: Socket<ListenEvents, EmitEvents>): void {
    socket.on('connect', () => {
      this.connected.set(true);
      this.recovered.set(!!socket.recovered);
      this.setConnectionState('connected');
      this.ensureConnectSubject().next();
    });

    socket.on('disconnect', (reason) => {
      this.connected.set(false);
      this.setConnectionState('disconnected');
      this.ensureDisconnectSubject().next(reason);
    });

    socket.on('connect_error', (error) => {
      this.connected.set(false);
      this.setConnectionState('error');
      this.ensureConnectErrorSubject().next(error);
      this.ensureErrorSubject().next(error);
    });

    const manager = socket.io;

    manager.on('reconnect_attempt', (attempt) => {
      this.setConnectionState('reconnecting');
      this.ensureReconnectAttemptSubject().next(attempt);
    });

    manager.on('reconnect', (attempt) => {
      this.connected.set(true);
      this.recovered.set(!!socket.recovered);
      this.setConnectionState('connected');
      this.ensureReconnectSubject().next(attempt);
    });

    manager.on('reconnect_error', (error) => {
      this.setConnectionState('error');
      this.ensureReconnectErrorSubject().next(error);
      this.ensureErrorSubject().next(error);
    });

    manager.on('reconnect_failed', () => {
      this.connected.set(false);
      this.setConnectionState('error');
      this.ensureReconnectFailedSubject().next();
    });

    manager.on('error', (error) => {
      this.ensureErrorSubject().next(error);
    });
  }

  private setConnectionState(state: SocketConnectionState): void {
    this.connectionState.set(state);
  }

  private ensureConnectSubject(): Subject<void> {
    return (this.connectSubject ??= new Subject<void>());
  }

  private ensureDisconnectSubject(): Subject<string> {
    return (this.disconnectSubject ??= new Subject<string>());
  }

  private ensureConnectErrorSubject(): Subject<Error> {
    return (this.connectErrorSubject ??= new Subject<Error>());
  }

  private ensureErrorSubject(): Subject<Error> {
    return (this.errorSubject ??= new Subject<Error>());
  }

  private ensureReconnectAttemptSubject(): Subject<number> {
    return (this.reconnectAttemptSubject ??= new Subject<number>());
  }

  private ensureReconnectSubject(): Subject<number> {
    return (this.reconnectSubject ??= new Subject<number>());
  }

  private ensureReconnectErrorSubject(): Subject<Error> {
    return (this.reconnectErrorSubject ??= new Subject<Error>());
  }

  private ensureReconnectFailedSubject(): Subject<void> {
    return (this.reconnectFailedSubject ??= new Subject<void>());
  }

  private assertNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error(
        'ngxsmk-socket-io: SocketIoService has been destroyed and can no longer be used.',
      );
    }
  }

  private destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.eventStreams.clear();
    this.socketRecreated$.complete();

    for (const child of this.namespaces.values()) {
      child.destroy();
    }
    this.namespaces.clear();

    this.teardownSocket();

    this.connected.set(false);
    this.recovered.set(false);
    this.setConnectionState('disconnected');

    this.connectSubject?.complete();
    this.disconnectSubject?.complete();
    this.connectErrorSubject?.complete();
    this.errorSubject?.complete();
    this.reconnectAttemptSubject?.complete();
    this.reconnectSubject?.complete();
    this.reconnectErrorSubject?.complete();
    this.reconnectFailedSubject?.complete();
  }
}

/**
 * Injects a typed {@link SocketIoService} instance.
 * Pass a name to resolve a connection registered with `provideSocketIo(name, config)`.
 */
export function injectSocketIo<
  ListenEvents extends EventsMap = DefaultEventsMap,
  EmitEvents extends EventsMap = ListenEvents,
>(name?: string): SocketIoService<ListenEvents, EmitEvents> {
  if (name) {
    return inject(getNamedSocketIoToken(name)) as SocketIoService<ListenEvents, EmitEvents>;
  }
  return inject(SocketIoService) as SocketIoService<ListenEvents, EmitEvents>;
}

/**
 * Root DI factory used by `provideSocketIo` / `SocketIoModule.forRoot`.
 */
export function socketIoServiceFactory(
  config: SocketIoConfig,
  platformId: object,
  destroyRef: DestroyRef,
  clientFactory: SocketIoClientFactory,
  injector: Injector,
): SocketIoService {
  return new SocketIoService(config, platformId, destroyRef, clientFactory, injector);
}
