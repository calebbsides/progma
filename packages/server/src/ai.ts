import { OpenRouter } from '@openrouter/sdk'
import type { AiChatPayload } from '@protozoan/core'
import type { FileIndex } from './file-index.js'

const DEFAULT_MODEL = 'openai/gpt-oss-120b:free'

const SYSTEM_PROMPT = `You are Protozoan, an AI assistant embedded in a developer's browser.
The developer is looking at a live web app and asking you to make code changes.
You will be given the contents of relevant source files.

When a "Selected element" is provided, you MUST:
- Restrict ALL changes to the code that renders that specific element and nothing else.
- Do NOT modify surrounding elements, parent components, sibling elements, global styles, or any other file unless the selected element's own rendering code is defined there.
- If the request cannot be satisfied by changing only the selected element's code, say so — do not expand scope.

When asked to make a change:
1. Identify the exact file and lines that render the selected element.
2. Reply with a brief explanation of what you'll do.
3. Then output a unified diff wrapped in a fenced code block tagged \`diff\`.

Example:
\`\`\`diff
--- a/src/components/Header.tsx
+++ b/src/components/Header.tsx
@@ -5,7 +5,7 @@
 export function Header() {
   return (
-    <h1>Hello</h1>
+    <h1>Protozoan</h1>
   )
 }
\`\`\`

If no code change is needed, just answer the question directly without a diff block.
Keep explanations short.`

export async function runAiChat(
  payload: AiChatPayload,
  fileIndex: FileIndex,
): Promise<{ reply: string; diff?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Get a free key at https://openrouter.ai',
    )
  }

  const client = new OpenRouter({ apiKey })
  const model = process.env.PROTOZOAN_MODEL ?? DEFAULT_MODEL

  const files = fileIndex.getRelative().slice(0, 30)
  const fileContents = files
    .map((f) => {
      const content = fileIndex.readFile(f)
      if (!content) return null
      // Escape backtick fences inside file content so they can't break the diff-extraction regex
      const escaped = content.replace(/```/g, '`` `')
      return `### ${f}\n\`\`\`\n${escaped}\n\`\`\``
    })
    .filter(Boolean)
    .join('\n\n')

  const scopeNote = payload.selectedFingerprint
    ? `Selected element (ONLY change code that renders this element): <${payload.selectedFingerprint.tag}> "${payload.selectedFingerprint.textSnippet}"`
    : 'No element selected — use your best judgement about scope.'

  const userMessage = `Current URL: ${payload.currentUrl}
${scopeNote}

Project files:
${files.join('\n')}

File contents:
${fileContents}

Developer request: ${payload.message}`

  const result = await client.chat.send({
    chatRequest: {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    },
  })

  // Both regexes must match the same fence format — update together if changed
  const DIFF_RE_EXTRACT = /```diff\n([\s\S]*?)```/
  const DIFF_RE_STRIP   = /```diff\n[\s\S]*?```/g
  const raw = result.choices[0]?.message?.content ?? ''
  const diff = DIFF_RE_EXTRACT.exec(raw)?.[1]
  const reply = raw.replace(DIFF_RE_STRIP, '').trim()

  if (diff) {
    console.log('[Protozoan] Raw diff from model:\n', diff)
  }

  return { reply, diff }
}
