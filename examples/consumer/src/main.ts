import {
  provideSocketIo,
  SocketIoService,
  injectSocketIo,
  type SocketIoConfig,
} from 'ngxsmk-socket-io';

interface ServerToClientEvents {
  message: (payload: { id: string; text: string }) => void;
  typing: (userId: string) => void;
}

interface ClientToServerEvents {
  sendMessage: (payload: { text: string }) => void;
}

export const config: SocketIoConfig = {
  url: 'http://localhost:3000',
  options: {
    auth: {
      token: 'abc',
    },
  },
};

export const providers = [provideSocketIo(config)];

export function demo(socket: SocketIoService<ServerToClientEvents, ClientToServerEvents>): void {
  socket.fromEvent('message').subscribe((message) => {
    console.log(message.text);
  });

  socket.emit('sendMessage', {
    text: 'Hello',
  });

  socket.connect();
  socket.disconnect();

  const connected = socket.connected();
  const native = socket.getSocket();

  console.log(connected, native.id);
}

export function typedInjectDemo(): void {
  const socket = injectSocketIo<ServerToClientEvents, ClientToServerEvents>();
  demo(socket);
}
