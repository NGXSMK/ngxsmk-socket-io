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

Publish the **built library** (not the workspace root):

```bash
npm run build
npm publish ./dist/ngxsmk-socket-io --access public
```

Or:

```bash
npm run publish:lib
```

Do **not** use `npm publish --prefix dist/...` from the repo root — newer npm still resolves the private workspace `package.json` and fails with `EPRIVATE`.

If npm asks for a one-time password / browser auth (2FA), complete that prompt in your terminal.

Do not publish without reviewing the library changelog and bumping the version in
`projects/ngxsmk-socket-io/package.json`.
