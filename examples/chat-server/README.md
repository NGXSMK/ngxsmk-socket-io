# Example chat server

Minimal Socket.IO server used by the docs playground (`projects/demo`).

## Events

| Direction | Event | Payload |
| --- | --- | --- |
| Client → server | `joinRoom` | `string` room name |
| Client → server | `sendMessage` | `{ text, user }` |
| Client → server | `ping` | `{ id }` + optional ack |
| Server → client | `userJoined` | `{ id, name }` |
| Server → client | `message` | `{ id, text, user, timestamp }` |
| Server → client | `pong` | `{ ok, at, echo }` |

On connect the socket joins room `general` and receives a `userJoined` event.

## Run locally

From the repository root:

```bash
npm run example:server
```

Listens on `http://0.0.0.0:3000` (override with `PORT`).

## Deploy (GitHub Pages playground)

GitHub Pages cannot run this process. Host it on Render / Railway / Fly with **HTTPS**, then paste the URL into the playground Server URL field (or set `SOCKET_URL` when building docs).

See `render.yaml` in this folder and [docs/demo.md](../../docs/demo.md).
