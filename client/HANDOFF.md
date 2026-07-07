# BRÄVE Studio — Project Handoff

> Fecha: 2026-07-02
> Último deploy: `bravestudio-cleint` en Vercel (production)
> Repo: `github.com/JotaMoyaMartin/brave-studio`

---

## 1. Qué es BRÄVE Studio

SaaS para estilistas y salones de belleza. La usuaria genera contenido para Instagram (reels, carruseles, stories), planifica su calendario y gestiona su marca personal. Diseñada para una mujer 30-45 años con baja habilidad técnica — la UX es conversacional, cálida y visual, no un dashboard frío.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS v4 · Supabase (Auth + DB) · Stripe (pagos) · Vercel (deploy) · Ollama/AI (generación de contenido) · framer-motion · @dnd-kit

---

## 2. Arquitectura

```
brave-studio/
├── client/          → Next.js 14 frontend (Vercel: bravestudio-cleint)
│   ├── app/            → App Router (pages + API routes)
│   ├── components/     → 30 componentes React
│   ├── lib/            → 19 archivos (AI, Supabase, utils, stores)
│   ├── types/          → TypeScript types (DB schema)
│   ├── supabase/       → Migraciones SQL
│   ├── middleware.ts   → Auth + access control
│   └── globals.css     → Design tokens (@theme Tailwind v4)
│
└── server/          → Express + TS backend (Vercel: bravestudio-backend)
    ├── src/
    │   ├── app.ts      → Express app (no listen, Vercel serverless)
    │   ├── routes/      → /api/health, /api/health/ready
    │   └── middleware/  → auth (bearer token), errorHandler
    └── api/index.ts    → Vercel entry point
```

**Dos deploys Vercel separados:**
- `bravestudio-cleint` (client/) → https://bravestudio-cleint.vercel.app
- `bravestudio-backend` (server/) → https://bravestudio-backend.vercel.app

---

## 3. Rutas (21 pages + 9 API routes)

### Pages

| Ruta | Auth | Propósito |
|------|------|-----------|
| `/` | — | Landing |
| `/login` | no | Login con Supabase Auth |
| `/signup` | no | Registro |
| `/forgot-password` | no | Recuperar contraseña |
| `/reset-password` | no | Reset contraseña |
| `/update-password` | no | Actualizar contraseña |
| `/access` | no | Verificación de acceso |
| `/access-blocked` | no | Acceso bloqueado |
| `/acceso-bloqueado` | no | Acceso bloqueado (ES) |
| `/skool-access` | no | Acceso vía Skool |
| `/pricing` | no | Planes de precios |
| `/onboarding` | sí | Onboarding inicial (nombre del salón) |
| `/inicio` | sí | Dashboard: Bravi, accesos rápidos, Sorpréndeme AI, nivel, logros |
| `/mi-marca` | sí | Documento estratégico: 8 bloques de preguntas → IA genera 13 secciones |
| `/planificar` | sí | Planificación semanal/mensual de contenido |
| `/crear-contenido` | sí | Crear reels y carruseles (wizard paso a paso) |
| `/stories` | sí | Stories estratégicas + Caja de Preguntas |
| `/biblioteca` | sí | Listado de contenido guardado con filtros |
| `/calendario` | sí | Calendario mensual con drag-and-drop + list view + modal de detalle |
| `/account` | sí | Perfil de usuario + gestión suscripción Stripe |
| `/admin` | admin | Panel 6 tabs: Dashboard, Usuarios, Códigos, Planes, Suscripciones, Soporte |

### API Routes

| Ruta | Método | Propósito |
|------|--------|-----------|
| `/api/ai/generate` | POST | Proxy a Ollama/Anthropic/OpenAI (server-side, oculta la API key) |
| `/api/stripe/create-checkout-session` | POST | Crear sesión de checkout Stripe |
| `/api/stripe/create-portal-session` | POST | Crear sesión del Customer Portal |
| `/api/stripe/webhook` | POST | Webhook de Stripe (checkout.session.completed, subscription.updated, subscription.deleted) |
| `/api/promo/redeem` | POST | Canjear código promocional |
| `/api/admin/cancel-subscription` | POST | Cancelar suscripción (admin) |
| `/api/admin/delete-user` | POST | Eliminar usuario (admin) |
| `/api/admin/update-role` | POST | Actualizar rol (admin) |
| `/api/auth/callback` | GET | Callback de auth de Supabase |

---

## 4. Base de Datos (Supabase)

### Tablas

**`profiles`** — usuarios
| Columna | Tipo | Notas |
|---------|------|-------|
| id | string | PK |
| email | string | |
| full_name | string \| null | |
| salon_name | string \| null | |
| is_active | boolean | |
| role | 'user' \| 'admin' \| 'superadmin' | |
| access_status | 'active' \| 'inactive' | |
| access_source | 'manual' \| 'stripe' \| 'skool' \| 'promo' \| 'none' | |
| stripe_customer_id | string \| null | |
| stripe_subscription_id | string \| null | |
| subscription_status | 'active' \| 'trialing' \| 'past_due' \| 'canceled' \| 'none' \| null | |
| subscription_plan | 'monthly' \| 'yearly' \| null | |
| promo_code_used | string \| null | |
| access_expires_at | string \| null | |
| city | string \| null | |
| professional_role | string \| null | |
| last_visited_section | string \| null | **NUEVA — gamificación** |
| level | number | **NUEVA — nivel BRÄVE (default 1)** |
| xp_total | number | **NUEVA — XP total (default 0)** |
| created_at | string | |
| updated_at | string | |

**`brand_profiles`** — perfil de marca del salón
| Columna | Tipo | Notas |
|---------|------|-------|
| id | string | PK |
| user_id | string | FK → profiles |
| raw_input | string \| null | Texto original de la usuaria |
| salon_name | string \| null | |
| city | string \| null | |
| years_experience | string \| null | |
| team_info | string \| null | |
| services | string[] \| null | |
| main_services | string[] \| null | |
| most_profitable_service | string \| null | |
| service_to_promote | string \| null | |
| ideal_client | string \| null | |
| ideal_client_age | string \| null | |
| client_problems | string \| null | |
| client_desires | string \| null | |
| frequent_questions | string \| null | |
| frequent_mistakes | string \| null | |
| main_goal | string \| null | |
| differentiation | string \| null | |
| specialty | string \| null | |
| content_topics | string[] \| null | |
| optimized_summary | string \| null | **Resumen para IA — se usa como contexto en todas las generaciones** |
| strategy_json | Record<string, unknown> \| null | **NUEVA — documento estratégico completo (13 secciones)** |
| completion_status | 'empty' \| 'partial' \| 'complete' | |
| created_at | string | |
| updated_at | string | |

**`content_items`** — contenido generado
| Columna | Tipo | Notas |
|---------|------|-------|
| id | string | PK |
| user_id | string | FK → profiles |
| type | 'reel' \| 'carrusel' \| 'story' | |
| title | string | |
| service | string \| null | |
| objective | string \| null | |
| format | string \| null | |
| content_json | Json | Estructura del contenido (script, slides, stories) |
| caption_with_hashtags | string \| null | Caption + hashtags para el post |
| visual_idea | string \| null | Idea visual sugerida |
| scheduled_date | string \| null | Fecha programada (YYYY-MM-DD) |
| status | 'library' \| 'scheduled' \| 'draft' | |
| created_at | string | |
| updated_at | string | |

**`promo_codes`** — códigos promocionales
| Columna | Tipo | Notas |
|---------|------|-------|
| id | string | PK |
| code | string | |
| description | string \| null | |
| is_active | boolean | |
| max_redemptions | number \| null | |
| redemptions_count | number | |
| access_days | number | Días de acceso concedidos |
| code_type | 'promo' \| 'skool' | |
| created_at | string | |
| expires_at | string \| null | |

### ⚠️ Migraciones pendientes de aplicar

Hay **2 migraciones SQL** que NO se han aplicado a la base de datos de Supabase. Deben ejecutarse manualmente en el Supabase Dashboard (SQL Editor):

**Migración 1** — `supabase/migrations/20260702000000_add_gamification_and_section.sql`:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_visited_section TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp_total INT DEFAULT 0;
```

**Migración 2** — `supabase/migrations/20260702150000_add_strategy_json.sql`:
```sql
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS strategy_json JSONB;
```

Sin estas migraciones, las columnas existen en TypeScript pero **no en la base de datos**. El modo demo funciona (usa localStorage), pero en producción los campos no persistirán.

---

## 5. Sistema de Diseño

### Tokens (`app/globals.css` con `@theme` de Tailwind v4)

**Paleta de colores:**
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-cherry` | `#7A1832` | Color principal de la marca |
| `--color-cherry-dark` | `#591427` | Variant oscuro |
| `--color-cherry-light` | `#A04060` | Hover, accents |
| `--color-buttermilk` | `#FFF1B5` | Fondo cálido, badges |
| `--color-pastel-blue` | `#C1DBE8` | Info, visual ideas |
| `--color-pastel-green` | `#B8D8B0` | Success, done states |
| `--color-cream` | `#FFFDF5` | Fondo base |
| `--color-warm-gray` | `#F5F0E8` | Fondo neutro cálido |
| `--color-warm-light` | `#FFF8E7` | Fondo secundario |
| `--color-ink` | `#1a1a1a` | Texto principal |
| `--color-danger` | `#c0394e` | Errores, delete |
| `--color-success` | `#2a8a4a` | Success states |

**Fuente:** Poppins (400/500/600/700) vía `next/font/google` → CSS variable `--font-poppins`

**Radios:** `--radius-sm: 0.75rem` · `--radius-md: 1.25rem` · `--radius-lg: 1.75rem`

**Sombras:** `--shadow-soft` · `--shadow-medium` · `--shadow-strong` (todas con tinte cherry)

### Primitivas UI (`components/ui/`)
- `Card.tsx` — contenedor con padding/shadow/interactive props
- `Button.tsx` — variantes: primary/secondary/ghost/danger, sizes sm/md/lg
- `Badge.tsx` — tones: cherry/buttermilk/blue/green/danger/neutral
- `Input.tsx` — input + textarea con label/error/hint
- `SectionTitle.tsx` — título + subtítulo + icono + action
- `PageTransition.tsx` — wrapper framer-motion (fade-in)
- `Toast.tsx` — sistema de toasts con context + useToast hook

### Reglas
- **Prohibido hex inline nuevo** — todo via tokens
- Botones: clases `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- Cards: `shadow-soft`, `border: 1.5px solid var(--color-buttermilk)`

---

## 6. Componentes clave

### Bravi (mascota)
- `components/bravi/Bravi.tsx` — componente contextual que lee contexto (hora, racha, items hoy, sección última) y selecciona mensaje de pool categorizado
- `lib/bravi-messages.ts` — pools categorizados: bienvenida (mañana/tarde/noche), ánimo, celebración, tip, recordatorio, continuar
- Anti-repetición via localStorage (últimos 3 mensajes)
- 3 poses: normal, celebrando, pensando (clases CSS)
- `components/bravi/BraviMascot.tsx` — shim de compatibilidad para imports antiguos

### Home (`components/home/`)
- `QuickActionCard.tsx` — 4 tarjetas principales (Mi Marca, Planificar, Crear, Stories)
- `SurpriseCard.tsx` — Sorpréndeme con IA (genera idea, fallback a pool)
- `ContinueCard.tsx` — "Continuar donde lo dejaste"
- `LevelBar.tsx` — barra compacta de nivel + XP
- `AchievementsCarousel.tsx` — carrusel horizontal de logros (scroll-snap)

### Admin (`components/admin/`)
- `AdminTabs.tsx` — sistema de 6 tabs
- `DashboardTab.tsx` — KPIs: usuarios totales, activos, nuevos, MRR real (Stripe API), cancelaciones, conversión trial→paid
- `UsersTab.tsx` — tabla con pagination server-side + filtros + búsqueda
- `UserDrawer.tsx` — ficha lateral de usuario con acciones
- `CodesTab.tsx`, `PlansTab.tsx`, `SubscriptionsTab.tsx`, `SupportTab.tsx`

### Content (`components/content/`)
- `ContentCard.tsx` — ficha de contenido expandible con copia por bloques (guion completo, cada bloque individual, copy+hashtags, idea visual)
- `CalendarView.tsx` — vista mensual con @dnd-kit drag-and-drop
- `StoryMockup.tsx`, `QuestionCard.tsx`

### Mi Marca (`components/mi-marca/`)
- `StrategyDisplay.tsx` — display visual del documento estratégico (13 secciones) con cards, progress bars, tablas, checklist interactivo

---

## 7. Generación de contenido AI

### Flujo
```
Browser → /api/ai/generate (POST) → Ollama/Anthropic/OpenAI → texto raw
```
La API key nunca llega al browser. El proxy server-side la maneja.

### Prompts (`lib/ai/prompts/`)
- `planner.ts` — planificación semanal/mensual. Genera JSON con items (type, title, service, suggestedDay, hookIdea). **Post-procesado fuerza el formato seleccionado** (reels solo → todo type="reel", etc.)
- `reels.ts` — reels con estructura GANCHO/CONTEXTO/SOLUCIÓN/CTA
- `carousels.ts` — carruseles con N slides
- `stories.ts` — stories estratégicas + generación de preguntas

### Helpers
- `lib/ai/client.ts` — `generateAIContent(prompt)` y `extractJSON<T>(text)`
- `lib/brand-extract.ts` — extracción local (regex) como fallback
- `lib/content-utils.ts` — `saveToLibrary`, `scheduleItem`, `unscheduleItem`, `deleteItem`, `duplicateToLibrary`, `formatContentForCopy`, `copyToClipboard`

### Metodología BRÄVE de guiones
Estructura obligatoria: GANCHO → CONTEXTO → SOLUCIÓN → CTA
- CTAs conversacionales (no keywords tipo "comenta ABAJO")
- 2 tipos: autoridad (35-45s, educativo) / viral (15-30s, punchy)
- `serviceLabel()` en reels.ts maneja artículos (el/un/la) por servicio

---

## 8. Estado y persistencia

### Modo demo (sin credenciales)
- `middleware.ts` detecta si `NEXT_PUBLIC_SUPABASE_URL` no empieza por `http` → bypass de auth, perfil demo
- `lib/demo-store.ts` — localStorage keys: `brave_demo_plan` (content items), `brave_demo_brand` (brand profile)
- `lib/demo.ts` — utilidades demo

### Persistencia de sesión entre secciones
- `lib/session-store.ts` — hook `useSessionState<T>(key, initialValue)` que persiste a `localStorage` (prefijo `brave_session_`)
- Las 4 secciones principales persisten su estado:
  - **Planificar**: plan generado, savedIds, services, freeText, format, objective, duration, refreshCounters
  - **Crear Contenido**: step, contentType, service, freeText, objective, reelResult, carouselResult, savedPlan, scheduledDate
  - **Stories**: tab, service, freeText, detail, count, mode, result, savedLib, scheduleDate
  - **Mi Marca**: text, strategy
- `clearSectionState(section)` — limpia toda la sesión de una sección (botones "Empezar de nuevo")
- Botones "Empezar de nuevo" en Planificar, Crear Contenido y Stories

### Toasts
- `components/ui/Toast.tsx` — context provider en `(app)/layout.tsx`
- `useToast().show(message, tone)` — auto-dismiss 3.5s

---

## 9. Pagos (Stripe)

### Configuración
- Restricted key: `rk_live_...`
- Webhook: `we_1To0DyAKYlawnc5BhG4xFRgE` — URL: `https://bravestudio-cleint.vercel.app/api/stripe/webhook`
- Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Prices: monthly `price_1To0DvAKYlawnc5BiWQqiq09` (29€/mes) · yearly `price_1To0DwAKYlawnc5BaCsrn90D` (199€/año)

### Flujo
1. `/pricing` → "Empezar ahora" → `/api/stripe/create-checkout-session`
2. Stripe Checkout → webhook actualiza `profiles` (subscription_status, plan, access)
3. `/account` → gestionar suscripción vía Customer Portal (`/api/stripe/create-portal-session`)
4. Cancelación: webhook detecta `cancel_at_period_end` → actualiza estado

### Admin MRR
- `app/admin/page.tsx` calcula MRR real desde Stripe API (`stripe.subscriptions.list` + `items.data.price.unit_amount`), yearly normalizado /12
- Cacheado 5 min en server component

### ⚠️ AVISO
`client/.env.production.local` tiene valores Stripe **vacíos**. NO ejecutar `scripts/sync-vercel-env.sh` sin rellenar los valores locales — sobrescribiría los valores reales de Vercel con strings vacíos y rompería los pagos.

---

## 10. Supabase

### Proyecto
- ID: `dekcpstpjqqqagjaqxot`
- URL: `https://dekcpstpjqqqagjaqxot.supabase.co`
- Pooler IPv4: `aws-1-eu-central-1.pooler.supabase.com:6543`
- Host directo `db.dekcpstpjqqqagjaqxot.supabase.co` es solo IPv6 — no usar en local

### RLS
- `public.is_admin()` — función SECURITY DEFINER que resuelve la recursión infinita en profiles/promo_codes
- Políticas admin/superadmin usan `is_admin()` en vez de subqueries a profiles

### Clients
- `lib/supabase/client.ts` — browser client (anon key)
- `lib/supabase/server.ts` — SSR client (cookies)
- `lib/supabase/admin.ts` — admin client (service role key, bypass RLS)

---

## 11. Cómo desarrollar

### Requisitos
- Node.js 18+
- npm

### Setup local
```bash
cd /Users/jotamoyamartin/brave-studio/client

# Sin credenciales → modo demo (funciona sin Supabase/Stripe)
npm install
PORT=3001 npm run dev    # → http://localhost:3001

# Con credenciales reales
# 1. Copiar .env.example a .env.local
# 2. Rellenar NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.
# 3. npm run dev
```

### Build
```bash
npm run build     # next build
npx tsc --noEmit  # type-check sin generar archivos
```

### Deploy
```bash
# Deploy automático: push a main → Vercel auto-deploy
# Deploy manual:
npx vercel --prod --yes
```

### Scripts disponibles
| Script | Comando |
|--------|---------|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |

---

## 12. Estado actual del repositorio

### Git
- **28 archivos modificados sin commit** — todo el rediseño premium SaaS (Fases 0-5 del plan)
- **9 rutas nuevas sin trackear** — `components/admin/`, `components/home/`, `components/mi-marca/`, `components/ui/` (parcial), `lib/bravi-messages.ts`, `lib/session-store.ts`, `lib/strategy-types.ts`, `supabase/migrations/`

### Lo que está hecho y deployado

**Sistema de diseño:**
- Poppins via next/font/google
- Tokens en globals.css (@theme Tailwind v4)
- Primitivas UI: Card, Button, Badge, Input, SectionTitle, PageTransition, Toast
- Sombras, radios, colores consolidados
- Bravi contextual con mensajes categorizados + anti-repetición

**Home (`/inicio`):**
- Saludo + Bravi con mensaje contextual
- "Continuar donde lo dejaste" (si hay contenido reciente)
- 4 tarjetas principales (2x2)
- Sorpréndeme como protagonista (IA con fallback)
- Nivel BRÄVE compacto (persistido en profile)
- Carrusel horizontal de logros
- Atajos de servicio

**Mi Marca (`/mi-marca`):**
- 8 bloques de preguntas (33 preguntas total) colapsables
- IA genera 13 secciones estratégicas
- Display premium: cards, progress bars animadas, tabla de prioridades, checklist interactivo
- `strategy_json` almacena documento completo
- `optimized_summary` = "Resumen para toda la IA" (contexto permanente para generaciones)
- Persistencia de text y strategy entre navegaciones

**Planificar (`/planificar`):**
- Generación de plan semanal/mensual
- **Fix: formato respetado** (reels solo → solo reels, carruseles solo → solo carruseles, mixto → alterna)
- Guardar individual o guardar todo
- "Ver en calendario" cuando todo está guardado
- Persistencia de estado entre navegaciones
- Botón "Empezar de nuevo"

**Crear Contenido (`/crear-contenido`):**
- Wizard: tipo → tema → objetivo → resultado
- Reels con GANCHO/CONTEXTO/SOLUCIÓN/CTA
- Carruseles con N slides
- Guardar en biblioteca o programar
- "Ver en calendario" después de programar
- Persistencia de estado entre navegaciones

**Stories (`/stories`):**
- Crear Stories estratégicas (1-3 secuencias)
- Caja de Preguntas (generar preguntas, responder)
- Programar en calendario
- "Ver en calendario" después de programar
- Persistencia de estado entre navegaciones

**Biblioteca (`/biblioteca`):**
- Listado con filtros (tipo, búsqueda)
- Multi-select con copia
- ContentCard con copia por bloques (guion completo, cada bloque, copy+hashtags, idea visual)

**Calendario (`/calendario`):**
- Calendario mensual siempre visible (incluso vacío)
- Drag-and-drop con @dnd-kit
- List view agrupado por fecha
- Modal de detalle con renderizado completo (reel/carrusel/story)
- Acciones: copiar, cambiar fecha, duplicar a biblioteca, enviar a biblioteca, eliminar
- Toasts para todas las acciones

**Admin (`/admin`):**
- 6 tabs: Dashboard, Usuarios, Códigos, Planes, Suscripciones, Soporte
- Dashboard con MRR real de Stripe
- Users tab con pagination server-side + filtros + drawer lateral
- Rediseño desde 889 líneas monolito → ~90 líneas + componentes separados

**Responsive:**
- Sidebar drawer en mobile con framer-motion
- Cards responsivas (1 col mobile, 2 col tablet, 4 col desktop)
- Admin tabla → cards en mobile

**Microanimaciones:**
- framer-motion en PageTransition, hover scale en cards, fade-in escalonado en listas
- 7 animaciones CSS de Bravi

### Lo que falta

1. **Aplicar 2 migraciones SQL** en Supabase Dashboard (ver sección 4.2)
2. **Commit del trabajo sin trackear** — 28 archivos modificados + 9 rutas nuevas están sin commit. Debería hacerse un commit con todo el rediseño premium.
3. **El backend (`server/`) está minimal** — solo tiene health checks. Toda la lógica de negocio vive en el client (API routes de Next.js). Si se necesita lógica server-side pesada, el backend Express está listo para expandir.

---

## 13. Decisiones de diseño importantes

1. **No rebuild Bravi como SVG/ilustración** — se mantiene emoji 🤖 envuelto en componente con personalidad real. Un SVG custom requiere ilustrador y no hay asset.
2. **MRR real desde Stripe API** — no estimar desde DB. Cacheado 5 min en server component.
3. **"Sorpréndeme" usa IA** — no pool hardcoded. Fallback al pool si la IA falla.
4. **Nivel/XP persistido en profiles** — no client-side efímero. Migración ligera.
5. **strategy_json = documento completo** — optimized_summary = resumen compacto para IA. Ambos en brand_profiles.
6. **Persistencia de sesión via localStorage** — no Context global ni Redux. Hook simple `useSessionState`.
7. **Copia por bloques** — cada bloque de contenido tiene su botón de copia individual, no solo "copiar todo".
8. **Formato forzado post-procesado** — la IA puede ignorar instrucciones de formato, así que se fuerza el type después de parsear la respuesta.
9. **Tailwind v4 sin config file** — todo via `@theme` en globals.css. No `tailwind.config.ts`.

---

## 14. Contactos y credenciales

- **GitHub:** `github.com/JotaMoyaMartin/brave-studio`
- **Vercel team:** `braveheadquartes-4203s-projects`
- **Supabase project:** `dekcpstpjqqqagjaqxot`
- **Stripe:** restricted key `rk_live_...`, webhook `we_1To0DyAKYlawnc5BhG4xFRgE`
- **DB password:** Jotamoya963963. (resetada, independiente del service role key)

### Variables de entorno necesarias (client)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID
STRIPE_WEBHOOK_SECRET
AI_PROVIDER
AI_API_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_API_URL
```

Todas están configuradas en Vercel (production). En local, funcionan en modo demo sin ninguna.