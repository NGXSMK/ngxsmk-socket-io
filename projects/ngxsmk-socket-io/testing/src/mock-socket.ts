import type { ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import type { SocketIoClientFactory } from 'ngxsmk-socket-io';

type Handler = (...args: unknown[]) => void;

class SimpleEmitter {
  private readonly listeners = new Map<string, Set<Handler>>();

  on(event: string, listener: Handler): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return this;
  }

  once(event: string, listener: Handler): this {
    const wrapper: Handler = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }

  off(event: string, listener?: Handler): this {
    if (!listener) {
      this.listeners.delete(event);
      return this;
    }

    this.listeners.get(event)?.delete(listener);
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) {
      return false;
    }

    [...set].forEach((listener) => listener(...args));
    return true;
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

/**
 * In-memory Socket.IO stand-in for deterministic unit tests.
 */
export class MockSocket extends SimpleEmitter {
  connected = false;
  active = false;
  recovered = false;
  id: string | undefined;
  auth: SocketOptions['auth'] = {};
  readonly io = new MockManager();

  private readonly autoConnect: boolean;

  constructor(options?: Partial<ManagerOptions & SocketOptions>) {
    super();
    this.autoConnect = options?.autoConnect !== false;
    this.auth = options?.auth ?? {};

    if (this.autoConnect) {
      Promise.resolve().then(() => this.connect());
    }
  }

  connect(): this {
    this.active = true;
    this.connected = true;
    this.id = 'mock-socket-id';
    this.emit('connect');
    return this;
  }

  disconnect(): this {
    this.active = false;
    const wasConnected = this.connected;
    this.connected = false;
    this.id = undefined;
    if (wasConnected) {
      this.emit('disconnect', 'io client disconnect');
    }
    return this;
  }

  /** Simulate an inbound server event. */
  trigger(event: string, ...args: unknown[]): void {
    this.emit(event, ...args);
  }

  /** Simulate a connection error. */
  triggerConnectError(error: Error): void {
    this.connected = false;
    this.active = false;
    this.emit('connect_error', error);
  }

  emitWithAck(event: string, ...args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      try {
        this.emit(event, ...args, (response: unknown) => resolve(response));
      } catch (error) {
        reject(error);
      }
    });
  }

  timeout(ms: number): this {
    void ms;
    return this;
  }
}

export class MockManager extends SimpleEmitter {
  trigger(event: string, ...args: unknown[]): void {
    this.emit(event, ...args);
  }
}

export interface MockFactoryState {
  lastUrl?: string;
  lastOptions?: Partial<ManagerOptions & SocketOptions>;
  sockets: MockSocket[];
}

export function createMockSocketFactory(state: MockFactoryState = { sockets: [] }): {
  factory: SocketIoClientFactory;
  state: MockFactoryState;
  latest: () => MockSocket;
} {
  const factory: SocketIoClientFactory = ((
    url: string,
    options?: Partial<ManagerOptions & SocketOptions>,
  ) => {
    state.lastUrl = url;
    state.lastOptions = options;
    const socket = new MockSocket(options);
    state.sockets.push(socket);
    return socket as unknown as Socket;
  }) as SocketIoClientFactory;

  return {
    factory,
    state,
    latest: () => {
      const socket = state.sockets[state.sockets.length - 1];
      if (!socket) {
        throw new Error('No mock socket created yet');
      }
      return socket;
    },
  };
}
