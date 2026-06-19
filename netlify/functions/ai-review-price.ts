import Anthropic from '@anthropic-ai/sdk'
import type { Config } from '@netlify/functions'
import { verifyAndGetProfile } from './_supabaseAdmin'
import { createClient } from '@supabase/supabase-js'

/**
 * Netlify Function: AI-assisted price report moderation.
 * Admin-only. Checks whether a flagged price report seems plausible and
 * either approves or rejects it. On rejection, the reporter is price-banned
 * for 7 days.
 *
 * Body: { reportId: string }
 * Returns: { status: 'approved' | 'rejected', verdict: string }
 * Mapped to /api/ai/review-price via the exported config.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const profile = await verifyAndGetProfile(req)
  if (!profile) return new Response('Unauthorized', { status: 401 })
  if (profile.role !== 'admin') return new Response('Forbidden — admin role required', { status: 403 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('Server is missing ANTHROPIC_API_KEY', { status: 500 })

  const { reportId } = (await req.json().catch(() => ({}))) as { reportId?: string }
  if (!reportId) return new Response('reportId is required', { status: 400 })

  const supabase = createClient(
    process.env.SUPABASE_URL ?? 'http://localhost',
    process.env.SUPABASE_SERVICE_KEY ?? 'missing',
  )

  // Fetch the report and the product it belongs to.
  const { data: report, error: reportErr } = await supabase
    .from('product_price_reports')
    .select('*, products(name, brand)')
    .eq('id', reportId)
    .single()

  if (reportErr || !report) {
    return new Response('Report not found', { status: 404 })
  }

  const productName = (report.products as Record<string, unknown>)?.name as string ?? 'Unknown product'
  const brand = (report.products as Record<string, unknown>)?.brand as string | null
  const fullProductName = brand ? `${productName} (${brand})` : productName

  // Fetch the most recent previously active price for comparison.
  const { data: prevRows } = await supabase
    .from('product_price_reports')
    .select('price, currency')
    .eq('product_id', report.product_id)
    .eq('store_name', report.store_name)
    .in('status', ['active', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)

  const prevPrice = (prevRows ?? [])[0]?.price as number | undefined
  const prevCurrency = (prevRows ?? [])[0]?.currency as string | undefined

  const priceContext = prevPrice != null
    ? `The previous price was ${prevPrice} ${prevCurrency ?? report.currency} — a ${Math.round(((report.price as number) / prevPrice - 1) * 100)}% increase.`
    : 'No previous price on record for this product at this store.'

  const client = new Anthropic({ apiKey })

  const prompt = [
    `A user has reported a price for "${fullProductName}" at "${report.store_name}": ${report.price} ${report.currency}.`,
    priceContext,
    '',
    'Is this price plausible for this product in this currency?',
    'Reply with APPROVE or REJECT followed by a single sentence explaining your reasoning.',
    'Only reject if the price is clearly implausible (e.g. 10x the normal price, obviously wrong currency, price of 0).',
  ].join('\n')

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    const approved = responseText.toUpperCase().startsWith('APPROVE')
    const newStatus = approved ? 'approved' : 'rejected'
    const verdict = responseText.replace(/^(APPROVE|REJECT)\s*/i, '')

    // Update the report.
    await supabase
      .from('product_price_reports')
      .update({
        status: newStatus,
        ai_verdict: verdict,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    // Ban the reporter for 7 days if rejected.
    if (!approved) {
      const banUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('profiles')
        .update({ price_change_banned_until: banUntil })
        .eq('id', report.reported_by)
    }

    return Response.json({ status: newStatus, verdict })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI price review failed'
    return new Response(msg, { status: 500 })
  }
}

export const config: Config = { path: '/api/ai/review-price' }
