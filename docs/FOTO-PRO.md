# FOTO PRO · Retoque Pro — documentación técnica

> Última actualización: 8-oct-2026 · MVP de Retoque Pro en producción-código (pendiente llave de proveedor).

---

## 1. Qué es

**Foto Pro** es la shell de la capa de fotografía profesional de BRÄVE Studio. Dos sub-herramientas:

| Sub-herramienta | Estado | Ruta |
|---|---|---|
| **Retoque Pro** | Disponible (MVP) | `/foto-pro/retoque` |
| **Sesión IA** | Próximamente — NO funcional (solo card bloqueada) | — |

**Producto:** una peluquera sube una foto real (suya o del resultado de una clienta), elige UNA mejora, su intensidad, y obtiene una versión mejorada lista para Instagram. Filosofía: **conservar la identidad y el trabajo real** — nunca falsear el resultado del salón.

## 2. Reglas de producto (innegociables)

1. **Una edición = una llamada al proveedor.** Elige modo/intensidad es configuración LOCAL (cero llamadas). Solo el botón «✨ Aplicar mejora» dispara la edición.
2. **Preservación:** identidad, rasgos, pose, ropa, encuadre y — sobre todo — **el color y la técnica del cabello** (balayage sigue siendo balayage). Sin piel plástica, sin pelucas, sin cambiar de técnica.
3. **Sin features FaceApp:** no se genera desde cero, no hay sliders en tiempo real, no hay "cambiar el rostro".
4. **Privacidad:** bucket privado, URLs firmadas de 1h mediadas por servidor, aislamiento por `user.id` en las rutas de Storage. Aviso de permiso de la foto en la UI.
5. **Honestidad:** si el proveedor no está conectado → estado de error honesto (nunca una foto fake en producción). El mock solo existe en modo demo, siempre con badge visible.

## 3. Piezas del código

```
client/
├── app/(app)/foto-pro/
│   ├── page.tsx + FotoProClient.tsx        # shell (Retoque Pro + Sesión IA bloqueada)
│   └── retoque/
│       ├── page.tsx                        # demo/real gate
│       └── RetoqueClient.tsx               # flujo completo (4 estados)
├── components/photo-pro/
│   └── BeforeAfterSlider.tsx               # comparador ANTES/DESPUÉS (pointer events, móvil)
├── lib/photo-pro/
│   ├── types.ts                            # PhotoMode, EditInstructions, ImageEditProvider, ProviderEditError
│   ├── presets/                            # MOTOR DE PRESETS (ver §4)
│   │   ├── face.ts · hair.ts · background.ts · general.ts
│   │   └── index.ts                        # MODE_META + INTENSITY_LIMIT + buildInstructions()
│   ├── normalize.ts                        # HEIC/JPG/PNG/WEBP → JPEG ≤1600px (client-side, sin deps)
│   └── provider.ts                         # ADAPTER Gemini 2.5 Flash Image + mock dev (server-only)
├── app/api/photo-pro/
│   ├── upload/route.ts                     # sube la foto original (bucket privado)
│   ├── jobs/route.ts                       # POST crea y ejecuta el job · GET historial
│   └── jobs/[id]/route.ts                  # GET job con URLs frescas · PATCH {saved}
└── tests/photo-pro-presets.test.ts         # 12 tests del engine
```

**Flujo de estados del cliente (RetoqueClient):**

| Estado | Qué ve la usuaria |
|---|---|
| `upload` | Zona de subida + historial «Tus fotos mejoradas» |
| `adjust` | **Pantalla única de ajuste**: foto original siempre visible arriba (preview), chips de modo (cambio libre), intensidad (cambio libre), lista «Mantendremos», botón «Aplicar mejora» |
| `processing` | Spinner + copy por modo («Potenciando el cabello sin perder el resultado original…») + segundos transcurridos; error honesto con Reintentar/Volver |
| `result` | Slider antes/después, Guardar (estrella), Descargar (iOS share sheet / a.download), Crear otra versión, Ajustar de nuevo |

Cambio de UX (8-oct): antes había 3 pantallas separadas (modo → intensidad → confirmar) que obligaban a entrar/salir; ahora TODO se ajusta en la de `adjust` con la foto delante. La preview de la foto YA editada solo existe tras aplicar (aplicar = 1 llamada); lo que se ve durante el ajuste es la foto original.

## 4. Motor de presets

`presets/index.ts` es la única fuente de verdad. Cada preset (face/hair/background/general) aporta:

- `label` / `desc` / `processingCopy` — copy de UI (sin jerga técnica: la usuaria NUNCA ve qué modelo usamos).
- `willKeep[]` — lo que se enseña en «Mantendremos» antes de aplicar.
- `intensities[]` — `{value, label, microcopy}` (face 3 · hair 5 · background 3 · general 3).
- `build(intensity) → EditInstructions` — `EditInstructions {goal, preserve[], avoid[]}` en español directo.

**El formato del prompt lo pone el ADAPTER del proveedor** (`provider.ts` compone el texto final a partir de goal/preserve/avoid). Los presets no conocen al proveedor; el proveedor no conoce la UI.

**Código real del adapter (Gemini):** POST `${PHOTO_EDIT_BASE_URL}/models/${model}:generateContent?key=...` con `contents: [{parts: [{text: promptCompuesto}, {inline_data: {mime_type, data(base64)}}]}]` — sin `generationConfig` (el modelo imagen devuelve `inlineData` por defecto). Timeout con AbortController (110s). Errores → códigos estables de `ProviderEditError`.

## 5. Proveedor de edición (ImageEditProvider)

```ts
interface ImageEditProvider {
  id: string
  editImage(req: EditRequest): Promise<ImageEditResult>
}
```

- **Activar el proveedor real:** variable `GEMINI_API_KEY` en Vercel/modelo `gemini-2.5-flash-image`. `resolvePhotoEditProvider()` devuelve el provider si hay key válida, y `null` si no → la API responde **503 `provider_not_configured` sin crear job** (honesto).
- **Mock dev-only:** `PHOTO_EDIT_PROVIDER=mock` o sin key en dev → `mockProvider` (devuelve la misma imagen, model `mock-development`), y el cliente demo muestra badge «Ejemplo — IA no disponible aquí».
- **Cambiar de proveedor** (p.ej. a un Beauty SDK en fase 2): implementar la interfaz en un archivo nuevo, en `provider.ts` el env `PHOTO_EDIT_PROVIDER` selecciona; cero cambios en UI ni en jobs route.
- Códigos de error estables: `provider_not_configured | provider_timeout | provider_error | no_image_returned | source_unreadable | db_error` (+ `too_many_requests`/`formato_no_valido`/`foto_demasiado_grande` de las validaciones previas). Mensajes SAFE_MESSAGES — nunca se filtran internals del proveedor al cliente.

## 6. Modelo de datos y Storage

**Tabla `photo_edit_jobs`** (migración `20261008200000_add_photo_pro.sql`, RLS por user_id):

| Columna | Notas |
|---|---|
| `id, user_id, created_at, completed_at, updated_at` | |
| `asset_path` | `${user.id}/${assetId}/source.jpg` — foto original |
| `result_path` | `${user.id}/${job.id}/result.jpg` — resultado (se llena al completar) |
| `mode` | `face | hair | background | general` (CHECK) |
| `intensity` | 1–5 (CHECK) |
| `provider, provider_job_id` | auditoría del motor usado |
| `status` | `pending | processing | completed | failed` (CHECK) |
| `error_code, error_message` | mensaje user-safe, sin internals |
| `saved` | estrella «Guardar» (PATCH propio) |

**Storage:** bucket privado `photo-pro` (se crea idempotente en el upload). Rutas aisladas por `user.id`; acceso SOLO vía `createSignedUrl(path, 3600)` generada server-side. El original NUNCA se sobreescribe (source vs result separados) y el historial re-firma al vuelo (las URLs de 1h nunca quedan obsoletas en la UI).

## 7. Control de coste

- **Cero llamadas** en: elegir modo, cambiar intensidad, volver atrás, ver historial.
- **1 llamada** en: pulsar «Aplicar mejora».
- Protecciones: `submittingRef` (cliente) + **doble-submit server** (si hay job `processing` del mismo usuario+asset hace <20s, se devuelve ese job en vez de lanzar otro) + rate limit 10 jobs/min/usuario (`lib/rate-limit.ts`).
- **Seam para créditos futuros:** el único punto de gasto es `POST /api/photo-pro/jobs` — ahí se enganchará el sistema de créditos sin tocar la UI.

## 8. Añadir un preset o un modo nuevo

1. Crear `lib/photo-pro/presets/<modo>.ts` con `build<X>Instructions(niveles)`.
2. Añadirlo al `MODE_META` + `INTENSITY_LIMIT` en `presets/index.ts` (+ `PhotoMode` union en `types.ts` y CHECK de la migración si es un modo nuevo de verdad).
3. El cliente (chips, intensidades, willKeep, processing) se pinta solo desde `MODE_META`. Nada más.

## 9. QA hecho (8-oct-2026)

- `npx tsc --noEmit` limpio · `vitest` 307/307 (incluye 12 nuevos de presets) · `next build` OK (105 páginas).
- Playwright móvil 390: subida (normalización a JPEG), pantalla única de ajuste con preview visible, cambio de modos sin salir, 5 intensidades de cabello, aplicar → exactamente el procesado → resultado con slider exacto (drag 75% = cut 25%), Guardar/estrella, Descarga real del archivo, historial reabre resultado (labels desde el job, no del estado).
- Desktop 1440: chips en 4 columnas, sidebar con Foto Pro activo.
- Regla de coste verificada en browser: cambiar modo/intensidad NO dispara ninguna request.

## 10. Pendiente (roadmap)

- **Activación real:** pegar migración en Supabase SQL Editor + `GEMINI_API_KEY` en Vercel → probar con una foto real de clienta y afinar los presets (especialmente hair nivel 4–5).
- **Fase 2 (NO construir aún):** previews de estilos antes de aplicar, sliders locales (beauty SDK), Sesión IA (generación con identidad mantenida), créditos por uso.
- **Métricas:** contar jobs por modo en admin (seam en la tabla ya está: `mode` + `provider`).