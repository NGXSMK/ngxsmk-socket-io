import { Component } from '@angular/core';
import { CodeBlockComponent } from '../components/code-block.component';

@Component({
  selector: 'app-api-page',
  standalone: true,
  imports: [CodeBlockComponent],
  templateUrl: './api.page.html',
  styleUrl: './docs-page.css',
})
export class ApiPageComponent {
  readonly config = `provideSocketIo({
  url: 'https://api.example.com',
  namespace: '/chat',          // optional; do not also append to url
  autoConnect: false,           // wait for login / Connect button
  options: {
    auth: { token: '…' },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    timeout: 8000,
    path: '/socket.io',
    withCredentials: true,
  },
});`;

  readonly providers = `// Default (unnamed) socket — inject(SocketIoService) or injectSocketIo()
provideSocketIo({ url: 'http://localhost:3000' });

// Named sockets — isolate chat vs notifications
provideSocketIo('chat', { url, namespace: '/chat' });
provideSocketIo('notify', { url: 'http://localhost:3001' });

// NgModule apps
SocketIoModule.forRoot({ url });
SocketIoModule.forFeature('chat', { url, namespace: '/chat' });`;

  readonly typedService = `interface ServerToClientEvents {
  message: (payload: { id: string; text: string }) => void;
  pong: (payload: { ok: boolean; at: number }) => void;
}

interface ClientToServerEvents {
  sendMessage: (payload: { text: string }) => void;
  ping: (
    payload: { id: string },
    ack?: (response: { ok: boolean; at: number }) => void,
  ) => void;
}

const socket = injectSocketIo<ServerToClientEvents, ClientToServerEvents>();

socket.emit('sendMessage', { text: 'hi' });
socket.fromEvent('message').subscribe((m) => m.text);`;

  readonly connection = `socket.connect();      // open (safe to call repeatedly)
socket.disconnect();   // close without destroying the service
socket.open();         // alias of connect()
socket.close();        // alias of disconnect()
socket.isConnected();  // boolean snapshot (prefer connected() Signal in templates)`;

  readonly ack = `const reply = await socket.emitWithAck('ping', { id: crypto.randomUUID() });

const timed = await socket.timeout(2000).emitWithAck('ping', { id: '1' });

socket.timeout(1000).emit('sendMessage', { text: 'hi' });`;

  readonly runtimeConfig = `socket.updateConfig(
  { url: 'https://eu.example.com', options: { auth: { token } } },
  { reconnect: true }, // default — recreate + connect
);

socket.updateConfig({ url: nextUrl }, { reconnect: false });
socket.recreateSocket(false);
socket.connect();`;

  readonly namespaces = `provideSocketIo('chat', { url, namespace: '/chat' });
provideSocketIo('notify', { url, namespace: '/notify' });

const chat = injectSocketIo('chat');
const notify = injectSocketIo('notify');

const admin = socket.of('/admin');`;

  readonly lifecycle = `// Signals (templates / computed)
socket.connected();
socket.recovered();
socket.connectionState(); // disconnected | connecting | connected | reconnecting | error

// Observables (effects / RxJS)
socket.connected$;
socket.connectionState$;
socket.connect$;            // replays if already connected
socket.disconnect$;
socket.connectError$;
socket.error$;
socket.reconnectAttempt$;
socket.reconnect$;
socket.reconnectError$;
socket.reconnectFailed$;`;

  readonly listeners = `socket.fromEvent('message').subscribe(…); // shared; off on last unsubscribe
socket.on('message');                    // alias of fromEvent
socket.once('message').subscribe(…);     // first event, then complete

socket.off('message');
socket.removeAllListeners();`;

  readonly auth = `socket.setAuth({ token });
socket.authenticateAndConnect({ token });

provideSocketIo({ url, autoConnect: false });
await login();
socket.authenticateAndConnect({ token: session.token });`;

  readonly native = `const native = socket.getSocket(); // official socket.io-client instance
native.io.engine;                  // Engine.IO access when needed

const snapshot = socket.getConfig(); // read-only SocketIoConfig`;

  readonly ssr = `provideSocketIo({ url: 'https://api.example.com', autoConnect: true });

// Server / prerender: no Engine.IO connection.
// fromEvent / on / once → EMPTY
// connect / emit → no-op
// getSocket() → throws a clear SSR error`;

  readonly testing = `import {
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
latest().emit('message', { id: '1', text: 'hi' });`;

  readonly surface = `provideSocketIo(config) | provideSocketIo(name, config)
SocketIoModule.forRoot / forFeature
injectSocketIo() | injectSocketIo(name)

connect / disconnect / open / close / isConnected
emit / emitWithAck / timeout(ms)
fromEvent / on / once / off / removeAllListeners
setAuth / authenticateAndConnect
updateConfig / recreateSocket / of(namespace)
getSocket / getConfig
connected / recovered / connectionState (+ $ mirrors)
connect$ / disconnect$ / connectError$ / error$
reconnectAttempt$ / reconnect$ / reconnectError$ / reconnectFailed$`;
}
