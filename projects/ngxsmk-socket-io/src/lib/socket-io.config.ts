import type { ManagerOptions, SocketOptions } from 'socket.io-client';
import type { DefaultEventsMap, EventsMap } from './socket-io.types';

/**
 * Configuration for establishing a Socket.IO connection.
 *
 * @typeParam ListenEvents - Server-to-client event map
 * @typeParam EmitEvents - Client-to-server event map
 */
export interface SocketIoConfig<
  ListenEvents extends EventsMap = DefaultEventsMap,
  EmitEvents extends EventsMap = ListenEvents,
> {
  /**
   * Socket.IO server URL (scheme + host[:port]).
   * Do not append the namespace here when using the `namespace` field.
   * Trailing slashes are stripped before connecting.
   */
  url: string;

  /**
   * Socket.IO namespace (e.g. `'/chat'`). Combined with `url` correctly.
   */
  namespace?: string;

  /**
   * Official Socket.IO / Engine.IO client options.
   *
   * Includes auth, transports, reconnection, path, query, withCredentials,
   * forceNew, and Engine.IO options such as `closeOnBeforeunload`.
   * Node.js-only TLS options (ca/cert/key/rejectUnauthorized) are passed through
   * when running under Node; browsers cannot bypass invalid certificates.
   */
  options?: Partial<ManagerOptions & SocketOptions>;

  /**
   * Whether to connect automatically when the service is created in the browser.
   * Defaults to `true`. Ignored during SSR (no connection is opened on the server).
   * Set to `false` for login-gated / conditional connections.
   */
  autoConnect?: boolean;

  /**
   * Phantom type parameters for strongly typed event maps.
   * Not used at runtime.
   */
  readonly __events?: {
    listen: ListenEvents;
    emit: EmitEvents;
  };
}
