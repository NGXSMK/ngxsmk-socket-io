/**
 * Typechecks the built package against multiple Angular major versions.
 *
 * Usage (from repo root, after `npm run build`):
 *   node scripts/validate-angular-matrix.mjs
 *   node scripts/validate-angular-matrix.mjs --angular=18
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distPkg = join(root, 'dist', 'ngxsmk-socket-io');
const workRoot = join(root, '.tmp', 'angular-matrix');

/** @type {Array<{ id: string, angular: string, typescript: string, moduleResolution: string }>} */
const MATRIX = [
  {
    id: '16',
    angular: '16.2.12',
    typescript: '5.1.6',
    moduleResolution: 'node',
  },
  {
    id: '17',
    angular: '17.3.12',
    typescript: '5.4.5',
    moduleResolution: 'node',
  },
  {
    id: '18',
    angular: '18.2.13',
    typescript: '5.5.4',
    moduleResolution: 'bundler',
  },
  {
    id: '19',
    angular: '19.2.14',
    typescript: '5.7.3',
    moduleResolution: 'bundler',
  },
  {
    id: '20',
    angular: '20.3.2',
    typescript: '5.8.3',
    moduleResolution: 'bundler',
  },
];

const onlyArg = process.argv.find((arg) => arg.startsWith('--angular='));
const onlyId = onlyArg ? onlyArg.slice('--angular='.length) : null;
const selected = onlyId ? MATRIX.filter((entry) => entry.id === onlyId) : MATRIX;

if (onlyId && selected.length === 0) {
  console.error(`Unknown Angular matrix id "${onlyId}". Expected one of: ${MATRIX.map((m) => m.id).join(', ')}`);
  process.exit(1);
}

if (!existsSync(join(distPkg, 'package.json'))) {
  console.error('Missing dist/ngxsmk-socket-io. Run `npm run build` first.');
  process.exit(1);
}

const consumerSource = `import {
  provideSocketIo,
  SocketIoService,
  injectSocketIo,
  type SocketIoConfig,
} from 'ngxsmk-socket-io';
import { createMockSocketFactory, SOCKET_IO_CLIENT_FACTORY } from 'ngxsmk-socket-io/testing';

interface ServerToClientEvents {
  message: (payload: { id: string; text: string }) => void;
}

interface ClientToServerEvents {
  sendMessage: (payload: { text: string }) => void;
  ping: (
    payload: { id: string },
    ack?: (response: { ok: boolean }) => void,
  ) => void;
}

export const config: SocketIoConfig = {
  url: 'http://localhost:3000',
  autoConnect: false,
  options: {
    auth: { token: 'demo' },
    transports: ['websocket', 'polling'],
  },
};

export const providers = [
  provideSocketIo(config),
  provideSocketIo('chat', { url: 'http://localhost:3000', namespace: '/chat' }),
];

export function demo(socket: SocketIoService<ServerToClientEvents, ClientToServerEvents>): void {
  socket.fromEvent('message').subscribe((message) => {
    console.log(message.text);
  });
  socket.emit('sendMessage', { text: 'Hello' });
  void socket.emitWithAck('ping', { id: '1' });
  void socket.timeout(1000).emitWithAck('ping', { id: '2' });
  socket.updateConfig({ url: 'http://localhost:3001' }, { reconnect: false });
  socket.recreateSocket(false);
  socket.connect();
  socket.disconnect();
  const child = socket.of('/admin');
  console.log(socket.connected(), socket.connectionState(), child.getConfig().namespace);
}

export function typedInjectDemo(): void {
  const socket = injectSocketIo<ServerToClientEvents, ClientToServerEvents>('chat');
  demo(socket);
}

export function testingDemo(): void {
  const { factory, latest } = createMockSocketFactory();
  console.log(typeof factory, typeof latest, SOCKET_IO_CLIENT_FACTORY);
}
`;

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      npm_config_fund: 'false',
      npm_config_audit: 'false',
      npm_config_progress: 'false',
    },
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(' ')}`);
  }
}

mkdirSync(workRoot, { recursive: true });

let failed = 0;
for (const entry of selected) {
  const dir = join(workRoot, `ng${entry.id}`);
  console.log(`\n=== Angular ${entry.id} (@angular/core@${entry.angular}) ===`);

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'src'), { recursive: true });

  const packageJson = {
    name: `ngxsmk-socket-io-matrix-ng${entry.id}`,
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      typecheck: 'tsc -p tsconfig.json --noEmit',
    },
    dependencies: {
      '@angular/common': entry.angular,
      '@angular/core': entry.angular,
      'ngxsmk-socket-io': `file:${distPkg.replace(/\\/g, '/')}`,
      rxjs: '~7.8.1',
      'socket.io-client': '4.8.1',
      tslib: '^2.6.3',
    },
    devDependencies: {
      typescript: entry.typescript,
    },
  };

  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: entry.moduleResolution,
      strict: true,
      skipLibCheck: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: false,
      lib: ['ES2022', 'DOM'],
      types: [],
    },
    include: ['src/**/*.ts'],
  };

  writeFileSync(join(dir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  writeFileSync(join(dir, 'tsconfig.json'), `${JSON.stringify(tsconfig, null, 2)}\n`);
  writeFileSync(join(dir, 'src', 'main.ts'), consumerSource);

  try {
    run(npmCmd, ['install', '--no-package-lock'], dir);
    run(npmCmd, ['run', 'typecheck'], dir);
    console.log(`✓ Angular ${entry.id} typecheck passed`);
  } catch (error) {
    failed += 1;
    console.error(`✗ Angular ${entry.id} failed`);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  console.error(`\nMatrix finished with ${failed} failure(s).`);
  process.exit(1);
}

console.log(`\nAll ${selected.length} Angular matrix target(s) passed.`);
