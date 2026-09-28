/*
 * Public testing utilities for ngxsmk-socket-io.
 *
 * @example
 * ```ts
 * import { createMockSocketFactory, SOCKET_IO_CLIENT_FACTORY } from 'ngxsmk-socket-io/testing';
 * ```
 */

export {
  MockManager,
  MockSocket,
  createMockSocketFactory,
  type MockFactoryState,
} from './mock-socket';

export { SOCKET_IO_CLIENT_FACTORY, type SocketIoClientFactory } from 'ngxsmk-socket-io';
