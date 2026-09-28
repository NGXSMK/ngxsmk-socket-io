import { demoSocketUrl } from './socket-url';

/**
 * Production / GitHub Pages defaults.
 *
 * GitHub Pages cannot run Node. Host `examples/chat-server` on a free HTTPS
 * host (Render, Railway, Fly.io), then either:
 * - set `SOCKET_URL` when building (`npm run build:docs:gh`), or
 * - paste the URL in the playground “Server URL” field.
 *
 * Must be `https://…` when the docs site is served over HTTPS (mixed content).
 */
export const environment = {
  production: true,
  socketUrl: demoSocketUrl,
  /** Canonical production origin (no trailing slash). */
  siteUrl: 'https://smk-web-projects.github.io/ngxsmk-socket-io',
  siteName: 'ngxsmk-socket-io',
};
