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

## Guidelines

- Keep the public API small and documented
- Prefer peer dependencies for Angular, RxJS, and `socket.io-client`
- Add or update unit tests for behavior changes
- Update `CHANGELOG.md` for user-facing changes
- Do not commit secrets, tokens, or credentials
