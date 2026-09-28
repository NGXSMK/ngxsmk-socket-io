import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../components/code-block.component';

@Component({
  selector: 'app-guide-page',
  standalone: true,
  imports: [CodeBlockComponent, RouterLink],
  templateUrl: './guide.page.html',
  styleUrl: './docs-page.css',
})
export class GuidePageComponent {
  readonly typed = `interface ServerToClientEvents {
  message: (payload: { id: string; text: string }) => void;
}

interface ClientToServerEvents {
  sendMessage: (payload: { text: string }) => void;
}

const socket = injectSocketIo<ServerToClientEvents, ClientToServerEvents>();

socket.fromEvent('message').subscribe((message) => {
  console.log(message.text);
});

socket.emit('sendMessage', { text: 'Hello' });`;

  readonly lifecycle = `socket.connected();          // Signal
socket.connectionState();    // Signal
socket.connectionState$;     // Observable
socket.connect$;             // replays if already connected
socket.authenticateAndConnect({ token });`;

  readonly multi = `provideSocketIo('chat', { url: 'http://localhost:3000', namespace: '/chat' });
provideSocketIo('notify', { url: 'http://localhost:3001' });

const chat = injectSocketIo('chat');
const notify = injectSocketIo('notify');`;

  readonly testing = `import { createMockSocketFactory, SOCKET_IO_CLIENT_FACTORY } from 'ngxsmk-socket-io/testing';

const { factory } = createMockSocketFactory();

TestBed.configureTestingModule({
  providers: [
    provideSocketIo({ url: 'http://localhost:3000', autoConnect: false }),
    { provide: SOCKET_IO_CLIENT_FACTORY, useValue: factory },
  ],
});`;
}
