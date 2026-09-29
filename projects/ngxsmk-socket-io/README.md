# ngxsmk-socket-io

Modern Angular integration for Socket.IO - DI providers, typed events, RxJS + Signals, acks,
namespaces, SSR-safe defaults, and a testing entry.

**Angular 16+** · **Ionic Angular 7–9** (on supported Angular versions)

Full documentation:

- **Live docs:** https://smk-web-projects.github.io/ngxsmk-socket-io/
- **Compatibility:** https://github.com/SMK-WEB-Projects/ngxsmk-socket-io/blob/main/docs/COMPATIBILITY.md
- **Repo README:** https://github.com/SMK-WEB-Projects/ngxsmk-socket-io#readme

## Install

```bash
npm install ngxsmk-socket-io socket.io-client
```

**Peers:** `@angular/core` ≥16 · `@angular/common` ≥16 · `rxjs` ≥7.8 · `socket.io-client` ^4

## Quick start

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideSocketIo, injectSocketIo } from 'ngxsmk-socket-io';

bootstrapApplication(AppComponent, {
  providers: [
    provideSocketIo({
      url: 'http://localhost:3000',
      autoConnect: true,
      options: { transports: ['websocket', 'polling'] },
    }),
  ],
});

// In a component / service:
const socket = injectSocketIo();
socket.fromEvent('message').subscribe(console.log);
socket.emit('sendMessage', { text: 'Hello' });
```

## Ionic (standalone)

```ts
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideSocketIo } from 'ngxsmk-socket-io';

export const appConfig = {
  providers: [
    provideIonicAngular(),
    provideSocketIo({
      url: 'https://api.example.com',
      autoConnect: false,
      options: { transports: ['websocket', 'polling'] },
    }),
  ],
};
```

## Feature overview

| Area          | APIs                                                                         |
| ------------- | ---------------------------------------------------------------------------- |
| Providers     | `provideSocketIo`, `SocketIoModule.forRoot` / `forFeature`, `injectSocketIo` |
| Emit / listen | `emit`, `emitWithAck`, `timeout`, `fromEvent`, `on`, `once`, `off`           |
| State         | `connected`, `recovered`, `connectionState` (+ `$` Observables)              |
| Lifecycle     | `connect$`, `disconnect$`, `connectError$`, reconnect streams                |
| Auth          | `setAuth`, `authenticateAndConnect`                                          |
| Multi-socket  | named `provideSocketIo(name, ...)`, `of(namespace)`                          |
| Runtime       | `updateConfig`, `recreateSocket`, `getConfig`, `getSocket`                   |
| Testing       | `ngxsmk-socket-io/testing` → `createMockSocketFactory`                       |

## Typed events

```ts
interface ServerToClientEvents {
  message: (payload: { text: string }) => void;
}
interface ClientToServerEvents {
  sendMessage: (payload: { text: string }) => void;
}

const socket = injectSocketIo<ServerToClientEvents, ClientToServerEvents>();
socket.emit('sendMessage', { text: 'Hi' });
```

## Acknowledgements

```ts
const reply = await socket.emitWithAck('ping', { id: '1' });
const timed = await socket.timeout(2000).emitWithAck('ping', { id: '1' });
```

## Testing

```ts
import { createMockSocketFactory, SOCKET_IO_CLIENT_FACTORY } from 'ngxsmk-socket-io/testing';

const { factory, latest } = createMockSocketFactory();
// provide factory next to provideSocketIo in TestBed…
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT
