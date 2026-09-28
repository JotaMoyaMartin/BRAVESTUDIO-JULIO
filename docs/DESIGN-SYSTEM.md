# BRÄVE Studio — Design System

> Última actualización: 2026-09-28 · Fuente de verdad: `client/app/globals.css` (`@theme` Tailwind v4, sin config file) + `client/components/ui/`

---

## 1. Identidad

- **Fuente:** Poppins (400/500/600/700) vía `next/font/google` → `--font-poppins` (referenciada por `--font-sans`). **No usar** otras tipografías "típicas de IA" (Inter, Manrope, Playfair…).
- **Personalidad visual:** cálido, femenino, premium pero cercano. Nada de dashboard frío.
- **Mascota:** Bravi — imagen `/bravi2.png` en círculo buttermilk, bocadillo buttermilk. Componente: `components/bravi/Bravi.tsx` (+ `BraviTip`, `BraviGuide`). **NUEVO código debe usar ese componente**, no `BraviMascot.tsx` (shim) ni `team/BraviMascot.tsx` (variante divergente pendiente de migrar).

## 2. Tokens (`@theme` en globals.css)

### Paleta
| Token | Hex | Uso |
|---|---|---|
| `--color-cherry` | `#7A1832` | Color principal de marca |
| `--color-cherry-dark` | `#591427` | Variant oscuro |
| `--color-cherry-light` | `#A04060` | Hover, accents |
| `--color-buttermilk` | `#FFF1B5` | Fondo cálido, badges, bocadillos Bravi |
| `--color-pastel-blue` | `#C1DBE8` | Info |
| `--color-pastel-green` | `#B8D8B0` | Success, done |
| `--color-cream` | `#FFFDF5` | Fondo base |
| `--color-warm-gray` | `#F5F0E8` | Neutro cálido |
| `--color-warm-light` | `#FFF8E7` | Fondo secundario |
| `--color-ink` | `#1a1a1a` | Texto principal |
| `--color-danger` | `#c0394e` | Errores, delete |
| `--color-success` | `#2a8a4a` | Success |

### Radios
`sm 0.75rem` · `md 1.25rem` · `lg 1.75rem`. ⚠️ **Anomalía:** `--radius-xl (1rem) < --radius-md (1.25rem)` — no usar `radius-xl` creyendo que es mayor que `md` (pendiente de corregir).

### Sombras (todas con tinte cherry)
`--shadow-soft` (2/16/.06) · `--shadow-medium` (4/24/.08) · `--shadow-strong` (8/32/.12)

### Animaciones
`bravi-*` (float, blink, wave, glow, appear, celebrate, think) · `pulse-attention` · `glow-ready` · `title-shine` (titular con degradado animado) · `dash-flow` (SVG roadmap) · `reto-pulse/.reto-glow` · `marquee-scroll/.marquee-mask` (landing). Todas respetan `prefers-reduced-motion` salvo `bravi-*`.

### Clases utilitarias
`.card` · `.btn-primary` / `.btn-secondary` / `.btn-ghost` (hover spring `cubic-bezier(.34,1.56,.64,1)`) · `.idea-card` · `.input-field` · `.no-scrollbar` · `.snap-x-carousel` / `.snap-item`

---

## 3. Primitivas (`components/ui/`)

| Primitiva | Props clave |
|---|---|
| `Card.tsx` | `padding: none/sm/md/lg` · `shadow: none/soft/medium/strong` · `interactive` (hover lift) |
| `Button.tsx` | `variant: primary/secondary/ghost/danger` · `size: sm/md/lg` · `loading` · `icon` · `fullWidth` |
| `Badge.tsx` | `tone: cherry/buttermilk/blue/green/danger/neutral` |
| `Input.tsx` | `Input` + `Textarea`: `label`, `error`, `hint` |
| `SectionTitle.tsx` | `title`, `subtitle`, `icon`, `action` |
| `PageTransition.tsx` | fade+rise 0.3s con framer-motion |
| `Toast.tsx` | `ToastProvider` (montado en `(app)/layout.tsx`) + `useToast().show(msg, tone)`; tonos `success/info`; auto-dismiss 3.5s |
| `UsarMiMarcaToggle.tsx` | toggle "usar mi marca" con link a `/mi-marca` |

### Gaps de primitivas (improvisadas hoy en admin/team/reto)
**No existen:** `Table`, `Modal/Drawer`, `Select`, `Tabs`, `EmptyState`, `Skeleton`, `Avatar`, `Tooltip`. Toast sin tono `danger` y solo montado en el layout del app.
→ Antes de crear una improvisación nueva, añadir la primitiva a `components/ui/`.

---

## 4. Colores semánticos de contenido (a tokenizar)

Hoy repetidos como hex inline en ContentCard / CalendarView / RetoContentCard / RetoRoadmap. **Propuesta de tokens** (crear en `@theme` y migrar):

| Semántica | Valor propuesto |
|---|---|
| Estado *idea* | crema / neutro |
| Estado *grabado* | ámbar `#7a6000` sobre fondo suave |
| Estado *editado* | azul `#2c5a78` |
| Estado *publicado* | verde `#2a8a4a` (token success) |
| Tipo *reel* | cherry |
| Tipo *carrusel* | azul `#2a5a6a` |
| Tipo *story* | ámbar |

**Regla vigente y reforzada:** prohibido hex inline nuevo. Todo vía tokens (`var(--color-*)` o clases `bg-cherry` etc.). Deuda actual: ~1.026 hex inline en 60+ archivos (3 azules, 5 verdes, 4 ámbar en circulación). Migrar solo cuando se toque cada archivo (no big-bang).

---

## 5. Patrones establecidos

- **Layout app:** `flex h-screen` → `components/layout/Sidebar.tsx` (drawer móvil con framer `AnimatePresence`) + `main` con `max-w-4xl pt-20 pb-8 md:pt-8`.
- **Mobile-first** con `sm:`/`lg:`; landing con `StickyMobileCTA` solo móvil + `safe-area-inset-bottom`.
- **Carruseles horizontales:** `no-scrollbar` + scroll-snap (AchievementsCarousel, RetoTabs).
- **Drag & drop:** `@dnd-kit` — solo 2 usos legítimos: `content/CalendarView.tsx` y `team/screens/productividad/KanbanBoard.tsx`. Reutilizar CalendarView antes de duplicar un calendario (ejemplo bueno: `RetoCalendarioView`).
- **framer-motion** es el motor de micro-interacciones (61 archivos): PageTransition, hover spring, fade escalonado, `layoutId` para pills activas.
- **Modo team:** visualmente divergente (paleta Mantine-like propia, `max-w-[1400px]`, grises `#8a8680`). Es el segundo sistema — candidato a migración a tokens cuando se toque.

---

## 6. Landing (checkpoint b062102)

Orden en `app/LandingClient.tsx`: Header → Hero → Gallery (marquee 2 filas, fotos reales `public/landing/*.jpg`, contenedor −1°) → Benefits → Pricing → HowItWorks → Features → StoriesReal → Results → Testimonials → FAQ → CTA → Skool → Footer, con `BraviFloating` intercalado y `StickyMobileCTA` al final.
- Mockups CSS: `components/Mockups.tsx` (iMac/iPhone). `DeviceShowcase.tsx` sobrevive solo por `BALAYAGE_GRADIENTS` — consolidar.
- **Muertos (no importados):** `LandingStories.tsx`, `LandingPlanner.tsx`, `LandingDifferentiation.tsx` — eliminar con seguridad.

---

## 7. Reglas para trabajar

1. **Prohibido hex inline nuevo** — todo por tokens o primitivas.
2. Cards: primitiva `ui/Card` (o `.card`); bordes buttermilk `1.5px`; sombras `shadow-soft`/`medium`/`strong`.
3. Botones: `ui/Button` o clases `.btn-*` — no estilos inline duplicados.
4. Toast con `useToast()` — no alerts ni feedback ad-hoc.
5. Una tarjeta nueva = verificar primero si ContentCard/AppTile/QuickActionCard ya la cubren.
6. Badges: `ui/Badge` con tone — no pills inline nuevas.
7. Añadir una sección nueva de app implica tocar **3 sitios** (Sidebar navItems, MobileMenuContent, TILES en InicioClient) — alineado con roadmap de consolidación.
8. Antes de crear componente, buscar equivalente en `components/` (el repo ya duplica badges/chips/mockups — no añadir más).