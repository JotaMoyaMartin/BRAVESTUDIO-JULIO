import { NextRequest, NextResponse } from 'next/server'
import { runAIProbe } from '@/lib/ai/monitor'

/**
 * Prueba automática de la IA (Vercel Cron, ver vercel.json).
 * Vercel manda «Authorization: Bearer $CRON_SECRET». Si la prueba falla,
 * el fallo queda registrado y se avisa al admin por email.
 */
export const maxDuration = 60

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret?.trim()) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 })
  const auth = request.headers.get('authorization') ?? ''
  if (!safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const probe = await runAIProbe()
  return NextResponse.json(probe, { status: probe.ok ? 200 : 502 })
}
