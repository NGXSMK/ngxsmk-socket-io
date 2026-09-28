/*
 * Public API Surface of ngxsmk-socket-io
 */

export type { SocketIoConfig } from './lib/socket-io.config';
export { SocketIoModule } from './lib/socket-io.module';
export {
  provideSocketIo,
  createSocketIoProviders,
  createNamedSocketIoProviders,
} from './lib/socket-io.providers';
export { SocketIoService, injectSocketIo, socketIoServiceFactory } from './lib/socket-io.service';
export {
  SOCKET_IO_CONFIG,
  SOCKET_IO_CLIENT_FACTORY,
  assertSocketIoConfig,
  getNamedSocketIoToken,
  resolveSocketIoUrl,
} from './lib/socket-io.tokens';
export type { SocketIoClientFactory } from './lib/socket-io.tokens';
export type {
  DefaultEventsMap,
  EmitAckArgs,
  EmitAckResult,
  EmitEventArgs,
  EventNames,
  EventParams,
  EventsMap,
  ListenEventPayload,
  SocketConnectionState,
} from './lib/socket-io.types';
