# Progma — Implementation Plan

> A framework-agnostic dev server wrapper for front-end engineers: AI-driven code generation + async element annotations. The developer-native equivalent of Figma.

---

## Architecture Overview

Progma sits between the developer and their existing dev server as a transparent proxy. It injects a thin client SDK into every HTML response, which powers the overlay UI. All AI and annotation logic runs server-side; the client is kept as lightweight as possible.

```
Developer's browser
      │
      ▼
┌─────────────┐     WebSocket (Progma channel)
│ Progma      │◄────────────────────────────────┐
│ Server      │                                  │
│ :3000       │──► Proxy all requests ──►        │
└─────────────┘   Underlying dev server    ┌─────┴──────┐
      │           (Vite/Next/Webpack/etc)  │ Progma     │
      │           :3001                    │ Client SDK │
      │                                    │ (injected) │
      ▼                                    └────────────┘
 Anthropic API
 (code generation)
```

**Core packages (monorepo):**

- `@progma/server` — HTTP proxy + WebSocket server + AI integration
- `@progma/client` — Overlay UI injected into every HTML page
- `@progma/cli` — `npx progma dev` entrypoint
- `@progma/core` — Shared types, element fingerprinting, annotation schema

---

## MVP — Prove the Core Loop

**Goal:** A developer can run `npx progma dev` in front of any dev server, click an element to annotate it, and send a chat message that generates a code change applied to disk.

### M1 — Dev Server Proxy

- CLI accepts the underlying dev server command: `npx progma dev -- vite` or `npx progma dev -- next dev`
- Progma spawns the underlying dev server as a child process on a randomized internal port
- Progma's HTTP server proxies all traffic (HTTP + WebSocket) to the underlying server
- WebSocket proxy must be transparent so HMR continues to work without modification
- HTML responses are intercepted and the Progma client script tag is injected before `</body>`

### M2 — Client SDK (Skeleton)

- Served at `/__progma/client.js` from the Progma server
- Establishes a dedicated WebSocket connection back to the Progma server on `/__progma/ws`
- Renders a minimal floating UI: annotation mode toggle button + AI chat panel
- No framework dependencies — vanilla TypeScript compiled to a self-contained bundle

### M3 — Annotation (Basic)

- User clicks the annotation toggle, then clicks any element on the page
- Element is fingerprinted: `{ tag, textContent snippet, DOM path hash, viewport-relative bounding box }`
- Annotation modal appears — user types a note and saves
- Annotations persisted to `.progma/annotations.json` in the project root (written by the server over WebSocket message)
- Annotations re-rendered as pins on page load (matching fingerprint to current DOM)

### M4 — AI Code Generation (Basic)

- User types a message in the AI chat panel (e.g. "make this button red")
- Progma server reads the relevant source file(s) from disk and sends them as context to the Anthropic API
- AI returns a unified diff
- Server applies the diff to disk using a patching library
- HMR in the underlying dev server picks up the file change and hot-reloads — no extra work needed

### M5 — Project File Context

- On startup, Progma indexes the project's source files (respecting `.gitignore`)
- Maintains a simple in-memory map of `{ url path → source file path }` to know which file to send as context when the user is looking at a given page
- File watcher keeps the index fresh

**Exit criteria:**
- [ ] `npx progma dev -- vite` works against a standard Vite + React project
- [ ] HMR still works (file changes hot-reload as normal)
- [ ] Can annotate an element and see the pin persist across page reloads
- [ ] Can type "change the header text to Progma" and see the source file update + page reload

---

## Features

Features are independent of each other unless a dependency is noted. Pick any up after MVP ships.

---

### Feature: Robust Element Fingerprinting

**Why:** Basic DOM-path fingerprinting breaks when components are renamed or restructured. Annotations become orphaned.

- Replace naive DOM path with a composite fingerprint strategy:
  - Primary: `data-progma-id` attribute auto-injected into source files on first annotation (stable across refactors)
  - Fallback: text content + tag + sibling index scoring (fuzzy match on re-render)
- Fingerprint migration: when a `data-progma-id` is found, prefer it over all other strategies

---

### Feature: AI Streaming + Diff Preview

**Why:** Waiting for a full AI response before seeing anything feels slow. Showing the diff before applying prevents unwanted changes.

- Stream the AI response token-by-token to the chat panel via WebSocket
- Include the full component tree of the current page (not just one file) in AI context
- Let the AI request additional files it needs before generating a diff (tool use)
- Show a diff preview in the UI before applying — user confirms or discards

---

### Feature: Annotation UX Polish

**Why:** The MVP annotation UI is minimal. This makes annotations a first-class citizen.

- Annotation sidebar: collapsible panel listing all annotations on the current page
- Annotations are filterable by author
- Annotations support markdown in the body
- Resolved/unresolved state with visual indicator on the pin
- "Generate a fix for this annotation" shortcut that pre-fills the AI chat

---

### Feature: CLI Auto-detection + Config

**Why:** Requiring `-- vite` or `-- next dev` is friction. Most projects have a standard `dev` script.

- `npx progma dev` with no args auto-detects the dev server (checks `package.json` scripts for vite/next/webpack)
- `progma.config.ts` for configuration (port, AI model, ignored paths, annotation storage path)
- Clear startup output: proxy port, underlying server port, Progma dashboard URL

---

### Feature: Annotation Persistence (SQLite)

**Why:** Flat JSON doesn't scale once annotations accumulate or multiple users are involved.

- Migrate from flat JSON to SQLite via `better-sqlite3` (zero-dependency, embedded)
- Schema: `annotations(id, fingerprint, file_path, comment, author, resolved, created_at, updated_at)`
- Enables queries: "all unresolved annotations in this file", "annotations by author"

**Depends on:** Annotation UX Polish (author field needed)

---

### Feature: Local Identity

**Why:** Annotations need an author. Keeps things personal before any server-side auth is introduced.

- On first run, Progma generates a local identity token stored in `~/.progma/identity.json`
- Token contains `{ id, name, color }` — name prompted on first run
- Annotations stamped with author identity

---

### Feature: AI Chat History

**Why:** The MVP chat has no memory. Persisting history lets users resume sessions and review past changes.

- Chat history persisted per-session in SQLite
- Chat panel shows history on re-open
- Each message linked to the diff it produced (if any)

**Depends on:** Annotation Persistence (SQLite)

---

### Feature: Visual Diff Mode

**Why:** After an AI session, it's hard to know what changed. A visual overlay makes it obvious.

- Toggle that highlights elements changed during this session
- Changed elements shown with a colored border (green = added, yellow = modified)
- Clicking a changed element shows the AI prompt that produced the change

**Depends on:** AI Chat History (to link changes back to prompts)

---

### Feature: Progma Dashboard

**Why:** The floating overlay is great for in-context work but a dedicated panel is better for reviewing all annotations and AI history at once.

- Web UI served at `/__progma/dashboard`
- Shows: all annotations, AI chat history, changed files
- Can be opened in a separate tab while working

**Depends on:** Annotation Persistence (SQLite), AI Chat History

---

### Feature: Branch / PR Export

**Why:** AI-applied changes should flow into the normal git workflow, not live in an ephemeral session.

- "Export changes" generates a git branch with all AI-applied changes since session start
- Outputs a summary of changes made (suitable for a PR description)
- Optional: open a GitHub PR directly via GitHub API

---

### Feature: Shared Sessions

**Why:** Collaboration — share a live prototype with a teammate or stakeholder without deploying.

- Progma server can run in "hosted" mode accessible beyond localhost
- Session identified by a short shareable code (e.g. `progma.link/abc123`)
- Guests open the shared URL and see the same prototype with annotations overlaid
- New annotations from participants pushed to all via WebSocket broadcast

**Depends on:** Local Identity, Annotation Persistence (SQLite)

---

## Technical Decisions & Rationale

| Decision | Choice | Why |
|---|---|---|
| Proxy approach | HTTP + WS reverse proxy | Framework-agnostic; HMR works unmodified |
| Client injection | Script tag injected into HTML responses | No browser extension required; zero setup for end user |
| AI provider | Anthropic (claude-sonnet) | Best code generation quality; streaming support |
| Diff application | `diff` + `patch` via `@types/diff` | Language-agnostic; works on any text file |
| Annotation storage | SQLite (`better-sqlite3`) | Embedded, zero-infra, queryable, fast |
| Element targeting | `data-progma-id` + fuzzy fallback | Survives refactors; degrades gracefully |
| Monorepo tooling | pnpm workspaces + tsup | Fast installs, simple bundling |

---

## Repo Structure

```
progma/
├── packages/
│   ├── cli/           # @progma/cli — npx progma dev entrypoint
│   ├── server/        # @progma/server — proxy, WS, AI, annotation API
│   ├── client/        # @progma/client — overlay UI (vanilla TS)
│   └── core/          # @progma/core — shared types, fingerprinting, schema
├── examples/
│   ├── vite-react/    # Example app for testing
│   └── nextjs/        # Example app for testing
├── progma.config.ts   # Example config
├── pnpm-workspace.yaml
└── package.json
```

---

## Out of Scope (for now)

- Real-time multiplayer cursor tracking (Figma-style) — adds significant complexity
- A visual design editor (drag-to-move elements, resize handles) — Progma is code-first
- Cloud hosting / SaaS — local-first; Shared Sessions uses optional hosted mode
- Support for non-web targets (React Native, Electron) — browser only
