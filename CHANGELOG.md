# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Changed

- **Rename** — App, package names, CSS IDs/classes, CLI binary, env vars, and type names fully renamed from `progma`/`Progma` to `protozoan`/`Protozoan`
  - npm packages: `@progma/*` → `@protozoan/*`, CLI binary `progma` → `protozoan`
  - CSS selectors: `#progma-*` / `.progma-*` → `#protozoan-*` / `.protozoan-*`
  - URL paths: `/__progma/*` → `/__protozoan/*`
  - Env vars: `PROGMA_PORT` → `PROTOZOAN_PORT`, `PROGMA_MODEL` → `PROTOZOAN_MODEL`
  - Storage dir: `.progma/` → `.protozoan/`
  - TypeScript types: `ProgmaMessage`, `ProgmaServer`, `ProgmaSocket`, `dataProgmaId` → `Protozoan*`



- **UX** — FAB now opens a full-screen opaque overlay (modal-style) instead of a small side panel
- **UX** — Element inspection is always active when the overlay is open; hovering any page element highlights it with an indigo outline (Chrome DevTools inspect style)
- **UX** — Clicking an element selects it; a selector badge (`tag#id.class`) appears in the inspect bar showing the active target
- **UX** — Selected element gets a persistent indigo outline + tint so it remains visually distinct from hovered elements
- **UX** — Chat input placeholder updates to reflect the selected element; AI changes are scoped to that element
- **UX** — Clicking the overlay backdrop or the ✕ button closes the overlay and clears hover state
- **UX** — FAB now toggles the overlay closed when clicked while open (previously only opened)
- **Removed** — Annotation mode (inline annotation pins + modal) has been removed in favour of the new selection-based chat flow

### Fixed

- **patcher** — Pure-addition diffs (no `-` lines) no longer corrupt the target file by prepending content at byte 0; they now fall back cleanly to an error
- **patcher** — `applySimpleReplacement` now detects ambiguous matches (same before-block appearing more than once in the file) and refuses rather than silently patching the wrong location
- **patcher** — Trimmed-end whitespace fallback no longer strips trailing whitespace from the entire file; only the matched region is replaced in the original content
- **client** — Closing the overlay now clears the per-element thread cache, preventing unbounded memory growth across repeated open/close cycles

## [0.0.1] — 2026-06-05 (protozoan)

### Changed

- **Packaging** — renamed npm package from `@calebbsides/progma` to `protozoan` (unscoped) to resolve publish issues; version reset to `0.0.1`

## [0.0.3] — 2026-06-05

### Changed

- **UX** — system messages (HMR status) are now left-aligned like AI bubbles instead of centered
- **UX** — AI reply no longer includes the raw diff block; only the plain-text explanation is shown in the chat panel

### Fixed

- **Correctness** — client: `addMessage` is now guarded against empty string; when the model returns only a diff with no prose, no blank bubble is rendered
- **Correctness** — server `ai.ts`: diff-fence regexes named (`DIFF_RE_EXTRACT` / `DIFF_RE_STRIP`) and co-located with a comment to prevent silent drift on future pattern changes

## [0.0.2] — 2026-06-05

### Added

- **Packaging** — `progma` npm package: single self-contained binary; server, client overlay, and all workspace deps bundled into `dist/cli.js` via tsup (CJS format for full Node.js compatibility); client IIFE inlined at build time via esbuild plugin; no sub-packages published
- `LICENSE` (MIT)

### Changed

- **UX** — startup output simplified: single `✦ Progma running at http://localhost:<port>` message printed once the proxy is actually bound; internal port and intermediate logs removed
- **UX** — "waiting for HMR…" message now resolves to "✓ Updated" once Vite fires `vite:afterUpdate`, with a 5s fallback to "✓ Applied" for non-Vite dev servers

### Fixed

- **Correctness** — `server.ts`: `res.end(clientScript)` corrected to `res.end(this.clientScript)`; bare identifier was unresolvable and would have thrown `ReferenceError` on every `/__progma/client.js` request, preventing the overlay from ever loading
- **Security** — `FileIndex.readFile`/`writeFile`: added path-traversal guard; paths resolving outside `projectRoot` are now rejected
- **Security** — `client/index.ts`: `dataProgmaId` is now escaped before use in `querySelector` to prevent CSS selector injection
- **Correctness** — `server.ts`: `proxyAndInject` now sets `accept-encoding: identity` on upstream requests and strips `content-encoding` from responses, preventing garbled output when upstream uses gzip
- **Correctness** — `server.ts`: request body is now buffered before proxying so the error-path fallback to `proxy.web` is not sent an already-consumed stream
- **Correctness** — `server.ts`: `close()` now terminates all WebSocket clients and closes `WebSocketServer`, allowing clean process exit
- **Correctness** — `server.ts`: HTML injection now targets the last `</body>` (via `lastIndexOf`) instead of the first, avoiding injection inside script strings
- **Correctness** — `server.ts`: async `handleWsMessage` is now wrapped with `.catch()` on the `ws.on('message')` listener to prevent unhandled promise rejections crashing the process
- **Correctness** — `server.ts`: upstream WebSocket error handler added (`socket.on('error', destroy)`) to avoid unhandled errors on HMR proxy failures
- **Correctness** — `annotations.ts`: `getForPage(url)` now correctly filters by `fingerprint.pageUrl === url`
- **Correctness** — `patcher.ts`: trimmed-match fallback in `applySimpleReplacement` now uses the trimmed strings for the actual replacement instead of the original untrimmed block (was a dead-code no-op)
- **Correctness** — `file-index.ts`: `index()` is now called with a `.catch()` handler so glob errors surface instead of silently becoming unhandled rejections; `ready` promise exposed for consumers that need to wait for initial scan
- **Correctness** — `ai.ts`: backtick triple-fences inside file contents are escaped before embedding in the prompt, preventing the diff-extraction regex from matching file content instead of the model's diff
- **Correctness** — `client/socket.ts`: added no-op `error` event listener on WebSocket to prevent unhandled-error throws before the `close` reconnect handler fires
- **Correctness** — `client/index.ts`: added handler for `ai:patch:applied` broadcast message so other connected tabs get a notification
- **Correctness** — `cli.ts`: `PROGMA_PORT` is now validated (`parseInt` with radix 10, NaN/range check, fallback to 3000 with a warning)
- **Reliability** — `cli.ts`: replaced fixed 1500 ms startup delay with a TCP port poll (`waitForPort`) that starts proxying as soon as the dev server is actually listening

## [0.0.1] — 2026-06-05

### Added

- `@progma/core` — shared types (`ElementFingerprint`, `Annotation`, `ProgmaMessage`), `hashString`, `fingerprintsMatch`
- `@progma/server` — HTTP reverse proxy + WebSocket server, annotation store (`.progma/annotations.json`), source file indexer with `chokidar` watcher, AI chat handler, unified diff patcher with 4-stage fallback strategy
- `@progma/client` — self-contained IIFE browser bundle (14KB); overlay UI with toggle button, AI chat panel, annotate mode, annotation pins, auto-reconnecting WebSocket
- `@progma/cli` — `progma dev -- <command>` entrypoint; loads `.env` from cwd, resolves local `node_modules/.bin` so dev server binaries work without global install, supports `PROGMA_PORT` and `PROGMA_MODEL` env overrides
- AI integration via OpenRouter using `@openrouter/sdk`; default model `openai/gpt-oss-120b:free`; model overridable via `PROGMA_MODEL`
- Unit tests (Vitest) — `hashString`, `fingerprintsMatch`, patcher fallback strategies, annotation store persistence
- Integration tests (Vitest) — full WebSocket message lifecycle against a real server with mocked AI
- E2E tests (Playwright / Chromium) — overlay injection, toggle, annotate mode, chat panel, proxy transparency
- `examples/vite-react` — Vite + React scaffold for local testing (gitignored)
- `.env.example` documenting all environment variables
