# Compatibility

`ngxsmk-socket-io` targets **every currently supported Angular generation that provides Signals**,
and the Ionic Angular majors that run on those Angular versions.

## Why Angular 16+?

The library uses:

| API | Minimum Angular |
| --- | --- |
| `signal()` / `WritableSignal` | 16 |
| `DestroyRef` | 16 |
| `toObservable(..., { injector })` | 16 |
| `makeEnvironmentProviders` / `provideSocketIo` | 15 |
| `inject()` | 14 |

Signals and `DestroyRef` set the floor at **Angular 16**. Older Angular apps should stay on a
legacy Socket.IO wrapper, or upgrade Angular (recommended).

## Angular support matrix

| Angular | Peer range | CI matrix | Notes |
| --- | --- | --- | --- |
| 16.x | ✅ | ✅ | Minimum supported |
| 17.x | ✅ | ✅ | |
| 18.x | ✅ | ✅ | |
| 19.x | ✅ | ✅ | Workspace builds on 19 |
| 20.x | ✅ | ✅ | |
| 21.x / 22.x | ✅ (peer `>=16`) | best-effort | Open peer; report regressions |

Declared peers:

```json
{
  "@angular/core": ">=16.0.0",
  "@angular/common": ">=16.0.0",
  "rxjs": ">=7.8.0",
  "socket.io-client": "^4.0.0"
}
```

Validate locally against the matrix:

```bash
npm run build
npm run validate:angular-matrix
# or a single major:
node scripts/validate-angular-matrix.mjs --angular=18
```

## Ionic support matrix

Ionic Angular tracks Angular. With Angular 16+ peers, the library covers:

| Ionic Angular | Angular range (Ionic policy) | `ngxsmk-socket-io` |
| --- | --- | --- |
| **v9** | Angular 18 → 22 | ✅ use Angular 18+ |
| **v8** | Angular 16 → 20 | ✅ |
| **v7** | Angular 14 → 17 | ✅ when the app uses Angular **16 or 17** |
| v6 and older | Angular ≤15 | ❌ below Signals / DestroyRef floor |

### Ionic usage (standalone)

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideSocketIo } from 'ngxsmk-socket-io';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes),
    provideSocketIo({
      url: 'https://api.example.com',
      autoConnect: false,
      options: {
        // Capacitor / mobile networks: allow polling fallback
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        timeout: 10000,
      },
    }),
  ],
};
```

```ts
// feature page / service
import { inject } from '@angular/core';
import { injectSocketIo } from 'ngxsmk-socket-io';

export class ChatService {
  private readonly socket = injectSocketIo();

  connect(token: string): void {
    this.socket.authenticateAndConnect({ token });
  }
}
```

### Ionic tips

- Prefer `autoConnect: false` and connect after auth / `Platform.ready()` / network restore.
- Keep `transports: ['websocket', 'polling']` for flaky mobile networks and proxies.
- Use Signals (`connected()`, `connectionState()`) in Ionic templates — no Zone.js requirement.
- Native WebSocket plugins are not required; `socket.io-client` uses the browser/WebView APIs.
- For Capacitor live reload over HTTP while the API is HTTPS, watch mixed-content rules.

## Runtime / tooling

| Tooling | Notes |
| --- | --- |
| Ivy partial compilation | Library ships partial-Ivy (ng-packagr) for all Angular 16+ apps |
| Zone.js | Optional — Signals work zoneless / Ionic standalone |
| SSR / Angular Universal | Supported — no socket created on the server |
| Node (CI / apps) | Follow the Angular version’s Node requirements |

## Reporting gaps

If a new Angular or Ionic major breaks compilation or runtime, open an issue with:

1. Angular version (`ng version`)
2. Ionic version (`@ionic/angular` from package.json), if applicable
3. Exact compiler / runtime error
