# CLAUDE.md — BRÄVE Studio

Guía para sesiones de Claude que trabajen en este repo. Léela entera antes de tocar código.

---

## 1. Qué es

SaaS para estilistas y salones de belleza. Visión: *"tu directora de marketing para el salón"*. El producto dirige a la usuaria (qué hacer → crear → organizar → publicar → aprender). Usuario típico: mujer 30-45, baja habilidad técnica. Filosofía UX: **menos opciones + más dirección** — BRÄVE recomienda la siguiente acción en vez de preguntar.

Documentación viva: `docs/PRODUCT.md` (visión, módulos, loop) · `docs/ARCHITECTURE.md` (stack, datos, IA) · `docs/ROADMAP.md` (NOW/NEXT/LATER) · `docs/DESIGN-SYSTEM.md` (tokens, primitivas). Histórico: `client/HANDOFF.md` (jul 2026, parcialmente desactualizado).

## 2. Stack

Next.js 14 App Router · TypeScript · Tailwind CSS v4 (`@theme` en `globals.css`, sin config) · Supabase (Auth + DB + Storage) · Stripe · framer-motion · @dnd-kit · recharts · lucide-react · IA vía `app/api/ai/generate` (proxy server-side: Ollama/Anthropic/OpenAI, la key nunca llega al browser) · PWA mínima (manifest, sin service worker).

Deploys Vercel: `bravestudio-cleint` (client/) · `bravestudio-backend` (server/, Express mínimo — toda la lógica vive en las API routes del client).

## 3. Estructura

```
brave-studio/
├── client/                    # TODO el producto
│   ├── app/
│   │   ├── (app)/             # app con Sidebar: inicio, reto-10k, mi-marca, planificar,
│   │   │                      #   crear-contenido, stories, inspiracion-reels, transiciones-reels,
│   │   │                      #   biblioteca, calendario, account + premium: mi-estrategia,
│   │   │                      #   plan-contenidos, metricas, academia
│   │   ├── (auth)/            # login, signup, skool-access, passwords, access-blocked
│   │   ├── admin/             # panel 11 tabs + finanzas (superadmin)
│   │   ├── team/              # workspace interno BRÄVE CONTENT (auth mock) + team/api/*
│   │   ├── api/               # ai/generate, stripe/*, admin/*, promo, track-section, plans
│   │   ├── landing (page.tsx + LandingClient) · onboarding · pricing
│   ├── components/            # ui/, bravi/, home/, content/, mi-marca/, reto10k/, team/, admin/, landing/, layout/
│   ├── lib/                   # ai/ (client + prompts), supabase/, team/, metricool/, stores, utils
│   ├── types/database.ts      # ⚠️ le faltan 5 tablas nuevas (ver ARCHITECTURE)
│   ├── supabase/migrations/   # 23 migraciones
│   └── middleware.ts          # auth + access gates (174 líneas)
└── server/                    # Express mínimo (health) + supabase-schema.sql base
```

## 4. Comandos

```bash
cd client
npm install
npm run dev            # dev normal
PORT=3001 npm run dev  # si 3000 ocupado
npm run build          # next build
npx tsc --noEmit       # type-check
npm run lint
# Sin .env → modo demo (IS_DEMO, localStorage). Con .env real → Supabase.
```

## 5. Roles y gates (middleware.ts)

- `profiles.role`: `user | premium | admin | superadmin` (⚠️ `premium` no está en migraciones del repo).
- `hasActiveAccess()` (`lib/access.ts`): access_status activo, o subscription activa/trialing, o legacy is_active. Promo expirado → lazy-deactivate.
- Publicas: `/`, auth, `/pricing`, `/access-blocked`, webhook Stripe, **`/team` y `/api/team` (¡públicas!)**.
- Gates: sesión → login; onboarding (full_name/salon_name); acceso activo → `/access-blocked`; `/admin` → rol admin.
- Premium y admin saltan gates. **Las rutas premium NO tienen gate en middleware** (solo UI) — no confiar en eso para datos.

## 6. Modelo de datos esencial

- `content_items` = núcleo. `type: reel|carrusel|story` · `status: library|scheduled|draft|done` · `tag: reto-10k|premium-script|null` · `reto_status: idea|grabado|editado|publicado` · `scheduled_date` · `content_json` (reel: `{script:{hook,context,solution,cta}}`; carrusel: `{slides:[{number,role,text}]}`; story: `{stories:[{number,role,text,sticker}]}`; placeholder reto: `{mission_day, is_plan_placeholder:true}`).
- `brand_profiles` = proto-Business Brain: cuestionario → `raw_input` + `optimized_summary` (contexto para IA) + `strategy_json` (13 secciones, `lib/strategy-types.ts`) + `roadmap_json` (`lib/roadmap-types.ts`). Fase 1 añadió `shows_face` y `main_priority` (enums con CHECK) + `completion_status`. `strategy_json.strategy_generated_at` marca cuándo se generó la estrategia.
- `brain_observations` = aprendizaje del Brain (append-only: insert/select, sin update/delete; kinds `learning|integration|manual`) — infraestructura, sin motor aún. Accessor server: `lib/ai/brain-server.ts` → `buildBrainContext(userId, purpose)`.
- `profiles`: acceso (stripe/promo/skool/manual), gamificación (`level`, `xp_total`, `last_visited_section`), trial.
- Reto 10K: `reto_10k_progress` (PK user_id; objective, services, level, posts_per_week, current_day/phase) + `reto_10k_config` (seed 30 misiones, editable en admin).
- Premium/team: `premium_strategy_sessions` (draft admin→publish→brand_profiles), `content_ideas` (pipeline CM), `metricool_config/metrics`, `team_scheduled_posts`, `team_client_chats`, `academia_*`.
- **Demo mode** (`lib/demo.ts`): `IS_DEMO` = env check por build. localStorage: `brave_demo_plan`, `brave_demo_brand`; sesión: `brave_session_u:{userId}:{sección}:{campo}` (`lib/session-store.ts`).

## 7. IA (tras Fase 0)

Flujo: browser → `/api/ai/generate` (server: **auth de sesión + rate limit 20/min + cap prompt 30k**, oculta key) → `lib/ai/llm.ts` (**único cliente LLM server**: timeout 60s, 1 retry en 429/5xx/timeout, `system` opcional) → proveedor → texto → `extractJSON` (**único extractor** en `lib/ai/extract.ts`). `lib/ai/server-generate.ts` y `lib/team/ai/server.ts` son wrappers con firma intacta que delegan en `llm.ts`; gating unificado `isServerAIConfigured()`. Prompts en `lib/ai/prompts/` (reels, carousels, stories, planner, ideas, external-script, reto10k, strategy) — `STRATEGY_PROMPT`/`ROADMAP_PROMPT` viven solo en `lib/ai/prompts/strategy.ts` (MiMarca importa). Metodología guiones: **GANCHO → CONTEXTO → SOLUCIÓN → CTA**, CTAs conversacionales, 2 tipos (autoridad/viral). 6 pilares: autoridad/viralidad/educación/deseo/dolor/objeción. Contexto de marca: `optimized_summary`/`strategy_json` vía `lib/ai/brand-context.ts` — **todo generador nuevo DEBE inyectarlo**. **SEAM Brain:** `lib/ai/brain.ts` (`composeBrainContext(purpose, parts)`) — todo generador nuevo de la fase Brain pasa por ahí. Rate limiting server: `lib/rate-limit.ts` (memoria, por instancia — ver ARCHITECTURE §5.2). Tests unitarios: `npm test` (vitest, `client/tests/`).

## 8. Reglas de trabajo

1. **NO romper lo que funciona.** Los flujos Reto 10K, premium, Stripe, Metricool scheduler y demo están en producción.
2. **Prohibido hex inline nuevo** — tokens de `globals.css` o primitivas `components/ui/`. Ver `docs/DESIGN-SYSTEM.md`.
3. **Usar primitivas existentes** (Card, Button, Badge, Input, Toast `useToast()`) antes de improvisar; las primitivas faltantes se añaden a `ui/` primero.
4. **Diseño con plantilla bloqueada:** la IA genera contenido, la plantilla controla estilo. Output nunca debe parecer "generado por IA".
5. **Destrucción con confirmación** y toasts de feedback; `Toast` sin tono danger hoy — usar `danger` de Button.
6. **Sección nueva = 3 archivos** (Sidebar `navItems`, `MobileMenuContent`, tiles en `InicioClient`) + revisar `SectionTracker`/`VALID_SECTIONS` de track-section.
7. **Seguridad conocida:** no ampliar la superficie de `/api/team/*` ni pasar más datos por `actorId` mock; no devolver `metricool_config.user_token`; no editar archivos `.env*` (denegado por settings).
8. **Bugs conocidos a no propagar:** 3 clientes IA ya consolidados en wrappers sobre `lib/ai/llm.ts` — **NO crear un 4º cliente ni un nuevo extractor** (usar `callLLM`/`extractJSON` de `lib/ai/`); `account/page.tsx` sin guard demo; tracking sin métricas/academia/account; `/forgot-password` vacía; componentes landing muertos (LandingStories/LandingPlanner/LandingDifferentiation) — eliminar si se tocan, no reusar. **Env nuevo:** `TEAM_API_TOKEN` (opcional; si se define, las rutas `/team/api/*` y `/api/team/*` exigen header `x-team-token` — ver `lib/team/guard.ts`).
9. `types/database.ts` está desactualizado (faltan `content_ideas`, `metricool_config/metrics`, `team_client_chats`, `team_scheduled_posts`) — añadir tipos al tocar esas tablas, no usar `any` nuevo.
10. Estados dobles de `content_items`: sincronizar siempre vía helpers de `lib/content-utils.ts` (`setRetoStatus` etc.), no a mano.

## 9. Subagentes (`.claude/agents/`)

Para tareas grandes coordinar con: **product-architect** (decisiones transversales, coordinador), **frontend-ux**, **backend**, **ai-content**, **integrations**, **qa**. QA verifica funcionalidad (build + tsc + comportamiento) antes de dar una tarea por terminada. Un solo agente por archivo crítico a la vez (Sidebar, middleware, content-utils, database.ts, prompts). Cada agente define su alcance en su fichero.

## 10. Cómo probar

```bash
npm run build && npx tsc --noEmit     # mínimo antes de dar nada por hecho
PORT=3001 npm run dev                 # probar en demo sin credenciales
curl -s http://localhost:3001/api/plans | head
```
Flujos clave a verificar manualmente: onboarding → inicio; generar reel (crear-contenido); guardar → biblioteca → calendario (drag&drop); reto 10K onboarding → misiones → estados; stories con stickers; admin tabs cargan; login por rol.

## 11. No modificar sin revisar dependencias

- `lib/content-utils.ts` (lo usan biblioteca, calendario, reto, stories, planificar)
- `middleware.ts` + `lib/access.ts` (gates de todo)
- `types/database.ts` (tipado global)
- `lib/ai/prompts/*` + `lib/ai/brand-context.ts` (calidad de todas las generaciones)
- `components/layout/Sidebar.tsx` y `InicioClient.tsx` (nav triple)
- `lib/supabase/*`, `lib/plans.ts` / `lib/stripe-prices.ts` (pagos)
- Migraciones ya aplicadas — solo añadir nuevas, nunca editar una aplicada.