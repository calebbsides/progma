# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

## [0.0.2] — 2026-06-05

### Fixed

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
