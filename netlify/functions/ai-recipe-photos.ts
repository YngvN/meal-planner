import Anthropic from '@anthropic-ai/sdk'
import type { Config } from '@netlify/functions'
import { getAiImageQuota, incrementAiImageUsage, verifyAndGetProfile } from './_supabaseAdmin'

const MAX_IMAGES = 6
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type AllowedType = (typeof ALLOWED_TYPES)[number]

/**
 * Netlify Function: transcribes multiple recipe photos (e.g. several cookbook
 * pages) into a single structured recipe draft using Claude vision.
 *
 * All images are sent in one Claude request so the model sees the full recipe
 * in context and can combine information across pages.
 *
 * Body: { images: Array<{ imageBase64: string; mediaType: string }> }
 * Returns: { recipe: RecipeDraft }
 * Mapped to /api/ai/recipe-photos via the exported config.
 */
export default async (req: Request) => {
  console.log('[ai-recipe-photos] invoked, method:', req.method)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const profile = await verifyAndGetProfile(req)
  console.log('[ai-recipe-photos] profile result:', profile ? `ok (${profile.id})` : 'null')
  if (!profile) return new Response('Unauthorized', { status: 401 })

  const { images } = (await req.json().catch(() => ({}))) as {
    images?: Array<{ imageBase64?: string; mediaType?: string }>
  }

  if (!Array.isArray(images) || images.length === 0) {
    return new Response('images array is required', { status: 400 })
  }
  if (images.length > MAX_IMAGES) {
    return new Response(`Maximum ${MAX_IMAGES} images allowed`, { status: 400 })
  }
  for (const img of images) {
    if (!img.imageBase64 || !img.mediaType || !ALLOWED_TYPES.includes(img.mediaType as AllowedType)) {
      return new Response('Each image must have imageBase64 and a supported mediaType', { status: 400 })
    }
  }

  // Check quota — each image counts as one request.
  const quota = await getAiImageQuota()
  if (profile.ai_image_requests_used + images.length > quota) {
    return new Response(
      JSON.stringify({ error: 'quota_exceeded', used: profile.ai_image_requests_used, quota }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('Server is missing ANTHROPIC_API_KEY', { status: 500 })

  const client = new Anthropic({ apiKey })

  const tool: Anthropic.Tool = {
    name: 'return_recipe',
    description: 'Return the complete recipe combining all provided pages/photos.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: ['string', 'null'] },
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
              unit: {
                type: 'string',
                description: 'Standardized unit: g, kg, ml, l, tsp, tbsp, cup, pcs, clove, slice, pinch',
              },
            },
            required: ['name', 'quantity', 'unit'],
          },
        },
        instructions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered step descriptions as complete sentences without leading numbers.',
        },
      },
      required: ['title', 'ingredients', 'instructions'],
    },
  }

  // Build the content blocks: one image block per photo + one text instruction block.
  const imageBlocks: Anthropic.ImageBlockParam[] = images.map((img) => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.mediaType as AllowedType,
      data: img.imageBase64!,
    },
  }))

  const textBlock: Anthropic.TextBlockParam = {
    type: 'text',
    text: [
      `These are ${images.length} page(s)/photo(s) of the same recipe. Combine them into one complete recipe.`,
      '',
      'Standardization rules:',
      '- Convert fractions to decimals (½ → 0.5, ¼ → 0.25, ¾ → 0.75)',
      '- Use common unit keys: g, kg, ml, l, tsp, tbsp, cup, pcs, clove, slice, pinch',
      '- Format each instruction as a single complete sentence without a leading number',
      '- Use null for any field you cannot clearly read',
      '',
      'Return ONLY via the return_recipe tool.',
    ].join('\n'),
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'return_recipe' },
      messages: [{ role: 'user', content: [...imageBlocks, textBlock] }],
    })

    const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) {
      return new Response('Model did not return structured output', { status: 500 })
    }

    await incrementAiImageUsage(profile.id, images.length)
    return Response.json({ recipe: toolUse.input })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Recipe transcription failed'
    return new Response(msg, { status: 500 })
  }
}

export const config: Config = { path: '/api/ai/recipe-photos' }
