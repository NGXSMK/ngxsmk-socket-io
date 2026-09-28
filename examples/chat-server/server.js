/**
 * Minimal Socket.IO chat server for the demo app.
 *
 * Run: npm run example:server
 */
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { randomUUID } = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ngxsmk-socket-io example chat server');
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  socket.join('general');
  socket.emit('userJoined', {
    id: socket.id,
    name: `Guest-${socket.id.slice(0, 4)}`,
  });

  socket.on('joinRoom', (room) => {
    socket.join(String(room));
  });

  socket.on('sendMessage', (payload) => {
    const message = {
      id: randomUUID(),
      text: String(payload?.text ?? ''),
      user: String(payload?.user ?? 'anonymous'),
      timestamp: Date.now(),
    };
    io.to('general').emit('message', message);
  });

  socket.on('ping', (payload, ack) => {
    const response = {
      ok: true,
      at: Date.now(),
      echo: payload?.id ?? null,
    };
    if (typeof ack === 'function') {
      ack(response);
    }
    socket.emit('pong', response);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Example chat server listening on http://0.0.0.0:${PORT}`);
});
