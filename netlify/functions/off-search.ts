import type { Config } from '@netlify/functions'

/**
 * Server-side proxy for Open Food Facts product search.
 * Avoids CORS issues and handles 503s gracefully before they reach the client.
 *
 * Query params: q (search term), country (ISO code, e.g. NO), limit (default 15)
 * Mapped to /api/off/search via the exported config.
 */
export default async (req: Request) => {
  const url = new URL(req.url)
  const query = url.searchParams.get('q') ?? ''
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '15'), 30)

  if (!query.trim()) {
    return Response.json({ products: [] })
  }

  const params = new URLSearchParams({
    search_terms: query,
    page_size: String(limit),
    fields: 'code,product_name,brands,image_front_url,labels_tags,countries_tags,stores',
  })

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/search?${params.toString()}`,
      {
        headers: { 'User-Agent': 'Hungri/1.0 (https://hungri.netlify.app)' },
        signal: AbortSignal.timeout(8000),
      },
    )

    if (!res.ok) {
      return Response.json({ products: [], error: `OFF returned ${res.status}` })
    }

    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OFF search failed'
    return Response.json({ products: [], error: msg })
  }
}

export const config: Config = { path: '/api/off/search' }
