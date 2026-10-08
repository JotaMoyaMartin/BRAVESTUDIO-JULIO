/**
 * STORIES DISEÑO — matemáticas de transformación (puras, testeables).
 * Sirven a los DOS editores: builder admin (move/resize/rotate/free) y
 * editor usuaria (encuadre de foto). Todo trabaja en coordenadas de canvas
 * 1080×1920; la llamada traduce del pointer (screen → scale).
 */
import { StoryDesignElement, StoryPhotoFrame } from './types'

export const DEG = Math.PI / 180

/** Delta de pantalla → delta de canvas (aplicando escala del render). */
export function screenToCanvas(dxPx: number, dyPx: number, scale: number): { dx: number; dy: number } {
  if (scale <= 0) return { dx: 0, dy: 0 }
  return { dx: dxPx / scale, dy: dyPx / scale }
}

/** Caja de un elemento en px de pantalla, para overlay planes de los editores. */
export function boxFor(el: StoryDesignElement, scale: number): {
  left: number; top: number; width: number; height: number; rotation: number
} {
  return {
    left: el.position.x * scale,
    top: el.position.y * scale,
    width: el.size.w * scale,
    height: el.size.h * scale,
    rotation: el.rotation ?? 0,
  }
}

/** Mueve el elemento (deltas ya en canvas). */
export function applyMove(
  el: StoryDesignElement, dx: number, dy: number, canvasW = 1080, canvasH = 1920,
): StoryDesignElement {
  const x = Math.round(Math.min(Math.max(el.position.x + dx, -el.size.w / 2), canvasW - el.size.w / 2))
  const y = Math.round(Math.min(Math.max(el.position.y + dy, 0), canvasH - 8))
  return { ...el, position: { x, y } }
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se'

/**
 * Resize desde una esquina, en el EJE LOCAL del elemento (el delta rota con
 * la rotación del el, así una caja girada se redimensiona a lo largo de sí).
 * Devuelve posición+size; el anchor es la esquina opuesta.
 */
export function applyResize(
  el: StoryDesignElement, corner: Corner, dxC: number, dyC: number,
  opts: { minSize?: number; keepRatio?: boolean } = {},
): StoryDesignElement {
  const min = opts.minSize ?? 24
  const rot = el.rotation ?? 0
  // Delta en el eje local: rotar el delta pantalla por -rot.
  const cos = Math.cos(-rot * DEG)
  const sin = Math.sin(-rot * DEG)
  const dxCv = dxC * cos - dyC * sin
  const dyCv = dxC * sin + dyC * cos

  let w = el.size.w
  let h = el.size.h
  const sx = corner === 'ne' || corner === 'se' ? 1 : -1
  const sy = corner === 'se' || corner === 'sw' ? 1 : -1
  w = Math.max(min, Math.round(w + sx * dxCv))
  h = Math.max(min, Math.round(h + sy * dyCv))
  if (opts.keepRatio && el.size.w > 0 && el.size.h > 0) {
    const ratio = el.size.w / el.size.h
    const byW = Math.abs(w / el.size.w) >= Math.abs(h / el.size.h)
    if (byW) h = Math.max(min, Math.round(w / ratio))
    else w = Math.max(min, Math.round(h * ratio))
  }

  // Anchor = esquina opuesta fija en canvas. Centro actual del el.
  const cx = el.position.x + el.size.w / 2
  const cy = el.position.y + el.size.h / 2
  // Media-diagonales viejos y nuevos (antes y después del resize) en ejes locales
  const hx0 = el.size.w / 2, hy0 = el.size.h / 2
  const hx1 = w / 2, hy1 = h / 2
  // Señal del anchor en ejes locales (opuesto a la esquina arrastrada)
  const ax = corner === 'ne' || corner === 'se' ? -1 : 1
  const ay = corner === 'se' || corner === 'sw' ? -1 : 1
  // Anchor en local (relativo al centro) → canvas con rotación +
  const lxA = ax * hx0, lyA = ay * hy0
  const cosR = Math.cos(rot * DEG)
  const sinR = Math.sin(rot * DEG)
  const anchorX = cx + lxA * cosR - lyA * sinR
  const anchorY = cy + lxA * sinR + lyA * cosR
  // Nuevo centro: anchor + media-diagonal nueva (misma dirección de esquina)
  const ncx = anchorX - ax * hx1 * cosR + ay * hy1 * sinR
  const ncy = anchorY - ax * hx1 * sinR - ay * hy1 * cosR
  return {
    ...el,
    position: { x: Math.round(ncx - w / 2), y: Math.round(ncy - h / 2) },
    size: { w, h },
  }
}

/** Rotación libe: ángulo del pointer alrededor del centro (grados, horario). */
export function applyRotate(
  el: StoryDesignElement, pointerX: number, pointerY: number,
  originScreen: { x: number; y: number },
): StoryDesignElement {
  const dxc = pointerX - originScreen.x
  const dyc = pointerY - originScreen.y
  const angle = Math.atan2(dyc, dxc) / DEG + 90 // 0° arriba
  // Snap suave a múltiplos de 15° cerca (±4°).
  const snap = Math.round(angle / 15) * 15
  const rotation = Math.abs(angle - snap) < 4 ? ((snap % 360) + 360) % 360 : Math.round(((angle % 360) + 360) % 360)
  return { ...el, rotation }
}

/** Encuadre de foto: clamp de zoom (1..3) y offsets (-50%..50%). */
export function clampFrame(frame: StoryPhotoFrame): StoryPhotoFrame {
  const zoom = Math.min(3, Math.max(1, frame.zoom))
  const dx = Math.min(50, Math.max(-50, frame.dx))
  const dy = Math.min(50, Math.max(-50, frame.dy))
  return { zoom, dx, dy }
}

/** Pan de foto: delta de canvas → ajuste % de la máscara. */
export function frameFromPan(current: StoryPhotoFrame, dxC: number, dyC: number, maskW: number, maskH: number): StoryPhotoFrame {
  if (maskW <= 0 || maskH <= 0) return current
  return clampFrame({
    zoom: current.zoom,
    dx: current.dx - (dxC / maskW) * 100,
    dy: current.dy - (dyC / maskH) * 100,
  })
}

/** CSS transform combinado para un IMG dentro de su máscara. */
export function frameToCss(frame: StoryPhotoFrame): string {
  return `scale(${frame.zoom}) translate(${frame.dx}%, ${frame.dy}%)`
}