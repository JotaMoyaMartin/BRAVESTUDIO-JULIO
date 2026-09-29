# BRÄVE Studio — Arquitectura

> Última actualización: 2026-09-28 · Basada en auditoría completa del repo (5 exploraciones)

---

## 1. Visión general (estado actual)

```
                    ┌─────────────────────────── BROWSER ───────────────────────────┐
                    │  (app) clienta self-serve   (app) premium   /admin   /team    │
                    └──────┬──────────────────┬──────────────┬──────────────┬───────┘
                           │ SSR+RLS          │ fetch        │ fetch        │ fetch (actorId mock)
                    ┌──────▼──────────────────▼──────────────▼──────────────▼───────┐
                    │  Next.js 14 API routes (Vercel)                                │
                    │  /api/ai/generate · /api/stripe/* · /api/admin/* · /api/promo  │
                    │  /api/track-section · /api/academia/progress · /team/api/*     │
                    └──┬───────────┬───────────┬──────────────┬───────────────┬──────┘
                       │           │           │              │               │
                 Supabase      Stripe      Ollama cloud    Metricool      Loom/Resend
                 (Auth+DB+     (checkout,  (LLM, key en    (métricas +    (lecciones,
                  Storage)      portal,     server)         scheduler)      emails)
                                webhook)
```

- **Toda la lógica vive en el client** (`server/` Express es casi vacío: health checks).
- **Tres "apps" en un repo:** app de clienta (self-serve), app premium (alimentada por el equipo), workspace team (interno, auth mock).
- **Roles:** `user | premium | admin | superadmin` + team mock (5 usuarios, password en claro en bundle).

## 2. Modelo de datos

### Núcleo de negocio (RLS: cada usuaria lo suyo)
| Tabla | Rol en el producto |
|---|---|
| `profiles` | Acceso (stripe/promo/skool/manual), rol, gamificación (level, xp_total, last_visited_section), trial |
| `brand_profiles` | **Proto-Business Brain**: `raw_input` (33 preguntas), `optimized_summary` (contexto IA), `strategy_json` (13 secciones), `roadmap_json` (fases/tareas), `completion_status` |
| `content_items` | Todo el contenido. `type reel\|carrusel\|story` · `status library\|scheduled\|draft\|done` · `tag reto-10k\|premium-script` · `reto_status idea\|grabado\|editado\|publicado` · `content_json` (shapes por tipo) · `scheduled_date` · `done_at` |
| `reto_10k_progress` + `reto_10k_config` | Reto 30 días (fases, misiones seed, XP) |
| `saved_inspirations` / `saved_transitions` | Galerías globales admin + guardados por usuaria |
| `academia_*` | LMS (módulos, lecciones Loom, progreso) |

### Equipo → Premium (puente BRÄVE CONTENT)
| Tabla | Nota |
|---|---|
| `premium_strategy_sessions` | Transcripción → strategy_draft → chat refine → publish (escribe en `brand_profiles`) |
| `content_ideas` | Pipeline CM: propuesta→confirmada→descartada→guion_listo→hecha; `script_id` → content_items (sin FK) |
| `metricool_config` / `metricool_metrics` | Token **plaintext**; métricas por (user, mes, red) |
| `team_scheduled_posts` | Posts programados vía Metricool scheduler |
| `team_client_chats` | Historial del asistente por (clienta, actor) |

### Comercio y control
`plans` + `plan_price_history` (precios dinámicos con fallback hardcode) · `promo_codes` + `promo_redemptions` · `user_activity_log` (RPC `log_user_activity`).

### ⚠️ Drift de esquema
- `types/database.ts` **sin tipar**: `content_ideas`, `metricool_config`, `metricool_metrics`, `team_client_chats`, `team_scheduled_posts` (se usan con `any`).
- Rol `premium` y constraint de `status` con `'done'`/`'editado'` no existen en el SQL del repo (drift DB/repo). `server/supabase-schema.sql` (base con `is_admin()`) vive fuera de `migrations/`.

## 3. IA actual — mapa real (actualizado FASE 0)

**Después de la FASE 0: 1 cliente LLM server-side, 1 extractor de JSON.**

```
Browser ──► /api/ai/generate (auth sesión + rate limit 20/min + prompt ≤30k + timeout 60s)
                │
                ▼
        lib/ai/llm.ts  ← ÚNICO cliente server (timeout + retry 429/5xx + AbortSignal)
        lib/ai/extract.ts  ← ÚNICO extractJSON (fences + balanced scan)
                │
     ┌──────────┼──────────────┐
server-generate.ts   team/ai/server.ts (visión)   app/api/ai/generate
(wrapper, firma intacta)   (wrapper, firma intacta)   (proxy para el browser)
```

- Wrappers existentes conservan su firma externa; internamente delegan en `callLLM()`.
- Gating unificado: `isServerAIConfigured()` = provider ≠ mock && AI_API_KEY definida.
- Rate limiting en memoria (`lib/rate-limit.ts`, sliding window) — por instancia Lambda; para límites globales estrictos migrar a store compartido (Upstash).
- `/api/team/*` y `/team/api/*` con guard centralizado en middleware (`lib/team/guard.ts`): modo estricto si `TEAM_API_TOKEN` está definido (header `x-team-token`), modo flexible (bloquea cross-site) si no.
- **Contexto de marca:** `lib/ai/brand-context.ts` (`buildBrandFullContext`) — compone salón, servicios prioritarios, clienta ideal, pilares, tono, objetivos, errores + `optimized_summary` como "RESUMEN PARA IA". Fallback `raw_input`.
- Inyectan: planificar, crear-contenido, stories, reto10k (todos), ideas del team (obligatorio), asistente del team.
- **No inyectan:** `team/api/ai/copy` (campos sueltos del body), `SurpriseCard` (prop opcional).
- Único generador que combina marca + ideas + métricas: el asistente del team (`lib/team/ai/assistant-prompt.ts`).
- **SEAM Business Brain (Fase 0):** `lib/ai/brain.ts` define `BrainPurpose`, `BrainParts`, `BRAIN_SECTIONS_BY_PURPOSE` y `composeBrainContext()` (pura, sin I/O) — punto de entrada único para la fase Brain. Ver §5.1.
- Manual BRÄVE: los fragmentos de prompts difieren por formato (reels/carrusel/stories/reto10k usan versiones adaptadas, NO byte-idénticas) — extraerlos exigiría cambiar textos = cambiar comportamiento. Se consolida en la fase Brain vía system role (`lib/ai/llm.ts` ya acepta `system`). Ver §5.3.

## 4. Seguridad (hallazgos críticos) — estado tras FASE 0

| # | Riesgo | Dónde | Estado |
|---|--------|-------|--------|
| 1 | `/api/team/*` confía en `actorId` del body validado contra mock; middleware declara `/team` y `/api/team` públicas; service-role bypass RLS | `lib/team/api-helpers.ts` | **Mitigado (F0):** guard en middleware (token o bloqueo cross-site) + rate limit 40/min no-GET. Pendiente: auth real Supabase |
| 2 | Contraseñas team (`brave2026`) y accesos rápidos en el bundle cliente | `lib/team/mock-data.ts` | Pendiente (Fase auth real) |
| 3 | `/api/ai/generate` sin autenticación → proxy a LLM de pago abusable | `app/api/ai/generate/route.ts` | **Corregido (F0):** sesión + rate limit + timeout + cap de prompt |
| 4 | Token Metricool plaintext + RLS deja leerlo a la propietaria | `metricool_config` | Pendiente |
| 5 | Fallback hardcodeado de URL + anon key JWT en cliente | `lib/supabase/client.ts` | Pendiente |
| 6 | XP client-side no atómico; canje de promo con carrera; `user_activity_log` falsificable | `content-utils.ts`, `promo/redeem` | Pendiente |
| 7 | `CodesTab` ('use client') importa `createAdminClient` → CRUD de códigos probablemente roto en prod | `components/admin/CodesTab.tsx` | **Corregido (F0):** nueva API route `app/api/admin/codes` (POST/PATCH/DELETE) con `requireAdmin()` server-side |
| 8 | `premium-strategy` legacy escribe en `brand_profiles` sin sesión/draft (pisa trabajo) | `api/admin/premium-strategy` | Pendiente |

## 5. Arquitectura propuesta para el crecimiento

### 5.1 Business Brain (evolución, no rewiring) — FASE 1 IMPLEMENTADA (28 sep 2026)
Hoy `brand_profiles` ya es el 70% del Business Brain. Propuesta por capas:

```
BUSINESS BRAIN (server-side, un único accessor)
├─ Estático (lento)      → brand_profiles: strategy_json + optimized_summary + raw_input
├─ Dinámico (semanal)    → métricas Metricool (resumen delta, patrón de assistant-prompt.ts)
│                          + historial content_items/content_ideas (qué se publicó, estados)
├─ Objetivos             → reto_10k_progress + futuro: campaigns/goals table
└─ Aprendizaje           → qué formatos/pilares funcionaron (fase 2, tras métricas)
        ↓
   buildBrainContext(userId, {purpose: 'reel'|'story'|'campaign'|'audit'|'recommendation'})
        ↓
   TODOS los generadores y recomendaciones
```

Reglas:
- **Un accessor único server-side — EXISTE en Fase 1:** `lib/ai/brain-server.ts` (`buildBrainContext(userId, purpose)` con `cache()` de React). Gramática pura testeable en `lib/ai/brain-grammar.ts` (`buildObjectivesGrammar`, `buildLiveUpdateLine`, `buildOnboardingFicha`). Une estático (`buildBrandFullContext`) + métricas Metricool + objetivos del Reto y los compone vía `composeBrainContext()` (SEAM F0). Purpose decide secciones (`BRAIN_SECTIONS_BY_PURPOSE`); content y stories ya van con `metrics: true`.
- **Los generadores client-side pasan a pedir contexto al server** (el server compone y llama al LLM) — elimina la dependencia del toggle y del envío de contexto desde el browser.
- Voz (onboarding por voz) en el futuro alimenta el mismo accessor — no cambia nada aguas abajo.
- La clienta premium ya tiene "brain gestionado" (premium-gestion publish) — el flujo self-serve (Mi Marca) y el gestionado deben escribir la misma estructura `strategy_json`. Ya lo hacen; conservar.

### 5.2 Cliente LLM unificado — HECHO EN FASE 0 (parcial)
`lib/ai/llm.ts` existe y es el único punto de llamada al proveedor: provider/model, temperatura/max_tokens, **system role** (listo para manual BRÄVE), timeout, 1 retry (429/5xx/timeout/red, no 4xx). `extractJSON` único en `lib/ai/extract.ts`. Auth + rate limit en `/api/ai/generate` hecho. **Pendiente de siguiente fase:** logging de uso (tokens/coste por user/generador → `ai_usage`), validación por esquema, flag `mock` visible en UI.

### 5.3 Manual BRÄVE como constante — AJUSTADO EN FASE 0
Los fragmentos del manual en los prompts actuales **difieren por formato** (reels/carrusel/stories/reto10k usan versiones adaptadas, no byte-idénticas) — extraerlos ahora habría cambiado el texto de los prompts = comportamiento. Decisión F0: no tocar prompts con drift; el unificado llegará con el Brain usando el **system role** de `lib/ai/llm.ts` (`lib/ai/manual.ts` con `BRAVE_MANUAL` como system message común).

### 5.4 Motor de campañas (módulo diferencial)
Sobre lo existente:
- `campaigns` (tabla nueva: objetivo tipo "llenar huecos", estado, fechas) + `campaign_days` derivados o `content_items.tag = campaign:<id>`.
- Reutilizar: pipeline ideas (`content_ideas` con anti-repetición), generadores de guion existentes, `CalendarView`, Metricool scheduler, WhatsApp como texto-a-copiar.
- Wizard: objetivo → (BRÄVE pregunta solo lo que no sabe del Brain) → plan por días accionable (CREAR/GRABAR/PROGRAMAR/COMPLETAR) → revisión → enviar a calendario.

### 5.5 HOME "Hoy" como proyección, no módulo nuevo — v2 HECHA (28 sep 2026)
El "qué hacer hoy" se **deriva** de estados existentes (no almacena): contenido pendiente de estados, misiones del Reto, días de campaña activa, recomendación del Brain. Un server component que agrega; cero datos nuevos al principio. **v2 en producción de código:** `/inicio` reestructurada como "BRÄVE me guía" — una acción dominante (`decideToday` → `TodayCard` con precedencia marca → continuar → reto → publicar → sugerencia), prioridad real del Brain, máx. 2 acciones "Después", una sola señal de progreso semanal, y bloque de libertad abajo ("¿Quieres hacer otra cosa?" + chips). **Dirección + exploración a la vez (29 sep 2026):** bajo el bloque de libertad, sección "Todas tus herramientas" (`ToolsSection`) reutilizando los tiles V1 huérfanos (`AppTile` + `tiles.ts` TILES_NORMAL/TILES_PREMIUM) y los previews con portadas reales de Inspiración/Transición (`InspirationPreview`/`TransitionsPreview`, consultas `reel_inspirations`/`reel_transitions` en la página server; null si no hay datos — demo no los muestra). Home sin IA: `buildBrainContext(userId, 'recommendation')` queda para la versión IA posterior; día de campaña reservado.

### 5.6 Teleprompter — HECHA V1 (28 sep 2026) + capa de ejecución V2 (29 sep 2026)
Capacidad nativa de grabación con APIs web, sin librerías: `getUserMedia` + `MediaRecorder` + Web Share API con files. Un solo payload `TeleprompterInput { script, title?, source?, returnUrl?, sequence? }` viaja por sessionStorage (`brave_teleprompter_input`, helpers puros en `lib/teleprompter/input.ts`); cualquier parte de BRÄVE abre la misma experiencia con `openTeleprompter(input, router)`. Experiencia: `/teleprompter` + `components/teleprompter/` (editor → permisos → cámara → texto superpuesto → countdown 3s → grabación → preview → guardar/compartir/volver). Integrado en guion de Reel (`ReelResult`, guion compuesto sin etiquetas) y por-Story (`StoriesClient`, secuencia "Continuar con Story N+1" con cámara viva). **V2 — capa de ejecución única ("BRÄVE crea → se guarda → Biblioteca organiza → Teleprompter graba", sin segunda librería/tabla/generador):** `lib/teleprompter/scripts.ts` (puro, testeado) deriva de `content_items` los guiones hablables (`spokenScriptOfItem`: reel GANCHO→CTA sin etiquetas; story → texto de la Story N con secuencia etiquetada; pregunta modo cámara → solo la respuesta; excluye carrusel/placeholders/respuestas escritas). `/teleprompter` muestra sección **"Mis guiones"** (server carga content_items en modo real; cliente demoea vía `demoGetPlan`) con tarjetas título/tipo/fecha/preview + "Usar", y "+ Crear nuevo guion" → `/crear-contenido` (mismo generador, no hay otro); botón **Volver** siempre visible que respeta `returnUrl` (reel→reel, stories→stories, Caja→/stories, Biblioteca→/biblioteca), y el borrador nunca se pierde (persistencia del draft aunque se cargue un input). Integraciones nuevas: Biblioteca (cada item hablable → "Grabar con Teleprompter" en su tarjeta, `showTeleprompter` opt-in en `ContentCard`) y Caja de Preguntas (respuesta de cámara → "Grabar con Teleprompter" con SOLO el texto que ella dice). **Limitaciones reales documentadas:** iOS Safari solo graba MP4 H.264+AAC (hasta Safari 18.4; `isTypeSupported` puede mentir → try/catch en start + leer `recorder.mimeType`); solo 1 stream getUserMedia activo en iOS (flip = parar tracks y re-pedir); requiere HTTPS + gesto de usuario; guardado vía `navigator.share({files})` (iOS → Fotos) con fallback `a[download]` (Chrome/Android OK; Firefox iOS con bug conocido de blobs). Vídeo queda en el dispositivo (no hay ruta de subida a Storage).

### 5.7 Creador de Carruseles — HECHA V1 (28 sep 2026) + V2 tratamientos (28 sep 2026)
Patrón "la IA escribe, la plantilla maqueta": la IA solo aporta contenido (`generateCarousel` existente, estructuras 3/5/7 en `lib/ai/prompts/carousels.ts`); el DISEÑO lo controla un motor de plantillas canvas 2D bloqueado (`lib/carousel/`: `types.ts`, `text.ts` puro testeable — wrap/fit medidos con measure inyectada; `templates.ts` — 3 familias × 2 paletas espejando tokens de `globals.css`; `render.ts` — `drawCarouselSlide` a 1080×1350). **La MISMA función dibuja preview y export** (WYSIWYG): preview = canvas escalado por CSS, export = `canvas.toBlob` JPEG 0.92 → descargas secuenciales `01-portada.jpg … NN-final.jpg` (sin ZIP). Layout automático (`pickLayout`): portada → primera, CTA → última, foto → text-photo (cover-photo si es la primera), saltos → lista. Fotos del salón en cualquier slide (portada incluida → cover-photo): upload en memoria (objectURL + `HTMLImageElement`), pan con clamp (nunca deja huecos) y zoom 100–250%; las plantillas se ven bien sin foto. Persistencia: `content_items.type='carrusel'` con `content_json.slides` + template/paleta vía `saveToLibrary` (Biblioteca ya renderiza `content_json.slides`). Tipografía canvas resuelta de next/font (`ensureCanvasFont` + `document.fonts.load`). Estado del flujo en `useSessionState` (paso/idea/resultado/familia persisten al navegar). **V2 tratamientos (misma API, mismas cajas de texto):** gradientes suaves `gradientBg`, número fantasma gigante tras el contenido (`ghostText`), pills de rol (`pillBadge`), marcos finos (`fineFrame`/`cornerMarks`), duotono de fotos vía composite multiply (`drawPhoto` con tint), sombra suave y radios por esquina en fotos, glows radiales (Beauty), bandas diagonales + texturas de puntos (Bold/CTA), listas con marcadores propios por familia (anillo/checkbox/numerado). Hex solo en `lib/carousel/` (espejo TOKENS + `mix()`). Limitaciones: fotos no persisten al recargar (solo memoria), sin reordenar slides, sin editar plantillas, sin ZIP.

### 5.8 Estados unificados del contenido
Hoy coexisten `status` (library/scheduled/draft/done) y `reto_status` (idea/grabado/editado/publicado) sincronizados a mano. Propuesta: pipeline único con estados `idea → pendiente → crear → grabar → editar → listo → programado → publicado` mapeado a ambas columnas vía helper único en `content-utils.ts` (migración progresiva, sin big-bang).

## 6. Integraciones — estado y dirección

| Integración | Estado | Siguiente paso |
|---|---|---|
| Metricool | Funcional (sync manual + scheduler IG) | Cron de sync; luego TikTok scheduling |
| Stripe | Completo | — |
| Loom (Academia) | Funcional | Gate de rol |
| Resend (emails) | Transaccionales básicos | Onboarding/campaign emails |
| Instagram Graph (publicación directa) | No | Investigar permisos `instagram_content_publish` (requiere cuenta Business + review Meta) — informe antes de construir |
| Google Business / Beauty AI | No | Investigación (integrations) |

## 7. Qué NO construir todavía

1. Clon de comunidad (Skool interno) — alto coste, valor dudoso frente a Academia + retos.
2. CRM de WhatsApp — solo canal dentro de campañas (texto a copiar).
3. Editor de vídeo — canal de upsell a BRÄVE CONTENT ("lo edita el equipo"), no feature.
4. Publicación directa IG/TikTok sin informe de permisos de Meta/TikTok aprobado.
5. Modelos propios de imagen (Beauty AI usa proveedores externos) y cualquier generación "libre" sin plantilla bloqueada.
6. Google Business/reseñas — después de campañas y HOME "Hoy".
7. Métricas propias con scraping de IG — cuando haya datos oficiales vía Graph/Metricool.