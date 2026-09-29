export interface DocSeoPage {
  /** Router path without leading slash (`''` for home). */
  path: string;
  title: string;
  description: string;
  /** Comma-separated keywords for this page. */
  keywords: string;
}

export const DOC_SEO_PAGES: readonly DocSeoPage[] = [
  {
    path: '',
    title: 'ngxsmk-socket-io — Angular Socket.IO library',
    description:
      'Modern Angular Socket.IO integration with provideSocketIo, typed events, RxJS Observables, Signals, SSR-safe defaults, and a live docs playground.',
    keywords:
      'angular socket.io, ngxsmk-socket-io, provideSocketIo, angular websocket, socket.io angular library',
  },
  {
    path: 'guide',
    title: 'Guide — typed events, lifecycle, multi-socket | ngxsmk-socket-io',
    description:
      'Learn ngxsmk-socket-io patterns: strongly typed Socket.IO events, connection lifecycle Signals, named sockets, authentication, and unit testing.',
    keywords:
      'angular socket.io guide, typed socket events, injectSocketIo, multi-socket angular, socket.io testing',
  },
  {
    path: 'playground',
    title: 'Live playground — connect, chat, emitWithAck | ngxsmk-socket-io',
    description:
      'Try ngxsmk-socket-io in the browser: connect to a Socket.IO server, send chat messages, authenticate, and verify emitWithAck acknowledgements.',
    keywords: 'socket.io playground, angular realtime demo, emitWithAck, socket.io chat example',
  },
  {
    path: 'api',
    title: 'Advanced API — config, acks, namespaces, SSR | ngxsmk-socket-io',
    description:
      'Full ngxsmk-socket-io feature reference: SocketIoConfig, emitWithAck, timeout, updateConfig, namespaces, lifecycle streams, SSR behaviour, and testing helpers.',
    keywords:
      'ngxsmk-socket-io api, SocketIoService, emitWithAck, updateConfig, socket.io namespace angular, SSR socket.io',
  },
] as const;

export function docSeoForUrl(url: string): DocSeoPage {
  const path = url.split('?')[0].replace(/^\//, '').replace(/\/$/, '');
  return DOC_SEO_PAGES.find((page) => page.path === path) ?? DOC_SEO_PAGES[0];
}
