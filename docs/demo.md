# Documentation demo

The Angular app in `projects/demo` is the interactive documentation site for `ngxsmk-socket-io`.

## Pages

| Route         | Purpose                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------- |
| `/`           | Overview — brand, install, standalone bootstrap                                           |
| `/guide`      | Guide — first patterns (typed events, lifecycle, multi-socket, testing)                   |
| `/playground` | Live chat + Server URL + connect / ack / lifecycle log                                    |
| `/api`        | **Advanced** — every feature explained (config, acks, recreate, namespaces, SSR, testing) |

## Features covered in Advanced (`/api`)

1. Providers and DI (`provideSocketIo`, named sockets, NgModule)
2. `SocketIoConfig` (`url`, `namespace`, `autoConnect`, `options`)
3. Strongly typed event maps
4. Connection control (`connect` / `disconnect` / aliases)
5. Emit, `emitWithAck`, and `timeout`
6. Listening (`fromEvent` / `on` / `once` / cleanup)
7. Lifecycle Signals and streams (including connect replay)
8. Authentication helpers
9. Namespaces and multiple sockets
10. Runtime `updateConfig` / `recreateSocket`
11. Native `getSocket()` escape hatch
12. SSR / prerender behaviour
13. `ngxsmk-socket-io/testing` mocks
14. Public surface cheat sheet

## Run locally

```bash
# terminal 1 — example Socket.IO server
npm run example:server

# terminal 2 — docs demo
npm start
```

Open [http://localhost:4200](http://localhost:4200).

## Build

```bash
npm run build:demo
```

Output: `dist/demo`.

## GitHub Pages + playground

GitHub Pages only hosts **static** files. It cannot run `examples/chat-server`. The playground needs a **public HTTPS** Socket.IO server (browsers block `http://` sockets from an `https://` Pages site — mixed content).

### 1. Host the example chat server

Deploy `examples/chat-server` somewhere with HTTPS, for example [Render](https://render.com) using `examples/chat-server/render.yaml`.

CORS is already `origin: '*'`. Free tiers may sleep; the first Connect can take a few seconds to wake.

### 2. Build the docs for GitHub Pages

```bash
# optional but recommended: bake the hosted URL into the build
# PowerShell:
$env:SOCKET_URL="https://YOUR-SERVICE.onrender.com"
npm run build:docs:gh
```

`build:docs:gh` writes `projects/demo/src/environments/socket-url.ts` from `SOCKET_URL`, then builds with `baseHref` `/ngxsmk-socket-io/`.

If `SOCKET_URL` is empty, the playground still works: visitors paste the Server URL on the page.

### 3. Publish `dist/demo/browser`

Use `.github/workflows/github-pages.yml` or copy the build output to the Pages artifact / `gh-pages` branch.

Repo settings → Pages → Source: GitHub Actions (or branch).

Site URL shape: `https://smk-web-projects.github.io/ngxsmk-socket-io/`.

## SEO

The docs app ships with:

- Per-route `<title>`, description, Open Graph, Twitter, and canonical URLs
- JSON-LD (`WebSite`, `WebPage`, `SoftwareSourceCode`)
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, and `og.svg`
- Skip link + semantic landmarks for accessibility/crawlers

After the first GitHub Pages deploy, submit the sitemap in
[Google Search Console](https://search.google.com/search-console):
`https://smk-web-projects.github.io/ngxsmk-socket-io/sitemap.xml`.
