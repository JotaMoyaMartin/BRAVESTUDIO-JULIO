/**
 * Dibuja una story con arte directamente en un <canvas> de 1080×1920
 * (en vez de html-to-image, que tardaba 30 s+ por incrustar todas las fuentes).
 * Mismo resultado que MockupCanvas: arte, fotos en sus huecos, etiquetas y textos.
 * Solo navegador.
 */
import { splitHighlight, type MockupTemplate, type MockupText } from './mockups'
import type { MockupState } from '@/components/stories/MockupStory'

const FONT_CSS: Record<MockupText['font'] | 'hi', string> = {
  serif: 'var(--font-instrument), "Instrument Serif", Georgia, serif',
  script: 'var(--font-pinyon), "Pinyon Script", cursive',
  sans: 'var(--font-sans, inherit), system-ui, sans-serif',
  hi: 'var(--font-instrument), "Instrument Serif", Georgia, serif',
}

/** Familia real de next/font (p. ej. "__Instrument_Serif_x") leída del CSS. */
function resolveFamily(css: string): string {
  const el = document.createElement('span')
  el.style.fontFamily = css
  el.style.position = 'absolute'; el.style.visibility = 'hidden'
  document.body.appendChild(el)
  const fam = getComputedStyle(el).fontFamily
  el.remove()
  return fam || 'sans-serif'
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => rej(new Error(`img ${src.slice(0, 40)}`))
    i.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** object-fit: cover con encuadre vertical (focus 0–100). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, focus: number) {
  const k = Math.max(w / img.width, h / img.height)
  const sw = w / k, sh = h / k
  const sx = (img.width - sw) / 2
  const sy = (img.height - sh) * (focus / 100)
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

type Word = { text: string; font: string; width: number }

function layoutText(ctx: CanvasRenderingContext2D, t: MockupText, value: string, fam: Record<string, string>) {
  const weight = t.font === 'sans' ? 500 : 400
  const base = `${t.italic ? 'italic ' : ''}${weight} ${t.size}px ${fam[t.font]}`
  const hi = `italic 400 ${t.size}px ${fam.hi}`
  const spacing = t.upper ? t.size * 0.18 : 0
  const pad = t.panel ? 28 : 0
  const maxW = t.w - pad * 2
  const lines: Word[][] = []
  for (const para of (t.upper ? value.toUpperCase() : value).split('\n')) {
    let line: Word[] = []; let lw = 0
    for (const seg of splitHighlight(para)) {
      for (const raw of seg.text.split(/(\s+)/)) {
        if (!raw) continue
        const font = seg.hi ? hi : base
        ctx.font = font
        const width = ctx.measureText(raw).width + spacing * raw.length
        if (/^\s+$/.test(raw)) { if (line.length) { line.push({ text: ' ', font, width }); lw += width } continue }
        if (lw + width > maxW && line.length) {
          while (line.length && line[line.length - 1].text === ' ') lw -= line.pop()!.width
          lines.push(line); line = []; lw = 0
        }
        line.push({ text: raw, font, width }); lw += width
      }
    }
    while (line.length && line[line.length - 1].text === ' ') line.pop()
    lines.push(line)
  }
  const lh = t.size * (t.font === 'sans' ? 1.45 : 1.05)
  return { lines, lh, spacing, pad }
}

export async function renderMockupToBlob(tpl: MockupTemplate, state: MockupState): Promise<Blob> {
  await document.fonts?.ready
  const fam = { serif: resolveFamily(FONT_CSS.serif), script: resolveFamily(FONT_CSS.script), sans: resolveFamily(FONT_CSS.sans), hi: resolveFamily(FONT_CSS.hi) }
  const canvas = document.createElement('canvas')
  canvas.width = 1080; canvas.height = 1920
  const ctx = canvas.getContext('2d')!
  ctx.textBaseline = 'alphabetic'

  const art = await loadImage(tpl.art)
  ctx.drawImage(art, 0, 0, 1080, 1920)

  for (const s of tpl.slots) {
    const img = await loadImage(state.photos[s.id] || s.sample)
    ctx.save()
    roundRect(ctx, s.x, s.y, s.w, s.h, s.radius ?? 0)
    ctx.clip()
    ctx.fillStyle = '#E6E2DD'; ctx.fillRect(s.x, s.y, s.w, s.h)
    drawCover(ctx, img, s.x, s.y, s.w, s.h, state.focus[s.id] ?? 40)
    ctx.restore()
    if (s.tag) {
      ctx.font = `600 26px ${fam.sans}`
      const tw = ctx.measureText(s.tag).width + 26 * 0.16 * s.tag.length
      const pw = tw + 36, ph = 26 * 1.45 + 16
      const px = s.x + 18, py = s.y + s.h - 18 - ph
      ctx.fillStyle = 'rgba(250,246,240,0.92)'
      roundRect(ctx, px, py, pw, ph, ph / 2); ctx.fill()
      ctx.fillStyle = '#591427'
      let cx = px + 18
      for (const ch of s.tag) { ctx.fillText(ch, cx, py + ph / 2 + 9); cx += ctx.measureText(ch).width + 26 * 0.16 }
    }
  }

  for (const t of tpl.texts) {
    const value = state.texts[t.id] ?? t.value
    if (t.panel) {
      ctx.fillStyle = 'rgba(250,246,240,0.88)'
      roundRect(ctx, t.x, t.y, t.w, t.h, 28); ctx.fill()
    }
    const { lines, lh, spacing, pad } = layoutText(ctx, t, value, fam)
    ctx.save()
    ctx.beginPath(); ctx.rect(t.x, t.y, t.w, t.h); ctx.clip()
    ctx.fillStyle = t.color
    const total = lines.length * lh
    let y = t.y + (t.h - total) / 2 + lh / 2 + t.size * 0.34
    for (const line of lines) {
      const lw = line.reduce((n, w) => n + w.width, 0)
      let x = t.align === 'left' ? t.x + pad : t.x + (t.w - lw) / 2
      for (const w of line) {
        ctx.font = w.font
        if (spacing) { for (const ch of w.text) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + spacing } }
        else { ctx.fillText(w.text, x, y); x += w.width }
      }
      y += lh
    }
    ctx.restore()
  }

  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('vacío'))), 'image/png'))
}
