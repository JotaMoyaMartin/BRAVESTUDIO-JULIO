/**
 * STORIES DISEÑO — iconos permitidos (whitelist BRÄVE).
 * El builder admin solo ofrece estos; el renderer los pinta vía lucide
 * (SVG inline compatible con html-to-image). Añadir uno = añadir al mapa.
 */
import type { ComponentType } from 'react'
import {
  Scissors, Sparkles, Star, Heart, ArrowDown, ArrowUpRight, Check,
  MapPin, Clock, Droplets, Brush, CalendarDays, Gift, Crown, Phone,
} from 'lucide-react'

export const STORY_ICONS = {
  tijeras: Scissors,
  destello: Sparkles,
  estrella: Star,
  corazon: Heart,
  flecha_abajo: ArrowDown,
  flecha_diagonal: ArrowUpRight,
  check: Check,
  ubicacion: MapPin,
  reloj: Clock,
  gota: Droplets,
  brocha: Brush,
  calendario: CalendarDays,
  regalo: Gift,
  corona: Crown,
  telefono: Phone,
} satisfies Record<string, ComponentType<{ size?: number | string; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>>

export type StoryIconName = keyof typeof STORY_ICONS

export function storyIcon(name: string | undefined): ComponentType<{ size?: number | string; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> | null {
  if (!name) return null
  return (STORY_ICONS as Record<string, ComponentType<{ size?: number | string; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>>)[name] ?? null
}