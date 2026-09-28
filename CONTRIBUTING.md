# Contributing

Thanks for contributing to `ngxsmk-socket-io`.

## Development setup

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Optional checks:

```bash
npm run validate:consumer
npm run validate:angular-matrix
```

## Guidelines

- Keep the public API small and documented
- Prefer peer dependencies for Angular, RxJS, and `socket.io-client`
- Add or update unit tests for behavior changes
- Update [`projects/ngxsmk-socket-io/CHANGELOG.md`](projects/ngxsmk-socket-io/CHANGELOG.md) for user-facing changes
- Do not commit secrets, tokens, or credentials

## Docs / demo

```bash
npm run example:server
npm start
```

See [docs/demo.md](docs/demo.md) and [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md).

## Publishing

```bash
npm run lint
npm run typecheck
npm test
npm run build
cd dist/ngxsmk-socket-io
npm publish
```

Do not publish without reviewing the library changelog and bumping the version in
`projects/ngxsmk-socket-io/package.json`.
