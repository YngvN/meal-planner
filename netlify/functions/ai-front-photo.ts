import Anthropic from '@anthropic-ai/sdk'
import type { Config } from '@netlify/functions'
import { getAiImageQuota, incrementAiImageUsage, verifyAndGetProfile } from './_supabaseAdmin'

/**
 * Netlify Function: extracts the product name, brand, and net weight from a
 * front-of-package photo using Claude vision.
 * Access is limited by the per-user quota set in admin settings.
 *
 * Body: { imageBase64: string, mediaType: string }
 * Returns: { product: { productName?, brand?, netWeight? } }
 * Mapped to /api/ai/front-photo via the exported config.
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
    name: 'return_product_info',
    description: 'Return the product name, brand, and net weight read from the front of the package.',
    input_schema: {
      type: 'object',
      properties: {
        productName: { type: ['string', 'null'], description: 'Full product name as printed on pack' },
        brand: { type: ['string', 'null'], description: 'Brand or manufacturer name' },
        netWeight: { type: ['string', 'null'], description: 'Net weight or volume as printed, e.g. "400 g" or "500 ml"' },
      },
      required: ['productName', 'brand', 'netWeight'],
    },
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'return_product_info' },
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
              text: 'Extract the product name, brand, and net weight from this product photo. Return null for any value you cannot clearly read.',
            },
          ],
        },
      ],
    })

    const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) {
      return new Response('Model did not return structured output', { status: 500 })
    }

    const raw = toolUse.input as Record<string, string | null>
    // Strip nulls — only return fields that were actually detected.
    const product: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string' && value.trim()) product[key] = value.trim()
    }

    await incrementAiImageUsage(profile.id)
    return Response.json({ product })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Front-of-package scan failed'
    return new Response(msg, { status: 500 })
  }
}

export const config: Config = { path: '/api/ai/front-photo' }
