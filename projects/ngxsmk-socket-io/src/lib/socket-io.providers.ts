import {
  DestroyRef,
  Injector,
  PLATFORM_ID,
  makeEnvironmentProviders,
  type EnvironmentProviders,
  type Provider,
} from '@angular/core';
import type { SocketIoConfig } from './socket-io.config';
import { SocketIoService, socketIoServiceFactory } from './socket-io.service';
import {
  SOCKET_IO_CLIENT_FACTORY,
  SOCKET_IO_CONFIG,
  assertSocketIoConfig,
  getNamedSocketIoToken,
  type SocketIoClientFactory,
} from './socket-io.tokens';

/**
 * Providers registered by both the standalone and NgModule APIs.
 */
export function createSocketIoProviders(config: SocketIoConfig): Provider[] {
  const validated = assertSocketIoConfig(config);

  return [
    { provide: SOCKET_IO_CONFIG, useValue: validated },
    {
      provide: SocketIoService,
      useFactory: socketIoServiceFactory,
      deps: [SOCKET_IO_CONFIG, PLATFORM_ID, DestroyRef, SOCKET_IO_CLIENT_FACTORY, Injector],
    },
  ];
}

/**
 * Providers for a named Socket.IO connection.
 */
export function createNamedSocketIoProviders(name: string, config: SocketIoConfig): Provider[] {
  const validated = assertSocketIoConfig(config);
  const token = getNamedSocketIoToken(name);

  return [
    {
      provide: token,
      useFactory: (
        platformId: object,
        destroyRef: DestroyRef,
        clientFactory: SocketIoClientFactory,
        injector: Injector,
      ) => socketIoServiceFactory(validated, platformId, destroyRef, clientFactory, injector),
      deps: [PLATFORM_ID, DestroyRef, SOCKET_IO_CLIENT_FACTORY, Injector],
    },
  ];
}

/**
 * Registers Socket.IO for standalone Angular applications.
 *
 * @example Default connection
 * ```ts
 * provideSocketIo({ url: 'http://localhost:3000' })
 * ```
 *
 * @example Named connection (multiple sockets)
 * ```ts
 * provideSocketIo('chat', { url: 'http://localhost:3000', namespace: '/chat' })
 * provideSocketIo('notifications', { url: 'http://localhost:3001' })
 *
 * const chat = injectSocketIo('chat');
 * ```
 */
export function provideSocketIo(config: SocketIoConfig): EnvironmentProviders;
export function provideSocketIo(name: string, config: SocketIoConfig): EnvironmentProviders;
export function provideSocketIo(
  nameOrConfig: string | SocketIoConfig,
  maybeConfig?: SocketIoConfig,
): EnvironmentProviders {
  if (typeof nameOrConfig === 'string') {
    return makeEnvironmentProviders(createNamedSocketIoProviders(nameOrConfig, maybeConfig!));
  }

  return makeEnvironmentProviders(createSocketIoProviders(nameOrConfig));
}
