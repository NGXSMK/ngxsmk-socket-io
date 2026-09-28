/**
 * Shared Socket.IO event-map typing helpers.
 *
 * Compatible with application event maps used by `socket.io-client`.
 */

/**
 * Constraint for user-defined Socket.IO event maps.
 * Kept intentionally loose so interfaces without index signatures work.
 */
export type EventsMap = object;

/**
 * Default permissive event map used when no application map is provided.
 */
export interface DefaultEventsMap {
  // Socket.IO default maps intentionally accept arbitrary event handlers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [event: string]: (...args: any[]) => void;
}

/**
 * Connection lifecycle states derived from Socket.IO manager/socket events.
 */
export type SocketConnectionState =
  'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Keys of an event map that are valid event names.
 */
export type EventNames<Map extends EventsMap> = Extract<keyof Map, string>;

/**
 * Parameter tuple for a given event listener.
 */
export type EventParams<Map extends EventsMap, Ev extends EventNames<Map>> = Map[Ev] extends (
  ...args: infer Params
) => unknown
  ? Params
  : never;

/**
 * First payload argument for a listen event, or `void` when the event has no args.
 */
export type ListenEventPayload<
  ListenEvents extends EventsMap,
  Ev extends EventNames<ListenEvents>,
> = EventParams<ListenEvents, Ev> extends [] ? void : EventParams<ListenEvents, Ev>[0];

/**
 * Emit argument tuple for a client-to-server event.
 */
export type EmitEventArgs<
  EmitEvents extends EventsMap,
  Ev extends EventNames<EmitEvents>,
> = EventParams<EmitEvents, Ev>;

/**
 * All emit args except the trailing acknowledgement callback.
 */
export type EmitAckArgs<EmitEvents extends EventsMap, Ev extends EventNames<EmitEvents>> =
  EventParams<EmitEvents, Ev> extends [...infer Rest, unknown] ? Rest : EventParams<EmitEvents, Ev>;

/**
 * Acknowledgement payload inferred from the last callback parameter of an emit event.
 */
export type EmitAckResult<EmitEvents extends EventsMap, Ev extends EventNames<EmitEvents>> =
  EventParams<EmitEvents, Ev> extends [...unknown[], infer Last]
    ? Last extends (arg: infer Payload) => unknown
      ? Payload
      : unknown
    : unknown;
