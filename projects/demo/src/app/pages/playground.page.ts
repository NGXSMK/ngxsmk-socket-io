import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { injectSocketIo } from 'ngxsmk-socket-io';
import { environment } from '../../environments/environment';
import type {
  ChatMessage,
  ClientToServerEvents,
  LifecycleEntry,
  ServerToClientEvents,
} from '../chat.types';

@Component({
  selector: 'app-playground-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './playground.page.html',
  styleUrl: './docs-page.css',
})
export class PlaygroundPageComponent implements OnInit {
  private readonly socket = injectSocketIo<ServerToClientEvents, ClientToServerEvents>();
  private readonly destroyRef = inject(DestroyRef);
  private connectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private appliedUrl = this.normalizeUrl(
    environment.socketUrl || this.socket.getConfig().url || '',
  );

  readonly connected = this.socket.connected;
  readonly connectionState = this.socket.connectionState;
  readonly recovered = this.socket.recovered;
  readonly messages = signal<ChatMessage[]>([]);
  readonly lifecycle = signal<LifecycleEntry[]>([]);
  readonly draft = signal('');
  readonly username = signal(`User-${Math.floor(Math.random() * 1000)}`);
  readonly token = signal('demo-token');
  readonly ackResult = signal<string>('—');
  readonly busy = signal(false);
  /** Editable so GitHub Pages can point at a hosted example server. */
  readonly serverUrl = signal(this.appliedUrl);
  readonly serverHint = signal(this.initialHint());

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.clearConnectTimeout());

    this.socket.connect$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clearConnectTimeout();
      this.busy.set(false);
      this.pushLifecycle(this.socket.recovered() ? 'connect (recovered)' : 'connect');
      this.socket.emit('joinRoom', 'general');
      this.serverHint.set(`Connected to ${this.activeUrl()}. Messages go to room “general”.`);
    });

    this.socket.disconnect$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((reason) => {
      this.clearConnectTimeout();
      this.busy.set(false);
      this.pushLifecycle(`disconnect: ${reason}`);
      this.serverHint.set('Disconnected. Click Connect to rejoin.');
    });

    this.socket.connectError$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      this.clearConnectTimeout();
      this.busy.set(false);
      this.pushLifecycle(`connect_error: ${error.message}`);
      this.serverHint.set(this.unreachableHint(error.message));
    });

    this.socket
      .fromEvent('message')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        this.messages.update((current) => [...current, message]);
      });

    this.socket
      .fromEvent('userJoined')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.messages.update((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            text: `${user.name} joined`,
            user: 'system',
            timestamp: Date.now(),
          },
        ]);
      });

    this.socket
      .fromEvent('pong')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        this.pushLifecycle(`pong ${JSON.stringify(payload)}`);
      });
  }

  connect(): void {
    if (this.busy() || this.connected()) {
      return;
    }

    const url = this.normalizeUrl(this.serverUrl());
    if (!url) {
      this.serverHint.set(
        'Set a Server URL first. On GitHub Pages, host examples/chat-server over HTTPS and paste that URL.',
      );
      return;
    }

    const mixed = this.mixedContentHint(url);
    if (mixed) {
      this.serverHint.set(mixed);
      this.pushLifecycle('blocked: mixed content');
      return;
    }

    this.busy.set(true);
    this.serverHint.set(`Connecting to ${url}…`);
    this.connectTimeoutId = setTimeout(() => {
      if (!this.connected()) {
        this.busy.set(false);
        this.serverHint.set(this.timeoutHint(url));
        this.pushLifecycle('connect timeout');
      }
    }, 9000);

    this.applyServerUrl(url);
    this.socket.connect();
  }

  disconnect(): void {
    this.clearConnectTimeout();
    this.socket.disconnect();
    this.busy.set(false);
  }

  applyAuth(): void {
    if (this.busy()) {
      return;
    }

    const url = this.normalizeUrl(this.serverUrl());
    if (!url) {
      this.serverHint.set('Set a Server URL before authenticateAndConnect.');
      return;
    }

    const mixed = this.mixedContentHint(url);
    if (mixed) {
      this.serverHint.set(mixed);
      return;
    }

    this.busy.set(true);
    this.serverHint.set(`Connecting with auth to ${url}…`);
    this.connectTimeoutId = setTimeout(() => {
      if (!this.connected()) {
        this.busy.set(false);
        this.serverHint.set(this.timeoutHint(url));
        this.pushLifecycle('auth connect timeout');
      }
    }, 9000);

    this.applyServerUrl(url);
    this.socket.authenticateAndConnect({ token: this.token() });
    this.pushLifecycle('authenticateAndConnect requested');
  }

  sendMessage(): void {
    const text = this.draft().trim();
    if (!text) {
      return;
    }

    if (!this.connected()) {
      this.serverHint.set('Connect before sending messages.');
      return;
    }

    this.socket.emit('sendMessage', {
      text,
      user: this.username(),
    });
    this.draft.set('');
  }

  async pingAck(): Promise<void> {
    if (!this.connected()) {
      this.serverHint.set('Connect before calling emitWithAck.');
      return;
    }

    try {
      const reply = await this.socket.timeout(2000).emitWithAck('ping', {
        id: crypto.randomUUID(),
      });
      this.ackResult.set(JSON.stringify(reply));
      this.pushLifecycle('emitWithAck ok');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.ackResult.set(message);
      this.pushLifecycle(`emitWithAck failed: ${message}`);
    }
  }

  private applyServerUrl(url: string): void {
    const urlChanged = this.appliedUrl !== url;
    this.socket.updateConfig({ url, autoConnect: false }, { reconnect: false });
    if (urlChanged) {
      this.socket.recreateSocket(false);
      this.appliedUrl = url;
    }
  }

  private initialHint(): string {
    const url = environment.socketUrl;
    if (environment.production) {
      return url
        ? `Click Connect to talk to ${url} (hosted example server).`
        : 'GitHub Pages is static — paste your hosted HTTPS chat-server URL below, then Connect.';
    }
    return 'Click Connect to talk to http://localhost:3000 (run npm run example:server).';
  }

  private activeUrl(): string {
    return this.normalizeUrl(this.serverUrl()) || this.socket.getConfig().url || '(unknown)';
  }

  private normalizeUrl(value: string): string {
    return value.trim().replace(/\/$/, '');
  }

  private mixedContentHint(url: string): string | null {
    if (typeof location === 'undefined' || location.protocol !== 'https:') {
      return null;
    }
    if (url.startsWith('http://')) {
      return (
        'This docs site is HTTPS, so the Socket.IO server must also be HTTPS. ' +
        'Deploy examples/chat-server to Render/Railway/Fly and use https://…'
      );
    }
    return null;
  }

  private unreachableHint(detail: string): string {
    if (environment.production) {
      return (
        `Could not reach ${this.activeUrl()} (${detail}). ` +
        'Host examples/chat-server on HTTPS, allow CORS, paste the URL above, then Connect again.'
      );
    }
    return (
      `Could not reach ${this.activeUrl()} (${detail}). ` +
      'Run `npm run example:server`, then Connect again.'
    );
  }

  private timeoutHint(url: string): string {
    if (environment.production) {
      return `Connection timed out to ${url}. Is the hosted chat server awake and reachable over HTTPS?`;
    }
    return `Connection timed out to ${url}. Is \`npm run example:server\` running?`;
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeoutId !== null) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
  }

  private pushLifecycle(label: string): void {
    this.lifecycle.update((entries) =>
      [{ id: crypto.randomUUID(), label, at: Date.now() }, ...entries].slice(0, 12),
    );
  }
}
