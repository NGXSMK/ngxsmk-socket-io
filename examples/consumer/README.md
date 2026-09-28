# Consumer validation app

Minimal TypeScript project that imports the **built** package the same way an app would:

```ts
import { provideSocketIo, SocketIoService, injectSocketIo } from 'ngxsmk-socket-io';
import { createMockSocketFactory, SOCKET_IO_CLIENT_FACTORY } from 'ngxsmk-socket-io/testing';
```

From the repository root:

```bash
npm run validate:consumer
```

This installs the packed `dist/ngxsmk-socket-io` build into `node_modules` and typechecks the consumer.
