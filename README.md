# Protozoan

**The developer-native alternative to Figma.**

Protozoan wraps your existing dev server and adds an AI-powered overlay for rapid prototyping and async collaboration — without leaving your codebase. Describe a change in plain language, see it applied to your source files instantly, and leave annotated feedback pinned to live elements on the page.

---

## How it works

Protozoan acts as a transparent proxy in front of any dev server. It injects a lightweight overlay into every page that gives you:

- **AI chat** — describe what you want, get a code diff applied to disk. Your existing HMR picks it up automatically.
- **Element annotations** — click any element, leave a note. Pins persist across reloads and survive refactors.

Your source files are the source of truth. Protozoan never touches your build config, framework, or toolchain.

---

## Prerequisites

- Node.js 18 or later
- An existing front-end project with a dev server (Vite, Next.js, Webpack, CRA — anything)
- An [OpenRouter API key](https://openrouter.ai) (free tier available)

---

## Installation

Protozoan can be used without installing globally via `npx`:

```bash
npx protozoan dev
```

Or install globally:

```bash
npm install -g protozoan
```

---

## Getting Started

### 1. Set your API key

Protozoan uses [OpenRouter](https://openrouter.ai) for AI code generation. A free tier is available — no credit card required.

```bash
export OPENROUTER_API_KEY=sk-or-...
```

To persist this across sessions, add it to your shell profile (`.bashrc`, `.zshrc`, etc.) or a `.env` file in your project root.

### 2. Navigate to your project

```bash
cd my-frontend-app
```

### 3. Start Protozoan

**Auto-detect (recommended):** Protozoan will inspect your `package.json` and start your dev server automatically.

```bash
npx protozoan dev
```

**Explicit command:** Pass your dev server command directly after `--`.

```bash
npx protozoan dev -- vite
npx protozoan dev -- next dev
npx protozoan dev -- webpack serve
npx protozoan dev -- npm run dev
```

### 4. Open your browser

Protozoan starts on port `3000` by default. Open:

```
http://localhost:3000
```

Your app loads exactly as it normally would — with a Protozoan toolbar in the corner.

> Your underlying dev server runs on a separate port chosen automatically by Protozoan. HMR, fast refresh, and all dev server features continue to work as normal.

---

## Using the Overlay

### AI Code Generation

1. Open the **AI chat panel** from the Protozoan toolbar (bottom-right).
2. Describe the change you want in plain language:
   - *"Make the navbar sticky and add a drop shadow"*
   - *"Replace the hero section placeholder text with lorem ipsum"*
   - *"Add a loading spinner to the submit button"*
3. Protozoan sends your message along with the relevant source files to Claude.
4. A **diff preview** appears — review the changes before applying.
5. Click **Apply** to write the changes to disk. Your dev server hot-reloads automatically.

The AI has access to your full source file context and can make changes across multiple files in a single prompt.

### Annotations

1. Click the **annotation icon** in the Protozoan toolbar to enter annotation mode.
2. Click any element on the page. A pin appears and a note editor opens.
3. Type your feedback and save. The pin persists on that element across page reloads.
4. Click any pin to read, edit, or resolve the annotation.
5. Use the **annotation sidebar** to see all notes on the current page.

To generate a code change from an annotation, open a pin and click **"Fix with AI"** — it pre-fills the chat with the annotation context.

---

## Configuration

Protozoan is configured via environment variables — set them in your shell or a `.env` file in your project root:

```bash
# Required
OPENROUTER_API_KEY=sk-or-...

# Optional
PROTOZOAN_PORT=3000                          # proxy port (default: 3000)
PROTOZOAN_MODEL=openai/gpt-4o               # any OpenRouter model (default: openai/gpt-oss-120b:free)
```

---

## Project Structure After Setup

Running Protozoan for the first time creates a `.protozoan/` directory in your project root:

```
my-frontend-app/
├── .protozoan/
│   └── annotations.json   # annotation storage (commit this to share with your team)
├── protozoan.config.ts        # optional config
└── ... (your existing project)
```

Add `.protozoan/annotations.json` to version control so teammates see your annotations. Add `protozoan.config.ts` to share configuration across the team.

---

## Sharing Annotations with Your Team

Annotations are stored in `.protozoan/annotations.json`. Commit this file to your repo so everyone working on the project sees the same pins when they run Protozoan.

```bash
git add .protozoan/annotations.json
git commit -m "chore: add protozoan annotations"
```

---

## Troubleshooting

**HMR stopped working after adding Protozoan**

Make sure your dev server is being started through Protozoan, not separately. If you already have a dev server running on port 3000, Protozoan will pick a different port — check the terminal output for the actual URL.

**"Could not detect dev server" error**

Pass your dev server command explicitly:

```bash
npx protozoan dev -- <your-dev-command>
```

**AI changes aren't applying**

- Check that `OPENROUTER_API_KEY` is set in your environment.
- Make sure your source files are not inside `node_modules` or another ignored path.
- Check that the file Protozoan is targeting is writable.

**Annotations aren't appearing after reload**

Annotations are matched to elements using fingerprinting. If the element's text content or structure changed significantly, the pin may not re-attach. Resolve the old annotation and create a new one on the updated element.

---

## FAQ

**Does Protozoan modify my build config or framework setup?**

No. Protozoan is a proxy — it sits in front of your existing dev server and doesn't touch your Vite config, Next.js config, or any other toolchain file.

**Do I need to install anything in my project?**

No. Protozoan injects its client script at runtime. There's nothing to add to your `package.json` or import into your code.

**Is my code sent to an AI provider?**

The relevant source files for the current page are sent to OpenRouter when you use the AI chat. No code is sent unless you actively submit a prompt. See [OpenRouter's privacy policy](https://openrouter.ai/privacy) for details on data handling.

**Does it work with TypeScript projects?**

Yes. Protozoan applies diffs to your source files as-is — it doesn't compile or transform them. Your existing build toolchain handles TypeScript as it normally would.