import { OpenRouter } from '@openrouter/sdk'
import type { AiChatPayload } from '@progma/core'
import type { FileIndex } from './file-index.js'

const DEFAULT_MODEL = 'openai/gpt-oss-120b:free'

const SYSTEM_PROMPT = `You are Progma, an AI assistant embedded in a developer's browser.
The developer is looking at a live web app and asking you to make code changes.
You will be given the contents of relevant source files.

When asked to make a change:
1. Identify the exact file and lines to change.
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
+    <h1>Progma</h1>
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
  const model = process.env.PROGMA_MODEL ?? DEFAULT_MODEL

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

  const userMessage = `Current URL: ${payload.currentUrl}
${payload.selectedFingerprint ? `Selected element: <${payload.selectedFingerprint.tag}> "${payload.selectedFingerprint.textSnippet}"` : ''}

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

  const reply = result.choices[0]?.message?.content ?? ''
  const diffMatch = reply.match(/```diff\n([\s\S]*?)```/)
  const diff = diffMatch?.[1]

  if (diff) {
    console.log('[Progma] Raw diff from model:\n', diff)
  }

  return { reply, diff }
}
