import Anthropic from '@anthropic-ai/sdk'
import type { Config } from '@netlify/functions'
import { verifyAndGetProfile } from './_supabaseAdmin'

/**
 * Netlify Function: translates a set of text fields into multiple languages.
 * Restricted to admin-role users.
 *
 * Body: { fields: Record<string,string>, arrayFields?: Record<string,string[]>, targetLanguages: string[] }
 * Returns: { translations: { [lang]: { fields, arrayFields } } }
 *
 * The Anthropic API key is read from the environment and never reaches the client.
 * Mapped to /api/ai/translate via the exported config.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const profile = await verifyAndGetProfile(req)
  if (!profile) return new Response('Unauthorized', { status: 401 })
  if (profile.role !== 'admin') return new Response('Forbidden — admin role required', { status: 403 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('Server is missing ANTHROPIC_API_KEY', { status: 500 })
  }

  const { fields, arrayFields, targetLanguages } = (await req.json().catch(() => ({}))) as {
    fields?: Record<string, string>
    arrayFields?: Record<string, string[]>
    targetLanguages?: string[]
  }

  if (!fields || typeof fields !== 'object' || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
    return new Response('Invalid request body', { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  // Tool schema forces structured JSON output keyed by language code.
  const tool: Anthropic.Tool = {
    name: 'return_translations',
    description: 'Return the translated fields for every requested language.',
    input_schema: {
      type: 'object',
      properties: {
        translations: {
          type: 'object',
          description: 'Keyed by language code. Each value has the same field keys as the input.',
          additionalProperties: {
            type: 'object',
            properties: {
              fields: { type: 'object', additionalProperties: { type: 'string' } },
              arrayFields: {
                type: 'object',
                additionalProperties: { type: 'array', items: { type: 'string' } },
              },
            },
            required: ['fields'],
          },
        },
      },
      required: ['translations'],
    },
  }

  const prompt = [
    'Translate the following culinary fields into each of these language codes:',
    targetLanguages.join(', '),
    '',
    'Single-value fields (JSON):',
    JSON.stringify(fields, null, 2),
    arrayFields && Object.keys(arrayFields).length > 0
      ? `\nArray fields (JSON, preserve order and length):\n${JSON.stringify(arrayFields, null, 2)}`
      : '',
    '',
    'Rules:',
    '- Preserve the exact same field keys in the output.',
    '- For the language that matches the source text, return the text unchanged.',
    '- Use natural, idiomatic culinary terms.',
    '- Return ONLY via the return_translations tool.',
  ].join('\n')

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'return_translations' },
      messages: [{ role: 'user', content: prompt }],
    })

    const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) {
      return new Response('Model did not return structured output', { status: 500 })
    }

    return Response.json(toolUse.input)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Translation failed'
    return new Response(msg, { status: 500 })
  }
}

export const config: Config = { path: '/api/ai/translate' }
