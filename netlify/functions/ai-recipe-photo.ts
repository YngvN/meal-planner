import Anthropic from '@anthropic-ai/sdk'
import type { Config } from '@netlify/functions'
import { getAiImageQuota, incrementAiImageUsage, verifyAndGetProfile } from './_supabaseAdmin'

/**
 * Netlify Function: transcribes a photo of a recipe (cookbook page, card,
 * handwritten note) into a structured recipe draft using Claude vision.
 * Access is limited by per-user quota controlled in admin settings.
 *
 * Body: { imageBase64: string, mediaType: string }
 * Returns: { recipe: { title, description?, portions?, prepTimeMinutes?, cookTimeMinutes?, ingredients[], instructions[] } }
 * Mapped to /api/ai/recipe-photo via the exported config.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const profile = await verifyAndGetProfile(req)
  if (!profile) return new Response('Unauthorized', { status: 401 })

  const quota = await getAiImageQuota()
  if (profile.ai_image_requests_used >= quota) {
    return new Response(
      JSON.stringify({ error: 'quota_exceeded', used: profile.ai_image_requests_used, quota }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('Server is missing ANTHROPIC_API_KEY', { status: 500 })
  }

  const { imageBase64, mediaType } = (await req.json().catch(() => ({}))) as {
    imageBase64?: string
    mediaType?: string
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!imageBase64 || !mediaType || !allowedTypes.includes(mediaType)) {
    return new Response('Invalid or unsupported image', { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  const tool: Anthropic.Tool = {
    name: 'return_recipe',
    description: 'Return the recipe read from the photo as structured data.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        portions: { type: ['number', 'null'], description: 'Number of servings' },
        prepTimeMinutes: { type: ['number', 'null'] },
        cookTimeMinutes: { type: ['number', 'null'] },
        ingredients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit: { type: 'string', description: 'e.g. g, kg, ml, L, tsp, tbsp, cup, pcs' },
            },
            required: ['name', 'quantity', 'unit'],
          },
        },
        instructions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered step descriptions.',
        },
      },
      required: ['title', 'ingredients', 'instructions'],
    },
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'return_recipe' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text:
                'Read this recipe and return it as structured data. ' +
                'Split ingredients into name + numeric quantity + unit (use 1 and "pcs" when no amount is given). ' +
                'List instructions as separate ordered steps. ' +
                'Return ONLY via the return_recipe tool.',
            },
          ],
        },
      ],
    })

    const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) {
      return new Response('Model did not return structured output', { status: 500 })
    }

    await incrementAiImageUsage(profile.id)
    return Response.json({ recipe: toolUse.input })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Recipe transcription failed'
    return new Response(msg, { status: 500 })
  }
}

export const config: Config = { path: '/api/ai/recipe-photo' }
