# Documentation

Primary documentation lives in the root [README.md](../README.md).

## Local demo

1. Start the example Socket.IO server:

```bash
npm run example:server
```

2. Start the Angular demo:

```bash
npm start
```

3. Open `http://localhost:4200`.

## Publishing

```bash
npm run lint
npm run typecheck
npm test
npm run build
cd dist/ngxsmk-socket-io
npm publish
```

Do not publish without reviewing `CHANGELOG.md` and bumping the library version in `projects/ngxsmk-socket-io/package.json`.
