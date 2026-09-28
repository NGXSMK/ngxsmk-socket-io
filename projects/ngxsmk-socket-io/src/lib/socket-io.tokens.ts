import { InjectionToken } from '@angular/core';
import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client';
import type { SocketIoConfig } from './socket-io.config';
import type { DefaultEventsMap, EventsMap } from './socket-io.types';
import type { SocketIoService } from './socket-io.service';

/**
 * Injection token for the default Socket.IO configuration provided via
 * `provideSocketIo(config)` or `SocketIoModule.forRoot`.
 */
export const SOCKET_IO_CONFIG = new InjectionToken<SocketIoConfig>('SOCKET_IO_CONFIG');

/**
 * Factory that creates a Socket.IO client instance.
 * Overridable in tests to avoid real network I/O.
 */
export type SocketIoClientFactory = <
  ListenEvents extends EventsMap = DefaultEventsMap,
  EmitEvents extends EventsMap = ListenEvents,
>(
  url: string,
  options?: Partial<ManagerOptions & SocketOptions>,
) => Socket<ListenEvents, EmitEvents>;

/**
 * Token for the Socket.IO client factory. Defaults to the official `io()` helper.
 */
export const SOCKET_IO_CLIENT_FACTORY = new InjectionToken<SocketIoClientFactory>(
  'SOCKET_IO_CLIENT_FACTORY',
  {
    providedIn: 'root',
    factory: (): SocketIoClientFactory => io as SocketIoClientFactory,
  },
);

const namedSocketTokens = new Map<string, InjectionToken<SocketIoService>>();

/**
 * Returns a stable injection token for a named Socket.IO connection.
 */
export function getNamedSocketIoToken(name: string): InjectionToken<SocketIoService> {
  const key = name.trim();
  if (!key) {
    throw new Error('ngxsmk-socket-io: named socket name must be a non-empty string.');
  }

  let token = namedSocketTokens.get(key);
  if (!token) {
    token = new InjectionToken<SocketIoService>(`ngxsmk-socket-io:${key}`);
    namedSocketTokens.set(key, token);
  }
  return token;
}

/**
 * Builds the URI passed to the Socket.IO client, appending the namespace when set.
 * Trailing slashes on the base URL are removed to avoid accidental `//namespace` paths.
 */
export function resolveSocketIoUrl(config: SocketIoConfig): string {
  const base = config.url.replace(/\/+$/, '');
  if (!config.namespace) {
    return base;
  }

  const namespace = config.namespace.startsWith('/') ? config.namespace : `/${config.namespace}`;

  if (base.endsWith(namespace)) {
    return base;
  }

  return `${base}${namespace}`;
}

/**
 * Validates a Socket.IO configuration object.
 */
export function assertSocketIoConfig(config: SocketIoConfig | undefined): SocketIoConfig {
  if (!config?.url || typeof config.url !== 'string') {
    throw new Error(
      'ngxsmk-socket-io: SocketIoConfig.url is required and must be a non-empty string.',
    );
  }
  return config;
}
