import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideSocketIo } from 'ngxsmk-socket-io';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { DEMO_SOCKET_URL } from './demo.tokens';

/** Empty on GitHub Pages until SOCKET_URL is baked in or set in the playground. */
const socketUrl = environment.socketUrl;

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    { provide: DEMO_SOCKET_URL, useValue: socketUrl },
    provideSocketIo({
      url: socketUrl || 'http://localhost:3000',
      autoConnect: false,
      options: {
        // Allow polling fallback — websocket-only often hangs behind proxies/firewalls.
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        timeout: 8000,
      },
    }),
  ],
};
