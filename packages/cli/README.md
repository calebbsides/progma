# @calebbsides/progma

AI-powered dev overlay — wrap any dev server with a chat panel and element annotation tools.

## Install

```bash
npm install -g @calebbsides/progma
```

Or run without installing:

```bash
npx @calebbsides/progma dev -- vite
```

## Usage

```bash
progma dev -- <your-dev-server-command>

# Examples
progma dev -- vite
progma dev -- next dev
progma dev -- webpack serve
progma dev -- npm run dev
```

Progma starts on port `3000` by default and proxies your dev server transparently. Open `http://localhost:3000` — your app loads normally with a Progma toolbar injected in the corner.

## Setup

Set your OpenRouter API key ([free tier available](https://openrouter.ai)):

```bash
export OPENROUTER_API_KEY=sk-or-...
```

Or add it to a `.env` file in your project root.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | — | Required. Your OpenRouter API key. |
| `PROGMA_PORT` | `3000` | Port for the Progma proxy. |
| `PROGMA_MODEL` | `openai/gpt-oss-120b:free` | Any [OpenRouter model](https://openrouter.ai/models). |

## What it does

- **AI chat** — describe a change in plain language, Progma applies a diff to your source files and your existing HMR picks it up instantly
- **Annotations** — click any element on the page to leave a persistent note pinned to that element; annotations survive reloads and are stored in `.progma/annotations.json`

## Full docs

See the [repository README](https://github.com/calebbsides/progma#readme) for complete documentation.
