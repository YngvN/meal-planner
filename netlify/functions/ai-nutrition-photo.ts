import Anthropic from '@anthropic-ai/sdk'
import type { Config } from '@netlify/functions'
import { getAiImageQuota, incrementAiImageUsage, verifyAndGetProfile } from './_supabaseAdmin'

/**
 * Netlify Function: transcribes a photo of a nutrition label into per-100g
 * nutritional values using Claude vision.
 * Access is limited by per-user quota controlled in admin settings.
 *
 * Body: { imageBase64: string, mediaType: string }
 * Returns: { nutrition: { calories, protein, carbs, fat, fiber } }
 * Mapped to /api/ai/nutrition-photo via the exported config.
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
    name: 'return_nutrition',
    description: 'Return the nutritional values read from the label, normalised to per 100g/100ml.',
    input_schema: {
      type: 'object',
      properties: {
        calories: { type: ['number', 'null'], description: 'kcal per 100g/100ml' },
        protein: { type: ['number', 'null'], description: 'grams per 100g/100ml' },
        carbs: { type: ['number', 'null'], description: 'grams per 100g/100ml' },
        fat: { type: ['number', 'null'], description: 'grams per 100g/100ml' },
        fiber: { type: ['number', 'null'], description: 'grams per 100g/100ml' },
      },
      required: ['calories', 'protein', 'carbs', 'fat', 'fiber'],
    },
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'return_nutrition' },
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
                'Read this nutrition label and return the values per 100g (or per 100ml). ' +
                'If the label only lists per-serving values, convert to per-100g using the serving size. ' +
                'Use null for any value not present. Return ONLY via the return_nutrition tool.',
            },
          ],
        },
      ],
    })

    const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) {
      return new Response('Model did not return structured output', { status: 500 })
    }

    const raw = toolUse.input as Record<string, number | null>
    // Strip nulls so the form only pre-fills detected values.
    const nutrition: Record<string, number> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'number' && !Number.isNaN(value)) nutrition[key] = value
    }

    await incrementAiImageUsage(profile.id)
    return Response.json({ nutrition })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Nutrition transcription failed'
    return new Response(msg, { status: 500 })
  }
}

export const config: Config = { path: '/api/ai/nutrition-photo' }
