import { NextRequest, NextResponse } from 'next/server'
import { getActivePlans, Currency } from '@/lib/plans'

/**
 * Public endpoint: returns visible + active plans for a currency.
 * Used by the landing page and pricing page.
 *
 * GET /api/plans?currency=eur
 * GET /api/plans?currency=usd
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const currency = (searchParams.get('currency') || 'eur') as Currency

  if (currency !== 'eur' && currency !== 'usd') {
    return NextResponse.json({ error: 'Moneda no válida' }, { status: 400 })
  }

  const plans = await getActivePlans(currency)
  return NextResponse.json({ plans, currency })
}