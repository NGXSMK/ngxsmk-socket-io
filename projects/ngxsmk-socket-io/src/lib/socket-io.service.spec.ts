import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, take } from 'rxjs';
import { SocketIoModule } from './socket-io.module';
import { provideSocketIo } from './socket-io.providers';
import { SocketIoService, injectSocketIo } from './socket-io.service';
import { SOCKET_IO_CLIENT_FACTORY, SOCKET_IO_CONFIG, resolveSocketIoUrl } from './socket-io.tokens';
import { createMockSocketFactory, type MockFactoryState } from './testing/mock-socket';

describe('resolveSocketIoUrl', () => {
  it('returns the base url when no namespace is set', () => {
    expect(resolveSocketIoUrl({ url: 'http://localhost:3000/' })).toBe('http://localhost:3000');
  });

  it('appends a namespace with a leading slash', () => {
    expect(resolveSocketIoUrl({ url: 'http://localhost:3000', namespace: 'chat' })).toBe(
      'http://localhost:3000/chat',
    );
  });

  it('does not duplicate an already present namespace', () => {
    expect(
      resolveSocketIoUrl({
        url: 'http://localhost:3000/chat',
        namespace: '/chat',
      }),
    ).toBe('http://localhost:3000/chat');
  });
});

describe('provideSocketIo', () => {
  it('throws when url is missing', () => {
    expect(() => provideSocketIo({ url: '' })).toThrowError(/SocketIoConfig\.url is required/);
  });

  it('registers config and service providers', () => {
    TestBed.configureTestingModule({
      providers: [
        provideSocketIo({ url: 'http://localhost:3000' }),
        {
          provide: SOCKET_IO_CLIENT_FACTORY,
          useValue: createMockSocketFactory().factory,
        },
      ],
    });

    expect(TestBed.inject(SOCKET_IO_CONFIG).url).toBe('http://localhost:3000');
    expect(TestBed.inject(SocketIoService)).toBeTruthy();
  });
});

describe('SocketIoModule.forRoot', () => {
  it('provides the same configuration as provideSocketIo', () => {
    TestBed.configureTestingModule({
      imports: [SocketIoModule.forRoot({ url: 'http://localhost:4000' })],
      providers: [
        {
          provide: SOCKET_IO_CLIENT_FACTORY,
          useValue: createMockSocketFactory().factory,
        },
      ],
    });

    expect(TestBed.inject(SOCKET_IO_CONFIG).url).toBe('http://localhost:4000');
    expect(TestBed.inject(SocketIoService)).toBeTruthy();
  });
});

describe('SocketIoService', () => {
  let mockState: MockFactoryState;
  let latest: () => ReturnType<typeof createMockSocketFactory>['latest'] extends () => infer S
    ? S
    : never;
  let service: SocketIoService;

  function setup(
    config: {
      url?: string;
      namespace?: string;
      autoConnect?: boolean;
      options?: Record<string, unknown>;
    } = {},
    platformId: 'browser' | 'server' = 'browser',
  ): void {
    const mock = createMockSocketFactory();
    mockState = mock.state;
    latest = mock.latest;

    TestBed.configureTestingModule({
      providers: [
        provideSocketIo({
          url: config.url ?? 'http://localhost:3000',
          namespace: config.namespace,
          autoConnect: config.autoConnect,
          options: config.options,
        }),
        { provide: SOCKET_IO_CLIENT_FACTORY, useValue: mock.factory },
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });

    service = TestBed.inject(SocketIoService);
  }

  it('creates a socket on construction when autoConnect is enabled', async () => {
    setup({ autoConnect: true });
    await Promise.resolve();

    expect(mockState.sockets.length).toBe(1);
    expect(mockState.lastUrl).toBe('http://localhost:3000');
    expect(service.isConnected()).toBeTrue();
    expect(service.connected()).toBeTrue();
    expect(service.connectionState()).toBe('connected');
  });

  it('does not connect automatically when autoConnect is false', () => {
    setup({ autoConnect: false });

    expect(mockState.sockets.length).toBe(0);
    expect(service.isConnected()).toBeFalse();
    expect(service.connectionState()).toBe('disconnected');
  });

  it('connects and disconnects manually', async () => {
    setup({ autoConnect: false });

    service.connect();
    await Promise.resolve();

    expect(service.isConnected()).toBeTrue();
    expect(latest().connected).toBeTrue();

    service.disconnect();
    expect(service.isConnected()).toBeFalse();
    expect(service.connectionState()).toBe('disconnected');
  });

  it('builds namespace URLs correctly', () => {
    setup({ namespace: '/chat', autoConnect: true });
    expect(mockState.lastUrl).toBe('http://localhost:3000/chat');
  });

  it('passes authentication options to the client factory', () => {
    setup({
      autoConnect: true,
      options: { auth: { token: 'secret-token' } },
    });

    expect(mockState.lastOptions?.auth).toEqual({ token: 'secret-token' });
    expect(latest().auth).toEqual({ token: 'secret-token' });
  });

  it('updates auth dynamically via setAuth', () => {
    setup({ autoConnect: false });
    service.setAuth({ token: 'rotated' });
    expect(latest().auth).toEqual({ token: 'rotated' });
  });

  it('emits events through the native socket', () => {
    setup({ autoConnect: true });
    const socket = latest();
    spyOn(socket, 'emit').and.callThrough();

    service.emit('sendMessage', { text: 'hello' });

    expect(socket.emit).toHaveBeenCalledWith('sendMessage', { text: 'hello' });
  });

  it('supports emitWithAck and timeout helpers', async () => {
    setup({ autoConnect: true });
    const socket = latest();
    spyOn(socket, 'emitWithAck').and.returnValue(Promise.resolve({ ok: true }));
    spyOn(socket, 'timeout').and.callThrough();

    await expectAsync(service.emitWithAck('ping', '1')).toBeResolvedTo({ ok: true } as never);
    expect(socket.emitWithAck).toHaveBeenCalledWith('ping', '1');

    await expectAsync(service.timeout(500).emitWithAck('ping', '2')).toBeResolvedTo({
      ok: true,
    } as never);
    expect(socket.timeout).toHaveBeenCalledWith(500);
  });

  it('exposes events as Observables and cleans up on unsubscribe', async () => {
    setup({ autoConnect: true });
    const socket = latest();
    const values: unknown[] = [];

    const sub = service.fromEvent<{ text: string }>('message').subscribe((value) => {
      values.push(value);
    });

    socket.trigger('message', { text: 'one' });
    socket.trigger('message', { text: 'two' });

    expect(values).toEqual([{ text: 'one' }, { text: 'two' }]);
    expect(socket.listenerCount('message')).toBe(1);

    sub.unsubscribe();
    expect(socket.listenerCount('message')).toBe(0);
  });

  it('shares a single native listener across multiple subscribers', () => {
    setup({ autoConnect: true });
    const socket = latest();
    const a: unknown[] = [];
    const b: unknown[] = [];

    const subA = service.fromEvent('message').subscribe((v) => a.push(v));
    const subB = service.fromEvent('message').subscribe((v) => b.push(v));

    socket.trigger('message', 'hi');

    expect(a).toEqual(['hi']);
    expect(b).toEqual(['hi']);
    expect(socket.listenerCount('message')).toBe(1);

    subA.unsubscribe();
    expect(socket.listenerCount('message')).toBe(1);

    subB.unsubscribe();
    expect(socket.listenerCount('message')).toBe(0);
  });

  it('supports on as an alias of fromEvent', async () => {
    setup({ autoConnect: true });
    const promise = firstValueFrom(service.on<string>('ping'));
    latest().trigger('ping', 'pong');
    await expectAsync(promise).toBeResolvedTo('pong');
  });

  it('completes after the first once() emission', async () => {
    setup({ autoConnect: true });
    const values: string[] = [];
    let completed = false;

    service.once<string>('ready').subscribe({
      next: (value) => values.push(value),
      complete: () => {
        completed = true;
      },
    });

    latest().trigger('ready', 'go');
    latest().trigger('ready', 'again');

    expect(values).toEqual(['go']);
    expect(completed).toBeTrue();
  });

  it('removes listeners with off and removeAllListeners', () => {
    setup({ autoConnect: true });
    const socket = latest();

    const sub = service.fromEvent('message').subscribe();
    expect(socket.listenerCount('message')).toBe(1);

    service.off('message');
    expect(socket.listenerCount('message')).toBe(0);
    sub.unsubscribe();

    const sub2 = service.fromEvent('other').subscribe();
    service.removeAllListeners();
    expect(socket.listenerCount('other')).toBe(0);
    sub2.unsubscribe();
  });

  it('exposes lifecycle events', async () => {
    setup({ autoConnect: false });
    service.connect();
    await Promise.resolve();

    const disconnectPromise = firstValueFrom(service.disconnect$.pipe(take(1)));
    service.disconnect();
    await expectAsync(disconnectPromise).toBeResolvedTo('io client disconnect');
  });

  it('updates connection state on connect_error', async () => {
    setup({ autoConnect: false });
    service.connect();
    await Promise.resolve();

    const errorPromise = firstValueFrom(service.connectError$.pipe(take(1)));
    const error = new Error('boom');
    latest().triggerConnectError(error);

    await expectAsync(errorPromise).toBeResolvedTo(error);
    expect(service.connectionState()).toBe('error');
    expect(service.connected()).toBeFalse();
  });

  it('tracks reconnect lifecycle via the manager', () => {
    setup({ autoConnect: true });
    const states: string[] = [];
    service.connectionState$.subscribe((state) => states.push(state));

    latest().io.trigger('reconnect_attempt', 1);
    expect(service.connectionState()).toBe('reconnecting');

    latest().io.trigger('reconnect', 1);
    expect(service.connectionState()).toBe('connected');
    expect(service.connected()).toBeTrue();
  });

  it('returns the native socket from getSocket()', () => {
    setup({ autoConnect: false });
    const socket = service.getSocket();
    expect(socket as unknown).toBe(latest());
  });

  it('is SSR-safe and does not create sockets on the server', () => {
    setup({ autoConnect: true }, 'server');

    expect(mockState.sockets.length).toBe(0);
    expect(service.isConnected()).toBeFalse();

    service.connect();
    service.emit('noop');
    expect(mockState.sockets.length).toBe(0);

    expect(() => service.getSocket()).toThrowError(/only available in the browser/);
  });

  it('returns EMPTY observables for events during SSR', (done) => {
    setup({ autoConnect: true }, 'server');

    let emitted = false;
    service.fromEvent('message').subscribe({
      next: () => {
        emitted = true;
      },
      complete: () => {
        expect(emitted).toBeFalse();
        done();
      },
    });
  });

  it('cleans up on destroy', async () => {
    setup({ autoConnect: true });
    await Promise.resolve();
    const socket = latest();
    spyOn(socket, 'disconnect').and.callThrough();

    const sub = service.fromEvent('message').subscribe();
    TestBed.resetTestingModule();

    expect(socket.disconnect).toHaveBeenCalled();
    sub.unsubscribe();
  });

  it('supports injectSocketIo helper', () => {
    setup({ autoConnect: false });
    const typed = TestBed.runInInjectionContext(() => injectSocketIo());
    expect(typed).toBe(service);
  });

  it('replays the initial connect event for late subscribers', async () => {
    setup({ autoConnect: true });
    await Promise.resolve();

    const fromEventValues: unknown[] = [];
    service.fromEvent('connect').subscribe(() => fromEventValues.push('fromEvent'));
    expect(fromEventValues).toEqual(['fromEvent']);

    const connectValues: unknown[] = [];
    service.connect$.subscribe(() => connectValues.push('connect$'));
    expect(connectValues).toEqual(['connect$']);
  });

  it('completes once(connect) immediately when already connected', async () => {
    setup({ autoConnect: true });
    await Promise.resolve();

    await expectAsync(firstValueFrom(service.once('connect'))).toBeResolved();
  });

  it('reconnects cleanly after disconnect', async () => {
    setup({ autoConnect: true });
    await Promise.resolve();

    service.disconnect();
    expect(service.isConnected()).toBeFalse();

    service.connect();
    expect(service.isConnected()).toBeTrue();
    expect(service.connectionState()).toBe('connected');
  });

  it('updates auth and reconnects via authenticateAndConnect', async () => {
    setup({ autoConnect: false });
    service.authenticateAndConnect({ token: 'jwt-token' });
    await Promise.resolve();

    expect(latest().auth).toEqual({ token: 'jwt-token' });
    expect(service.isConnected()).toBeTrue();
  });

  it('tracks recovered session state', async () => {
    setup({ autoConnect: true });
    await Promise.resolve();

    latest().recovered = true;
    latest().trigger('connect');
    expect(service.recovered()).toBeTrue();
  });

  it('creates namespace sockets via of()', async () => {
    setup({ autoConnect: false });
    const chat = service.of('/chat');
    chat.connect();
    await Promise.resolve();

    expect(chat).not.toBe(service);
    expect(mockState.lastUrl).toBe('http://localhost:3000/chat');
    expect(service.of('/chat')).toBe(chat);
    expect(service.of('/')).toBe(service);
  });

  it('updates config and recreates the client', async () => {
    setup({ autoConnect: true });
    await Promise.resolve();
    const first = latest();

    service.updateConfig({
      url: 'http://localhost:4000',
      namespace: '/ops',
      options: { auth: { token: 'next' } },
    });
    await Promise.resolve();

    expect(service.getConfig().url).toBe('http://localhost:4000');
    expect(mockState.lastUrl).toBe('http://localhost:4000/ops');
    expect(latest()).not.toBe(first);
    expect(latest().auth).toEqual({ token: 'next' });
  });

  it('can update auth without reconnecting', () => {
    setup({ autoConnect: false });
    service.connect();
    const first = latest();

    service.updateConfig({ options: { auth: { token: 'silent' } } }, { reconnect: false });

    expect(latest()).toBe(first);
    expect(latest().auth).toEqual({ token: 'silent' });
  });
});

describe('named Socket.IO providers', () => {
  it('registers and injects multiple named sockets', async () => {
    const chatMock = createMockSocketFactory();
    const notifyMock = createMockSocketFactory();

    TestBed.configureTestingModule({
      providers: [
        provideSocketIo('chat', { url: 'http://localhost:3000', namespace: '/chat' }),
        provideSocketIo('notify', { url: 'http://localhost:3001' }),
        {
          provide: SOCKET_IO_CLIENT_FACTORY,
          useValue: ((url: string, options?: object) => {
            if (String(url).includes('3001')) {
              return notifyMock.factory(url, options as never);
            }
            return chatMock.factory(url, options as never);
          }) as never,
        },
      ],
    });

    const chat = TestBed.runInInjectionContext(() => injectSocketIo('chat'));
    const notify = TestBed.runInInjectionContext(() => injectSocketIo('notify'));

    chat.connect();
    notify.connect();
    await Promise.resolve();

    expect(chat).not.toBe(notify);
    expect(chatMock.state.lastUrl).toBe('http://localhost:3000/chat');
    expect(notifyMock.state.lastUrl).toBe('http://localhost:3001');
  });

  it('supports SocketIoModule.forFeature for named sockets', () => {
    TestBed.configureTestingModule({
      imports: [
        SocketIoModule.forFeature('chat', {
          url: 'http://localhost:3000',
          autoConnect: false,
        }),
      ],
      providers: [
        {
          provide: SOCKET_IO_CLIENT_FACTORY,
          useValue: createMockSocketFactory().factory,
        },
      ],
    });

    const chat = TestBed.runInInjectionContext(() => injectSocketIo('chat'));
    expect(chat).toBeTruthy();
    expect(chat.getConfig().url).toBe('http://localhost:3000');
  });
});
