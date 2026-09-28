# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-28

### Added

- Initial public development release of `ngxsmk-socket-io`
- `provideSocketIo` standalone provider API (default and named sockets)
- `SocketIoModule.forRoot` / `forFeature` NgModule API
- `SocketIoService` with RxJS event streams, connection lifecycle, Signals, auth helpers, and native client access
- `emitWithAck()` and `timeout()` helpers
- `updateConfig()` / `recreateSocket()` for dynamic connection setup
- Strongly typed event maps via generics / `injectSocketIo`
- Namespace helper `of('/chat')`
- `authenticateAndConnect()` for post-login connections
- `recovered` signal for Socket.IO connection state recovery
- Connect replay for late subscribers (`connect$`, `fromEvent('connect')`, `once('connect')`)
- Signal-backed `connectionState$` / `connected$` via `toObservable`
- Lazy lifecycle Subjects to reduce idle allocations
- SSR-safe browser-only Socket.IO initialization
- Secondary entry `ngxsmk-socket-io/testing` with mock Socket.IO helpers
- Demo documentation app (Overview, Guide, Playground, Advanced feature walkthrough)
- Bundle size budget (`npm run size`), peer-range CI check, and GitHub Actions CI
- GitHub Pages workflow + configurable hosted Socket.IO URL for the playground

### Fixed / hardened against known `ngx-socket-io` issues

- Missed initial `connect` emissions for late subscribers
- Multi-socket DI registration
- Conditional / manual connection flows
- Auth updates without losing reconnectability after disconnect
- Trailing slash normalization on base URLs
- Shared `fromEvent` listener cleanup with ref-counted `share`
