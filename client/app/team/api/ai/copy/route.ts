import { NextRequest, NextResponse } from 'next/server'
import { generateAIServer } from '@/lib/team/ai/server'
import { buildCopyPrompt, mockCopy, CopyContext } from '@/lib/team/ai/prompts/copy'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const { topic, type, salonName, clientName, tone, objectives, services, promoteService, images } = body as {
    topic?: string
    type?: 'reel' | 'carrusel'
    salonName?: string
    clientName?: string
    tone?: string
    objectives?: string
    services?: string[]
    promoteService?: string
    images?: string[]
  }

  if (!topic || !type) {
    return NextResponse.json({ error: 'Falta topic o type' }, { status: 400 })
  }
  if (type !== 'reel' && type !== 'carrusel') {
    return NextResponse.json({ error: 'type debe ser reel o carrusel' }, { status: 400 })
  }

  const hasImages = Array.isArray(images) && images.length > 0
  const ctx: CopyContext = {
    topic,
    type,
    salonName,
    clientName,
    tone,
    objectives,
    services,
    promoteService,
    hasImages,
    imageCount: hasImages ? images.length : 0,
  }

  const prompt = buildCopyPrompt(ctx)
  // For carruseles we send the first 3 images to keep tokens manageable. Reels
  // here only have a cover image (not the video itself), so we skip vision there.
  const visionImages = hasImages && type === 'carrusel' ? images.slice(0, 3) : undefined

  const content = await generateAIServer(prompt, visionImages)

  if (content === null) {
    // AI not configured — return mock so the UX still demonstrates the flow.
    return NextResponse.json({
      content: mockCopy(ctx),
      mock: true,
      note: 'IA no configurada (falta AI_API_KEY). Mostrando copy de ejemplo siguiendo el manual BRÄVE.',
    })
  }

  return NextResponse.json({ content })
}