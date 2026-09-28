# ngxsmk-socket-io

Modern Angular integration for Socket.IO.

[![npm](https://img.shields.io/npm/v/ngxsmk-socket-io.svg)](https://www.npmjs.com/package/ngxsmk-socket-io)
[![docs](https://img.shields.io/badge/docs-live-19c6c6)](https://smk-web-projects.github.io/ngxsmk-socket-io/)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Lightweight, tree-shakeable Angular wrapper around the official `socket.io-client` with
dependency injection, RxJS Observables, Signals, typed event maps, acknowledgements,
runtime reconfiguration, and SSR-safe defaults.

**Docs:** [Overview](https://smk-web-projects.github.io/ngxsmk-socket-io/) -
[Guide](https://smk-web-projects.github.io/ngxsmk-socket-io/guide) -
[Playground](https://smk-web-projects.github.io/ngxsmk-socket-io/playground) -
[Advanced API](https://smk-web-projects.github.io/ngxsmk-socket-io/api)

---

## Features

| Feature | What it does |
| --- | --- |
| Standalone providers | `provideSocketIo(config)` for `bootstrapApplication` |
| Named multi-socket | `provideSocketIo('chat', config)` + `injectSocketIo('chat')` |
| NgModule API | `SocketIoModule.forRoot` / `forFeature` |
| Typed event maps | `injectSocketIo<Listen, Emit>()` checks names and payloads |
| RxJS listeners | `fromEvent` / `on` / `once` - shared, ref-counted cleanup |
| Emit + ack | `emit`, `emitWithAck`, `timeout(ms)` |
| Signals + Observables | `connected`, `recovered`, `connectionState` (+ `$` mirrors) |
| Connect replay | Late `connect$` subscribers still fire if already connected |
| Auth helpers | `setAuth`, `authenticateAndConnect` |
| Namespaces | Config `namespace` and `of('/chat')` |
| Runtime config | `updateConfig` / `recreateSocket` |
| Native escape hatch | `getSocket()` for the official client |
| SSR-safe | No browser socket on the server; listen APIs return `EMPTY` |
| Testing entry | `ngxsmk-socket-io/testing` mock factory |
| Zoneless-friendly | No Zone.js dependency |
| DestroyRef cleanup | Tear down with the owning injector |
| Tree-shakeable | Small surface, `sideEffects: false` |

---

## Installation

```bash
npm install ngxsmk-socket-io socket.io-client
```

### Peer dependencies

| Package | Version |
| --- | --- |
| `@angular/core` | `>=17` |
| `@angular/common` | `>=17` |
| `rxjs` | `>=7.8` |
| `socket.io-client` | `^4` |

---

## Standalone setup

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideSocketIo } from 'ngxsmk-socket-io';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideSocketIo({
      url: 'http://localhost:3000',
      options: {
        transports: ['websocket', 'polling'],
      },
    }),
  ],
});
```

### SocketIoConfig

| Field | Description |
| --- | --- |
| `url` | Scheme + host[:port]. Trailing slashes are stripped. |
| `namespace?` | Socket.IO namespace (e.g. `/chat`). Do not also append it to `url`. |
| `autoConnect?` | Default `true` in the browser. Use `false` for login-gated connect. Ignored on SSR. |
| `options?` | Pass-through to `socket.io-client` (auth, transports, reconnection, path, query, ...). |

---

## NgModule setup

```ts
import { NgModule } from '@angular/core';
import { SocketIoModule } from 'ngxsmk-socket-io';

@NgModule({
  imports: [
    SocketIoModule.forRoot({
      url: 'http://localhost:3000',
    }),
  ],
})
export class AppModule {}
```

Named feature sockets: `SocketIoModule.forFeature('chat', config)`.

---

## Basic usage

```ts
import { Component, inject } from '@angular/core';
import { SocketIoService } from 'ngxsmk-socket-io';

@Component({
  standalone: true,
  template: `
    <button type="button" (click)="send()">Send</button>
  `,
})
export class AppComponent {
  readonly socket = inject(SocketIoService);

  constructor() {
    this.socket.fromEvent<{ text: string }>('message').subscribe((message) => {
      console.log(message.text);
    });
  }

  send(): void {
    this.socket.emit('message', { text: 'Hello' });
  }
}
```

In templates, bind Signals with `socket.connectionState()` and `socket.connected()`.

---

## Strong typing

```ts
interface ServerToClientEvents {
  message: (payload: { id: string; text: string }) => void;
  typing: (userId: string) => void;
}

interface ClientToServerEvents {
  sendMessage: (payload: { text: string }) => void;
  joinRoom: (roomId: string) => void;
  ping: (
    payload: { id: string },
    ack?: (response: { ok: boolean }) => void,
  ) => void;
}

import { injectSocketIo } from 'ngxsmk-socket-io';

const socket = injectSocketIo<ServerToClientEvents, ClientToServerEvents>();

socket.fromEvent('message').subscribe((message) => {
  console.log(message.text);
});

socket.emit('sendMessage', { text: 'Hello' });
socket.emit('joinRoom', 'room-123');
```

Incorrect event names or payloads fail TypeScript checking where possible.

---

## Event listening

```ts
socket.fromEvent<Message>('message').subscribe(console.log);
socket.on<Message>('message').subscribe(console.log); // alias of fromEvent
socket.once<Message>('message').subscribe(console.log); // first event only

socket.off('message');
socket.removeAllListeners();
```

Observables are lazy, shared across subscribers, and remove the Socket.IO listener when the last
subscription unsubscribes. After `recreateSocket()`, active `fromEvent` subscribers re-attach.

---

## Event emitting and acknowledgements

```ts
socket.emit('sendMessage', { text: 'Hello' });

const ack = await socket.emitWithAck('ping', { id: '1' });
const timed = await socket.timeout(1000).emitWithAck('ping', { id: '1' });
```

- **`emit`** - fire-and-forget (typed args)
- **`emitWithAck`** - Promise that resolves with the server acknowledgement
- **`timeout(ms)`** - returns timed `emit` / `emitWithAck` helpers; ack Promises reject on timeout

---

## Authentication

```ts
provideSocketIo({
  url: 'https://api.example.com',
  options: {
    auth: { token: 'example-token' },
  },
});
```

Update credentials later:

```ts
socket.setAuth({ token: refreshedToken });
```

After async login:

```ts
provideSocketIo({
  url: 'https://api.example.com',
  autoConnect: false,
});

socket.authenticateAndConnect({ token });
```

---

## Connection control

```ts
socket.connect(); // open (alias: open())
socket.disconnect(); // close without destroying the service (alias: close())
socket.isConnected(); // imperative boolean
```

Prefer Signals in templates: `socket.connected()` and `socket.connectionState()`.

---

## Connection lifecycle

```ts
socket.connect$; // replays if already connected
socket.disconnect$;
socket.connectError$;
socket.error$;
socket.reconnectAttempt$;
socket.reconnect$;
socket.reconnectError$;
socket.reconnectFailed$;
```

```ts
socket.connectionState$; // Observable
socket.connectionState(); // Signal
socket.connected(); // Signal
socket.recovered(); // Signal - connection state recovery
```

Possible `connectionState` values:

- `disconnected`
- `connecting`
- `connected`
- `reconnecting`
- `error`

---

## Runtime config

Change URL, namespace, or options after bootstrap (tenant / region / feature flag):

```ts
socket.updateConfig(
  {
    url: 'https://api.example.com',
    options: { auth: { token } },
  },
  { reconnect: true }, // default - recreate + connect
);

// Or store config only, then connect yourself:
socket.updateConfig({ url: nextUrl }, { reconnect: false });
socket.recreateSocket(false);
socket.connect();

socket.getConfig(); // read-only snapshot
```

---

## Namespaces

```ts
provideSocketIo({
  url: 'https://api.example.com',
  namespace: '/chat',
});
```

Or derive a namespace from an existing connection:

```ts
const chat = socket.of('/chat');
chat.emit('joinRoom', 'general');
```

Namespace is not Engine.IO `path` - keep path in `options.path` (default `/socket.io`).

---

## Multiple sockets

```ts
bootstrapApplication(AppComponent, {
  providers: [
    provideSocketIo('chat', {
      url: 'http://localhost:3000',
      namespace: '/chat',
    }),
    provideSocketIo('notifications', {
      url: 'http://localhost:3001',
    }),
  ],
});

const chat = injectSocketIo('chat');
const notifications = injectSocketIo('notifications');
```

---

## Native Socket.IO client

```ts
const native = socket.getSocket();
native.timeout(5000).emit('ping', () => {});
```

Throws during SSR or after destruction. Prefer library methods when available.

---

## SSR guidance

Socket.IO needs browser networking APIs. This library:

- Detects the platform with Angular's `isPlatformBrowser`
- Does not open sockets during server rendering
- Makes `fromEvent` / `on` / `once` return `EMPTY` on the server
- No-ops `connect` / `emit` on the server
- Throws a clear error if `getSocket()` is called during SSR
- Keeps disconnect/connect reusable in the browser

Prefer Signals or the `async` pipe in zoneless apps.

---

## Testing

```ts
import { provideSocketIo, SocketIoService } from 'ngxsmk-socket-io';
import {
  createMockSocketFactory,
  SOCKET_IO_CLIENT_FACTORY,
} from 'ngxsmk-socket-io/testing';

const { factory, latest } = createMockSocketFactory();

TestBed.configureTestingModule({
  providers: [
    provideSocketIo({ url: 'http://localhost:3000', autoConnect: false }),
    { provide: SOCKET_IO_CLIENT_FACTORY, useValue: factory },
  ],
});

const socket = TestBed.inject(SocketIoService);
socket.connect();
latest().emit('message', { id: '1', text: 'hi' });
```

---

## Common pitfalls addressed

Checked against closed issues from
[`ngx-socket-io`](https://github.com/rodgc/ngx-socket-io/issues?q=is%3Aissue+state%3Aclosed):

| Topic | Status in `ngxsmk-socket-io` |
| --- | --- |
| SSR / inject during SSR hang | Safe - no socket created on server |
| `provideSocketIo` missing service | Service is always registered with the provider |
| Missed initial `connect` event | Replayed for late `connect$` / `fromEvent('connect')` subscribers |
| Manual / conditional connect | `autoConnect: false` + `connect()` / `authenticateAndConnect()` |
| Multiple sockets | Named `provideSocketIo(name, config)` + `injectSocketIo(name)` |
| JWT / auth typing | `options.auth` and `setAuth()` |
| `fromEvent` listener leaks with `share` | Ref-counted `share({ resetOnRefCountZero: true })` |
| Connection state recovery | `recovered` signal + native `getSocket().recovered` |
| `closeOnBeforeunload` | Supported via `options.closeOnBeforeunload` |
| Trailing slash on URL | Base URL trailing slashes are stripped |
| Self-signed certs in browser | Not possible in browsers; Node TLS options pass through under Node |
| Zoneless / no Zone.js | Library does not depend on Zone.js; Signals are first-class |
| Recreate drops listeners | `fromEvent` re-attaches after `recreateSocket` / `updateConfig` |

---

## API reference

### Package exports

| Export | Purpose |
| --- | --- |
| `provideSocketIo(config)` | Standalone providers (default socket) |
| `provideSocketIo(name, config)` | Named socket providers |
| `SocketIoModule.forRoot(config)` | NgModule root configuration |
| `SocketIoModule.forFeature(name, config)` | NgModule named socket |
| `SocketIoService` | Main injectable service |
| `injectSocketIo<L, E>(name?)` | Typed inject helper |
| `SocketIoConfig` | Configuration interface |
| `SOCKET_IO_CONFIG` | Config injection token |
| `SOCKET_IO_CLIENT_FACTORY` | Overridable client factory (also used in tests) |
| `SocketConnectionState` | Connection state union |
| `createMockSocketFactory` | From `ngxsmk-socket-io/testing` |

### SocketIoService - connection

| Member | Description |
| --- | --- |
| `connect()` / `open()` | Open the connection |
| `disconnect()` / `close()` | Close without destroying the service |
| `isConnected()` | Imperative connected flag |
| `updateConfig(partial, options?)` | Merge config; recreate by default |
| `recreateSocket(autoConnect?)` | Tear down and create a fresh client |
| `of(namespace)` | Namespace-scoped `SocketIoService` |
| `getSocket()` | Native `socket.io-client` instance |
| `getConfig()` | Read-only config snapshot |

### SocketIoService - emit / listen

| Member | Description |
| --- | --- |
| `emit(event, ...args)` | Typed emit |
| `emitWithAck(event, ...args)` | Promise acknowledgement |
| `timeout(ms)` | Timed `emit` / `emitWithAck` helpers |
| `fromEvent(event)` / `on(event)` | Shared Observable stream |
| `once(event)` | First event, then complete |
| `off(event)` | Remove listeners for an event |
| `removeAllListeners(event?)` | Clear one or all tracked streams |
| `setAuth(auth)` | Update handshake auth |
| `authenticateAndConnect(auth)` | `setAuth` + (re)connect |

### SocketIoService - state

| Member | Description |
| --- | --- |
| `connected` | `Signal<boolean>` |
| `recovered` | `Signal<boolean>` |
| `connectionState` | `Signal<SocketConnectionState>` |
| `connected$` / `connectionState$` | Observable mirrors |
| `connect$` | Connect events (+ replay if already connected) |
| `disconnect$` | Disconnect reason stream |
| `connectError$` / `error$` | Handshake / general errors |
| `reconnectAttempt$` / `reconnect$` / `reconnectError$` / `reconnectFailed$` | Manager reconnect lifecycle |

---

## Demo documentation app

Interactive docs live in `projects/demo`:

| Route | Page |
| --- | --- |
| `/` | Overview - install and standalone bootstrap |
| `/guide` | Guide - typing, lifecycle, multi-socket, tests |
| `/playground` | Live chat against the example server |
| `/api` | Advanced - every feature explained with snippets |

```bash
# terminal 1 - example Socket.IO server
npm run example:server

# terminal 2 - docs site
npm start
```

Open [http://localhost:4200](http://localhost:4200).

See [docs/demo.md](docs/demo.md) for local setup and GitHub Pages
(host `examples/chat-server` on HTTPS - Pages cannot run Node).

---

## Browser support

Follows `socket.io-client` browser support. Prefer modern evergreen browsers.
Configure `transports` explicitly when needed (`['websocket', 'polling']` is a good default
behind proxies).

---

## Versioning

Semantic versioning. Current release: **0.1.0**.

Breaking changes are documented in
[`projects/ngxsmk-socket-io/CHANGELOG.md`](projects/ngxsmk-socket-io/CHANGELOG.md).

---

## Security notes

- Prefer short-lived tokens in `auth`
- Do not log authentication payloads
- Validate event payloads on the server; this client does not sanitize message bodies
- Treat realtime input as untrusted

---

## Contributing

1. Fork and clone the repository
2. Run `npm install`
3. Use `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`
4. Open a pull request with a clear description

---

## Scripts

```bash
npm run build              # build the library
npm run build:demo         # build the docs app
npm run build:docs:gh      # GitHub Pages build (optional SOCKET_URL)
npm start                  # serve docs demo
npm run example:server     # example Socket.IO chat server
npm test
npm run test:watch
npm run lint
npm run typecheck
npm run size               # FESM size budget
npm run format
npm run format:check
npm run validate           # lint + typecheck + test + build + size + format
```

---

## License

MIT
