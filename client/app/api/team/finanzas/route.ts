import { readFileSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  const htmlPath = join(process.cwd(), 'private', 'finanzas.html')
  const html = readFileSync(htmlPath, 'utf-8')

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}
