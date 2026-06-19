import Anthropic from '@anthropic-ai/sdk'
import type { Config } from '@netlify/functions'
import { verifyAndGetProfile } from './_supabaseAdmin'

/**
 * Netlify Function: AI-assisted batch categorisation of products.
 * Restricted to admin-role users. No per-user quota deduction.
 *
 * Body: { products: Array<{ id, name, brand?, ingredientName, currentCategory }> }
 * Returns: { suggestions: Array<{ productId, tags: string[], suggestedCategory?: string }> }
 *
 * Mapped to /api/ai/standardize-products via the exported config.
 */

const VALID_CATEGORIES = [
  'produce', 'dairy', 'meat', 'seafood', 'pantry', 'frozen', 'bakery', 'beverages', 'other',
] as const

export interface ProductInput {
  id: string
  name: string
  brand?: string
  ingredientName: string
  currentCategory: string
}

export interface ProductSuggestion {
  productId: string
  tags: string[]
  suggestedCategory?: string
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const profile = await verifyAndGetProfile(req)
  if (!profile) return new Response('Unauthorized', { status: 401 })
  if (profile.role !== 'admin') return new Response('Forbidden — admin role required', { status: 403 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('Server is missing ANTHROPIC_API_KEY', { status: 500 })

  const { products } = (await req.json().catch(() => ({}))) as { products?: ProductInput[] }
  if (!Array.isArray(products) || products.length === 0) {
    return new Response('products array is required', { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  const tool: Anthropic.Tool = {
    name: 'return_suggestions',
    description: 'Return categorisation suggestions for each product.',
    input_schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Short descriptive tags (e.g. "Condiment", "Sauce", "Ketchup", "Dairy-free")',
              },
              suggestedCategory: {
                type: 'string',
                enum: VALID_CATEGORIES,
                description: 'Only include if the current category is clearly wrong.',
              },
            },
            required: ['productId', 'tags'],
          },
        },
      },
      required: ['suggestions'],
    },
  }

  const productList = products.map((p) =>
    `- id: ${p.id} | name: "${p.name}"${p.brand ? ` by ${p.brand}` : ''} | ingredient: "${p.ingredientName}" | current category: ${p.currentCategory}`,
  ).join('\n')

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'return_suggestions' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'You are standardizing a food product database for a meal planning app.',
                '',
                'For each product below, provide:',
                '1. Short descriptive tags (e.g. "Condiment", "Sauce", "Ketchup", "Canned", "Frozen", "Organic")',
                '2. A corrected ingredient category ONLY if the current one is clearly wrong',
                `   Valid categories: ${VALID_CATEGORIES.join(', ')}`,
                '',
                'Products:',
                productList,
              ].join('\n'),
            },
          ],
        },
      ],
    })

    const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) {
      return new Response('Model did not return structured output', { status: 500 })
    }

    return Response.json(toolUse.input)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Product standardization failed'
    return new Response(msg, { status: 500 })
  }
}

export const config: Config = { path: '/api/ai/standardize-products' }
