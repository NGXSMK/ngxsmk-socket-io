/**
 * Writes demoSocketUrl from SOCKET_URL (for GitHub Pages builds).
 *
 * Usage:
 *   SOCKET_URL=https://your-demo.onrender.com node scripts/write-demo-socket-env.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'projects/demo/src/environments/socket-url.ts');
const socketUrl = String(process.env.SOCKET_URL ?? '').trim();

const contents = `/** Overwritten by scripts/write-demo-socket-env.mjs when SOCKET_URL is set. */
export const demoSocketUrl = ${JSON.stringify(socketUrl)};
`;

writeFileSync(target, contents, 'utf8');
console.log(
  socketUrl
    ? `Wrote demoSocketUrl → ${socketUrl}`
    : 'Wrote demoSocketUrl → "" (playground Server URL field required)',
);
