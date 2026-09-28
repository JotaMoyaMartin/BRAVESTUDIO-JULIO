# FASE 1 — BUSINESS BRAIN

> Estado: **IMPLEMENTADO (28 sep 2026)** — pendiente de aprobación visual de Jota tras probar el onboarding. La migración SQL (§2) está en `supabase/migrations/20260928000000_add_business_brain.sql` y HAY QUE APLICARLA en Supabase antes de desplegar a producción.
> Base: seam de Fase 0 (`lib/ai/brain.ts`), cliente LLM único (`lib/ai/llm.ts`), gramática canónica (`lib/ai/brand-context.ts`).
> Nota dev: para servidor demo (3001) las env de Supabase deben setearse a un valor NO http y no vacío (`NEXT_PUBLIC_SUPABASE_URL=demo-offline …`) — una cadena vacía se pierde al recompilar.

## 1. Arquitectura funcional

```
                    ┌──────────────────────────────────────────────┐
                    │  lib/ai/brain-server.ts  (NUEVO, server)     │
                    │  buildBrainContext(userId, purpose)          │
                    │   ├─ brand      → buildBrandFullContext(...) │
                    │   ├─ metrics    → summarizeMetrics(...)|null │
                    │   ├─ objectives → gramática nueva (§10)      │
                    │   └─ history    → null (Fase 2)              │
                    │        ↓ cache() de React, per-request       │
                    │        ↓ composeBrainContext(purpose, parts) │
                    └──────────────┬───────────────────────────────┘
                                   ↓ (string único, igual que hoy brandFull)
   FUENTES (existen hoy): brand_profiles · profiles · reto_10k_progress
                          · metricool_metrics · brain_observations (nueva)
                                   ↓
   CONSUMIDORES F1: estrategia post-onboarding (server, 1º consumidor)
                    regeneración de estrategia tras editar (server)
   CONSUMIDORES F2+: HOME "Hoy", Campañas, recomendaciones (props `brain`)
```

Principios:
- **El Brain es una capa de ACCESO, no una tabla que duplique.** Los datos viven en tablas existentes; el Brain es la vista unificada server-side.
- **Gramática de marca congelada:** `buildBrandFullContext` NO se toca (10 call-sites en producción). El Brain añade secciones NUEVAS (objectives, metrics) alrededor.
- **SCOPE F1:** el accessor se adopta SOLO donde la IA se llama server-side. Las páginas existentes no se rewirean (siguen pasando la fila brand cruda como prop y componiendo en client — el camino client **debe seguir vivo** por el modo demo). El plumbing de props `brain` llega en F2 con HOME/Campañas.
- Sin endpoint HTTP nuevo para el contexto: server components lo componen directamente.

### Secuencia de implementación (dentro de F1)
1. Migración aditiva + types (invisible, cero riesgo).
2. `lib/ai/brain-server.ts` + tests (desplegable sin cambio de producto).
3. Primer consumidor server-side: estrategia post-onboarding (valida el accessor con 1 call-site).
4. Wizard de onboarding (pieza visible, sobre cimientos probados).
5. Misma release: edición + stale + Home fix + publish merge + escrituras brain_observations.

## 2. Modelo de datos propuesto

**1 migración aditiva** (`client/supabase/migrations/`, nueva, no editar aplicadas) + `types/database.ts`:

```sql
-- brand_profiles (reactivar el proto-Brain existente)
ALTER TABLE brand_profiles
  ADD COLUMN shows_face text NOT NULL DEFAULT ''
    CONSTRAINT brand_profiles_shows_face_check CHECK (shows_face IN ('talk','appear','work_only','no','')),
  ADD COLUMN main_priority text
    CONSTRAINT brand_profiles_main_priority_check CHECK (main_priority IN ('citas','descubrir','reconocimiento','servicio','constancia','valor'));

-- NUEVA tabla: aprendizaje progresivo (esquema F1; engine = Fase 2)
CREATE TABLE brain_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('learning','integration','manual')),
  observation text NOT NULL CHECK (char_length(observation) <= 2000),
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_brain_observations_user ON brain_observations (user_id, created_at DESC);
-- RLS append-only: owner select+insert (SIN update/delete); admin is_admin() all
NOTIFY pgrst, 'reload schema';
```

- `strategy_json` / `roadmap_json` / `optimized_summary`: **SIN CAMBIOS** (documento generado, no duplicar).
- `main_goal`: declarado **legado sin escritor** (hoy nadie lo escribe; el wizard no lo usa).
- Columnas huérfanas de `brand_profiles` que el wizard reactiva: `team_info` (4 opciones: independiente/salón ajeno/salón propio/salón con equipo), `main_services`, `service_to_promote`, `differentiation` (lo que la clienta debe valorar de ella). `ideal_client_age` pasa a **progresiva** (Mi Marca; el wizard no la pregunta).
- `types/database.ts`: `BrandProfile` + `shows_face: 'talk'|'appear'|'work_only'|'no'|null` + `main_priority: 'citas'|'descubrir'|'reconocimiento'|'servicio'|'constancia'|'valor'|null` (prioridad ÚNICA, cambiable después — sustituye a `goals text[]` del primer borrador tras la revisión de principios de producto); tabla `brain_observations` con Row/Insert/**Update** (supabase-js exige las 4; Update vacío si append-only). NO sincronizar las 5 tablas que faltan en el mismo PR (tarea separada, regla 9).

## 3. Datos existentes que se REUTILIZAN (no duplicar)

| Necesidad del Brain | Fuente existente | Estado hoy |
|---|---|---|
| Negocio (nombre, tipo, ciudad) | `profiles.salon_name`, `profiles.city`, `profiles.professional_role` | salon_name ya gate; city solo vía Mi Marca |
| Servicios | `brand_profiles.main_services`, `service_to_promote` | se rellenan hoy por regex desde texto libre |
| Clienta | `brand_profiles.ideal_client_age` (+ `strategy_json.clienta_ideal`) | columna huérfana → la reactiva el wizard |
| Marca/posicionamiento | `strategy_json` (tono/voz/imagen), `specialty`, `differentiation` | vía Mi Marca (sin cambios) |
| Objetivos | `brand_profiles.main_priority` (nueva, ÚNICA prioridad) + `reto_10k_progress` | dos taxonomías → etiquetado separado en gramática (§10) |
| Valor percibido | `brand_profiles.differentiation` (huérfana → wizard) | lo que la clienta debe valorar de ella; alimenta el ángulo del contenido |
| Métricas | `metricool_metrics` + `summarizeMetrics()` (existe, pura) | única fuente; `raw_json` queda para Fase 2 |
| Historial | `content_items` | history=null en F1; join con métricas = Fase 2 |
| Aprendizaje | `brain_observations` (nueva, append-only) | F1: esquema + escritura al editar |
| Estrategia | `STRATEGY_PROMPT` → `strategy_json` + `optimized_summary` | sin cambios en el cuerpo del prompt |

## 4. Datos NUEVOS realmente necesarios (y por qué)

| Dato | Dónde | Por qué no existe |
|---|---|---|
| `shows_face` | brand_profiles (col. nueva) | decide formato de TODO el contenido (guion a cámara vs transformación); hoy no hay columna y la pregunta de Mi Marca solo alimenta strategy_json inferido |
| `main_priority` | brand_profiles (col. nueva, ÚNICA) | metas multiselección generan respuesta "todo" sin señal (principio de producto); una prioridad forzada sí es señal. `main_goal` (legado) sin escritor, y `reto.objective` es su propia taxonomía del reto |
| Observaciones aprendidas | `brain_observations` (tabla nueva) | "qué cambió y cuándo" no se puede reconstruir después; barato de escribir ahora |
| `strategy_generated_at` | dentro de `strategy_json` o columna | necesario para detectar staleness (hoy `brand_profiles` tiene un solo `updated_at`) — AJUSTE QA #2 |

## 5. Flujo completo de onboarding (3-5 min)

1. **Welcome** — Bravi + expectativa honesta ("En 2 minutos…") + micro-vídeo opcional ≤30s (tap-to-play, sin autoplay con sonido): "¿Por qué BRÄVE necesita conocer tu negocio?".
2. Pasos 1-5 (patrón RetoOnboarding, §6-7).
3. **Final** — "Ya te conozco, {nombre}": pantalla con estado de carga (10-40s) mientras la route escribe y genera la estrategia. Bravi celebración (`bravi-celebrate`).
4. → `/inicio`. Card de transición: "Tu estrategia BRÄVE está lista → ver" con deep-link `/mi-marca#estrategia-generada` (ancla real, verificada por QA).
5. Si la IA falla → `completion_status='partial'` → banner en /inicio invitando a Mi Marca (retry reutilizando `generateStrategy`, **sin endpoint nuevo**).

**Persistencia:** session-store incremental (`lib/session-store.ts`) — si cierra la app en el paso 3 no pierde todo (el patrón Reto guarda todo al final; aquí además guardamos localmente cada paso).

## 6. Preguntas exactas que verá la estilista (v2 — revisión de principios)

Principio: **el usuario cuenta su negocio; BRÄVE toma las decisiones de marketing.** Nada de preguntas donde se quiera marcar "todo": priorización única salvo datos FACTUALES (servicios). Cero jerga de marketing.

| # | Pregunta (texto exacto) | Opciones exactas | Respuestas | Saltable | Guarda |
|---|---|---|---|---|---|
| 1 | "¿Cómo te llamas?" (solo si falta tras el registro) | input libre | 1 | Obligatoria (gate) | `profiles.full_name` |
| 2 | "¿Cómo se llama tu salón, tu marca o tú misma?" | input libre (Ej: "Studio Marta" o "Marta López") | 1 | Obligatoria (gate) | `profiles.salon_name` |
| 3 | "¿Dónde trabajas?" | **Por mi cuenta, independiente** · **En el salón de otra persona** · **En mi propio salón** · **En mi salón, con equipo** | 1 | Obligatoria (1 tap) | `brand_profiles.team_info` |
| 4 | "¿Qué servicios haces? Elige todos los que hagas" | Balayage · Rubios · Canas · Alisados · Tratamientos · Corte · Color · Mechas · Keratina · Decoloración · Extensiones · Peinados · **Otro** (texto) | varias (FACTUAL, sin tope) | Obligatoria ≥1 | `main_services[]` |
| 5 | "Si tuvieras la agenda llena de UNO de estos servicios, ¿cuál elegirías?" | single-select entre los elegidos (auto-skip si eligió 1 → "Vale, tu estrella es {X}") | 1 | Obligatoria | `service_to_promote` |
| 6 | "¿Qué te gustaría que una nueva clienta valorase especialmente de ti?" | **La calidad de mi trabajo** · **Mi especialización y experiencia** · **Los resultados naturales** · **Las transformaciones que consigo** · **El cuidado y asesoramiento que doy** · **Otra (te cuento)** · **Todavía no lo tengo claro** | 1 | Saltable de facto (la 7ª opción es el skip) | `brand_profiles.differentiation` (columna existente reactivada) |
| 7 | "Si BRÄVE pudiera ayudarte primero con UNA cosa, ¿cuál elegirías?" *(microaclaración: "Trabajaremos también el resto. Esto solo nos ayuda a saber por dónde empezar.")* | **Conseguir más citas** · **Conseguir que más personas descubran mi trabajo** · **Que me reconozcan como especialista** · **Vender más un servicio concreto** · **Ser más constante (me cuesta saber qué publicar)** · **Aumentar el valor de mis servicios** | 1 | Obligatoria | `brand_profiles.main_priority` (cambiable después en Mi Marca/wizard edición) |
| 8 | "¿Cómo te sientes creando contenido?" | **Salgo a cámara y hablo** · **Aparezco, pero prefiero no hablar** · **Solo muestro mi trabajo** · **Todavía no salgo** | 1 | Obligatoria (1 tap) | `brand_profiles.shows_face` (`talk/appear/work_only/no`) |

Notas v2:
- Si la prioridad elegida es **"Vender más un servicio concreto"**, BRÄVE la vincula automáticamente al servicio estrella de la Q5 — sin pregunta extra.
- Si Q6 = "Otra (te cuento)", input breve opcional (texto libre → `differentiation`).
- La edad de la clienta sale del wizard (→ progresiva en Mi Marca). La IA la infiere de la valoración elegida + servicios.
- Sin ciudad. Internacional: sin "alquiler de silla", sin moneda, sin jerga local; los 12 chips de servicios son el vocabulario del sector.
- Los 4 estados de cámara son exclusivos entre sí; "equipo" ya lo captura la Q3.

## 7. Obligatorias vs progresivas (A/B/C/D)

| Clase | Dato | Cuándo |
|---|---|---|
| **A. Imprescindible onboarding** | salon_name, full_name (gate), main_services ≥1, service_to_promote, main_priority, shows_face (1 tap) | wizard |
| **B. Recomendable después** | edad clienta, ciudad, tono/voz, especialidad, diferencia en detalle | Mi Marca (33 preguntas, intacto) |
| **C. Aprendizaje progresivo** | client_problems/desires, preguntas frecuentes, errores, competencia, recursos, estética + señales de uso (qué formatos regenera, qué descarta) | Mi Marca + `brain_observations` (engine Fase 2) |
| **D. Integraciones/métricas** | followers/reach/engagement (Metricool, YA), historial publicado (F2), IG Insights, reseñas, WhatsApp | accessor lee `metricool_metrics` hoy; resto Fases siguientes |

## 8. Wireframes textuales

**Welcome**
```
[Bravi animado]        "¡Hola! Soy Bravi, tu directora de marketing."
"En 2 minutos conoceré tu salón y te diré qué hacer para crecer."
(▶ ¿Por qué necesito conocer tu negocio? · 30s · opcional)
[ Empezar ]
```
**Paso 1 — Tu salón**
```
Bravi: "Cuéntame lo básico."
· ¿Cómo te llamas?        [input — solo si falta]
· ¿Cómo se llama tu salón, tu marca o tú misma?  [input precargado]
· ¿Dónde trabajas?  (Por mi cuenta | En el salón de otra persona | En mi propio salón | En mi salón, con equipo)
[ Atrás ]  [ Siguiente ]
```
**Paso 2 — Tus servicios** (multi-chips + "Otro…" input; contador "5 elegidos"; obligatorio ≥1)
**Paso 3 — Tu servicio estrella** (tarjetas single-select; auto-skip si 1 servicio: "Vale, tu estrella es {X}")
**Paso 4 — Lo que te define** (7 chips single: valoración de la clienta; "Todavía no lo tengo claro" = saltable)
**Paso 5 — Por dónde empezar** (6 chips single + microaclaración "Trabajaremos también el resto…") + cámara (4 chips)
**Final**
```
Bravi celebración: "Ya te conozco, {nombre}."
"Estoy preparando tu estrategia…"  [spinner, 10-40s]
→ /inicio
```
**Home después** — card "Tu estrategia BRÄVE está lista → ver" (deep-link `#estrategia-generada`) · card "Actualizar mi marca" → wizard en modo edición (la prioridad y la valoración se pueden cambiar aquí) · Home distingue **3 estados**: sin marca / partial / complete (FIX del bug actual que trata partial como complete).

## 9. Edición posterior

- **Mi Marca** = superficie profunda (textarea + 33 preguntas + voz), intacta.
- **Wizard en modo edición** (precargado, solo pasos con cambios) desde card Home "Actualizar mi marca" → misma route con guard distinto (no regenera si el usuario no pide).
- **Staleness:** columna `strategy_generated_at` (o timestamp en strategy_json) + `updated_at` → si los campos vivos son más nuevos que la estrategia, UI muestra banner suave (nunca forzado) y la regeneración oportunista usa `STRATEGY_REFINE_PROMPT` (existente, más barato que regenerar de cero).
- **Anti-drift determinista:** el accessor añade SIEMPRE al final del bloque brand una línea con los chips vivos ("ACTUALIZACIÓN EN CALIENTE: prioridad … · lo que valoran de ti … · servicios … · estrella … · cámara …") — así ni un summary viejo pierde la verdad actual.

## 10. Cómo usa composeBrainContext estos datos

```ts
// lib/ai/brain-server.ts (NUEVO)
export const buildBrainContext = cache(async (userId: string, purpose: BrainPurpose) => {
  const plan = BRAIN_SECTIONS_BY_PURPOSE[purpose]
  const parts: BrainParts = {}
  if (plan.brand) {
    const brand = await getBrandProfile(userId)          // 1 query
    parts.brand = brand ? buildBrandFullContext(brand) : null
    parts.brand = appendLiveUpdateLine(parts.brand, brand) // "ACTUALIZACIÓN EN CALIENTE…" + nota stale
  }
  if (plan.metrics) {
    const rows = await getMetricsLast2Months(userId)     // 1 query
    parts.metrics = rows.length === 0 ? null : summarizeMetrics(rows)
  }
  if (plan.objectives) {
    const reto = await getRetoProgress(userId)           // 1 query, maybeSingle
    const brand = /* ya cargada si plan.brand, si no cargar */
    parts.objectives = buildObjectivesGrammar(brand, reto)
  }
  return composeBrainContext(purpose, parts)              // seam Fase 0
})
```

**Gramática de objectives (NUEVA, única):**
```
PRIORIDAD DE LA USUARIA: {main_priority → texto humano, o 'Sin prioridad marcada — mix equilibrado'}
LO QUE QUIEREN QUE VALOREN: {differentiation → texto}
SERVICIOS ESTRELLA: {service_to_promote + main_services[:3]}   ← plural (etiqueta ya entrenada en reto10k.ts)
NIVEL: {reto.level}
{si reto activo} PROGRESO: DÍA {n} de 30 · FASE {p} — {phase_title} · {posts_per_week}/semana
{si shows_face ∈ ('work_only','no')} RESTRICCIÓN DE PRODUCCIÓN: la estilista NO sale a cámara. Piezas sin su rostro (manos, proceso, antes/después, producto, voz en off).
(Nota: estas prioridades ACTIVAS actualizan y sustituyen cualquier objetivo, servicio o edad desactualizados de la sección de marca.)
```
Metas del RETO etiquetadas por separado (no mezclar vocabularios). La restricción de cámara viaja como instrucción en el contexto (cero cambios de prompt). Post-proceso: validación barata de `visualIdea` (si menciona "habla a cámara" con restricción activa → 1 regeneración).

**Ajuste al plan de Fase 0:** `BRAIN_SECTIONS_BY_PURPOSE.content` y `.stories` → `metrics: true` (prepara Fase 2 sin re-QA posterior; actualizar `tests/brain.test.ts`).

## 11. Consumo por Home, Campañas y Crear

- **Crear (hoy, F1):** sin cambios de props — sigue el toggle "USAR MI MARCA" + buildBrandFullContext en client (el accessor lo sustituye solo cuando el contexto se compone server-side, F2). La restricción de cámara llega vía el objectives part cuando el flujo pase por el accessor.
- **HOME "Hoy" v2 (IMPLEMENTADA 28 sep 2026, determinista):** `lib/home-today.ts` (`decideToday` → `TodayPlan`) decide LA siguiente acción con precedencia: marca incompleta → continuar lo empezado → misión/continuación del Reto de hoy → publicar programados de hoy → sugerencia por `main_priority`. Hero dominante `components/home/TodayCard.tsx` ("Recomendado para hoy · N MIN" + "+ Crear otra cosa"); máx. 2 acciones "Después"; prioridad solo con datos reales del Brain; Brain incompleto = Home minimal (sin grid de herramientas — vive en `/herramientas`); progreso = una sola señal semanal; Reto sin banner permanente (nota contextual). Sin IA ni LLM aún: la versión IA llamará `buildBrainContext(userId, 'recommendation')`. Día de campaña reservado (no hay motor de campañas).
- **Campañas (fase futura):** `buildBrainContext(userId, 'campaign')` alimenta el wizard (objetivo → plan por días); `BrainPurpose.campaign` ya existe en el seam.
- **Team assistant:** mantiene su prompt propio (ya combina marca+ideas+métricas); migrar al accessor queda como deuda documentada, no F1.

## 12. Aprendizaje progresivo sin molestar

- **F1:** esquema `brain_observations` + escrituras no bloqueantes (catch silencioso, nunca rompe el guardado) al editar campos o regenerar estrategia (`kind='manual'`). Cero preguntas nuevas.
- **F2 (definido, no construido):** señales de comportamiento (regeneraciones, descartes, toggles) → `kind='learning'`; integraciones → `kind='integration'`. Anti-repetición ya existente (completedTitles) como precedent.
- Regla transversal: **BRÄVE nunca pregunta lo que ya puede saber** — el accessor reutiliza reto/métricas/estrategia antes de pedir nada.

## 13. Usuarios existentes con información

- Gate del middleware **sin cambios** (full_name + salon_name).
- `completion_status='complete'` → Brain completo, sin acción.
- `'partial'` → banner "Completa tu marca" (ya existe) apunta a Mi Marca; el wizard nuevo también acepta retomarlo.
- Sin marca → invitación Home (ya existe) apunta al wizard.
- Los 4 escritores de brand_profiles pasan a `upsert(onConflict:'user_id')` — constraint UNIQUE ya existe (`server/supabase-schema.sql:22`) y **arregla un bug latente** de carrera en Mi Marca (insert + reinsert de roadmap con id stale).
- Signups nuevos sin full_name → paso 1 del wizard los recoge (coherente con el gate).

## 14. Migración sin romper funcionalidades

1. **SQL aditivo** (2 columnas + 1 tabla + índice + RLS) — nada existente se modifica.
2. **types/database.ts** +2 campos +1 tabla (con Update; las 5 tablas desactualizadas quedan para tarea separada).
3. **Premium publish → merge campo a campo a nivel app:** `select('id, main_priority, shows_face')`; preservar main_priority/shows_face existentes; mantener el contrato gestionado del resto (el admin manda strategy fields). Sin RPC ni COALESCE SQL.
4. **Demo:** wizard hace `demoSaveBrand({ ...demoGetBrand(), ...payload })` (evita el overwrite total actual); demo sin IA (mock).
5. **Middleware:** permit-listear `/api/onboarding/complete` junto a las billing routes (AJUSTE QA CRÍTICO: sin esto, el POST de las usuarias objetivo recibiría un 307).
6. **Deploy seguro:** la migración es retrocompatible; el accessor se despliega antes que el wizard; el wizard entra tras tests.

## 15. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| IA falla al final del onboarding (coste/fallo) | writes DB primero → `partial`; retry vía Mi Marca (sin endpoint nuevo); rateLimit 5/min en la route; guard idempotencia |
| `maxDuration` Vercel mata la route antes del LLM | `export const maxDuration = 60` (verificado soporte Next 14) |
| Drift chips vs optimized_summary | inyección determinista "ACTUALIZACIÓN EN CALIENTE" + nota stale + REFINE oportunista |
| Contradicciones de fuentes (edad/prioridad/reto) | línea de precedencia + etiquetado separado en gramática |
| Middleware bloquea la route de onboarding | permit-list explícito (QA #1 crítico) |
| 4 escritores de brand_profiles | upsert onConflict único (constraint ya existe) |
| summarizeMetrics nunca devuelve null | accessor: `rows.length === 0 → null` |
| Rate limit compartido (20/min IA) con generación de onboarding | 1 llamada sola; guard anti re-fuego |
| premium-strategy legacy pisa brand_profiles sin draft | riesgo ya anotado (ARCHITECTURE #8) — fuera de F1 |
| Sin logging de uso IA (`ai_usage`) | cada estrategia es la generación más cara; pendiente §5.2 |

## 16. Qué NO construir todavía

- Motor de campañas y su tabla (patrón de consumo definido en §11).
- HOME "Hoy" con IA (solo el patrón `recommendation`; la Home actual se limita al fix de 3 estados + cards).
- Learning engine automático (solo esquema + escrituras manuales al editar).
- Joins history × métricas (`history=null`; raw_json queda intacto).
- Integraciones nuevas (IG Insights, reseñas, WhatsApp).
- Editor admin del Brain.
- Re-prompt de generadores existentes (reels/carousels/stories/reto/planner/ideas quedan intactos).
- Endpoint de retry nuevo (reutiliza Mi Marca).
- Rewiring de props de las 17 páginas (F2).
- Migrar el asistente del team al accessor (deuda documentada).

## Aprobación

- product-architect: APROBAR CON CAMBIOS ✓ integrados (scope cut, mecanismo background→route, shows_face 4 valores, goals vs main_goal, full_name paso 1, brain_observations completado, merge especificado, demo en scope).
- frontend-ux: APROBAR CON AJUSTES ✓ integrados (ciudad/deseos fuera, chips reescritos sin jerga, auto-skip, guardado incremental, fix Home 3 estados, ancla real, 2 micro-vídeos, sin BraviMascot/hex).
- backend: APROBAR CON CAMBIOS ✓ integrados (maxDuration, RLS append-only, NOT NULL, upsert, retry sin endpoint, merge app-level, demo spread, idempotencia).
- ai-content: APROBAR CON AJUSTES ✓ integrados (gramática exacta, ficha intermedia, post-proceso, anti-drift, metrics:true en content/stories).
- QA: COHERENTE CON AJUSTES ✓ integrados (middleware permit-list, strategy_generated_at, Update en types, ancla real, precedencia edad, null de métricas).

**Esperando aprobación de Jota para implementar.**