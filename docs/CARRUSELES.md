# Carruseles — Arquitectura UX y sistema de estilos

> "Estoy eligiendo una dirección creativa", no "estoy configurando una IA".

Sección `/carrusel` de BRÄVE Studio. Sustituye al editor del LAB (fórmula foto+texto)
por una experiencia premium completa para estilistas sin conocimientos de diseño.

## 1. Flujo (máquina de estados)

```
style → studio → generating → result
  │        │          │          │
  │        │          │          └─ galería horizontal 01/04 + acciones por slide
  │        │          └─ progreso por slide (bloqueo total, estilo visible)
  │        └─ 2 columnas: izq = idea/copy/ajustes · der = estilo sticky
  └─ picker visual a pantalla completa
```

Orden de decisión (el brief manda):

1. Estilo visual (tarjetas con imágenes reales)
2. Tema ("¿De qué quieres hablar?" + chips + Nº slides AUTO recomendado)
3. "Crear propuesta" → copy por slide (hook → valor → cierre → CTA)
4. Revisión: todo editable inline + tweaks discretos (Regenerar hook, Más breve/premium/directo/educativo/emocional)
5. Wireframe por slide con el tipo visual previsto (Hero / Macro / Manos / Resultado)
6. Ajustes opcionales (colapsado): CTA y firma del salón
7. "Generar carrusel" → bloquea copy → genera imagen por slide con prompts independientes
8. Resultado: regenerar UNA slide sin tocar el resto, editar textos, cambiar imagen

Las imágenes NUNCA se generan antes de aprobar el copy.

## 2. Pantallas y estados

| Vista | Contenido | Estados |
|---|---|---|
| `style` | grid de tarjetas + lightbox al tocar imagen | estilos `soon` se muestran deshabilitados ("Próximamente") |
| `studio` | izquierda: topic → propuesta → ajustes → CTA final. derecha sticky: refs del estilo + wireframe | copy cargando (skeleton), copy error con retry, tweaks cargando (spinner en el botón) |
| `generating` | checklist por slide + ref del estilo | ok / error por slide (retry individual) sin cancelar el resto |
| `result` | galería horizontal + caption copiable + acciones | descargando, guardando, regenerando una slide (solo esa se refresca) |

Estructura persistente: esqueleto del draft en `session-store` (clave `u:{userId}:carruseles:draft`).
El resultado final se guarda en `content_items` (type `carrusel`) vía `saveToLibrary`.

## 3. Sistema de estilos (escalable a N)

Cada estilo es un **estilo visual** en `lib/carruseles/styles.ts`:

```ts
{
  id, name, tagline, description, mood[], status: 'live'|'soon', accentColor,
  referenceImages: ['/carruseles/refs/editorial-hair-luxe/r1.jpg', ...],
  palette: { tokens[] }, typography: { serif, sans, italicAccent, rules[] },
  copyStyle: { hook, body, cta, rules[] },
  photoDirection: { types: Record<VisualType,{label,prompt}>, rotation: VisualType[][] },
  layoutRules[], graphicElements[], negativeRules[],
  imagePromptBase,            // bloque STYLE SYSTEM que va verbatim al prompt de imagen
}
```

Añadir un estilo = añadir un objeto al array + carpeta `public/carruseles/refs/<id>/`.
Cero cambios de UI. La UI está prohibida de hardcodear "Editorial Hair Luxe".

`VisualType` (rotación fotográfica) evita repetir el mismo encuadre:

`hero_result · macro_detail · hands_process · tools · product · extensions_material · lifestyle · salon_env · before_after`

Regla: nunca más de una slide con el mismo tipo; el copy IA asigna la secuencia
que mejor explica la historia y la UI la muestra en el wireframe.

## 4. Prompts

- **Copy**: `buildCopyPrompt({style, topic, slideCount, brandContext, ctaHint})` → JSON
  `{slides:[{n,role,text,visual}], cta, caption}` vía `/api/ai/generate` existente
  (callLLM + extractJSON; inyecta siempre contexto de marca).
  Tweak de hook/variantes = prompt pequeño que devuelve proposal revizada.
- **Imagen**: el cliente envía datos, NO texto libre. `POST /api/carruseles/slide`
  construye server-side `buildSlidePrompt(style, slide, firma)` =
  `STYLE SYSTEM (imagePromptBase verbatim) + VISUAL TYPE + COPY EXACTO (render literal)`
  + firma + prohibiciones (no inventar texto, no logos, no cambiar el CTA).
  El estilo se copia como dirección de arte, no como foto exacta.

## 5. Backend

- `lib/carruseles/image-provider.ts` — text-to-image (Gemini, patrón photo-pro,
  modalities IMAGE). `CARRUSEL_IMAGE_MODEL` configurable, default `gemini-2.0-flash-exp`.
- `lib/carruseles/server.ts` — bucket privado `carrusel-slides`
  (`{userId}/{draftId}/slide-{n}-{ts}.{ext}`, signed URL 24h).
- `app/api/carruseles/slide/route.ts` — gate `requireDesignAccess` +
  rate limit `carruseles:{userId}` 10/min + maxDuration 120 + retries como photo-pro.
  Errores en mensajes humanos (`SAFE_MESSAGES`), nunca detalles del proveedor.

Guardar en biblioteca: client llama `saveToLibrary(userId, {type:'carrusel', title,
content_json: {kind:'premium-carousel', styleId, topic, slides:[{text,visual,image_path}], signature, caption}}, demo)`.

## 6. Archivos

```
docs/CARRUSELES.md                        ← esta doc
lib/carruseles/types.ts                   ← contrato
lib/carruseles/styles.ts                  ← registro de estilos (data)
lib/carruseles/prompts.ts                 ← builders copy + imagen (isomorfos)
lib/carruseles/image-provider.ts          ← adapter text-to-image (server)
lib/carruseles/server.ts                  ← bucket + upload + firma URLs (server)
app/api/carruseles/slide/route.ts         ← generación de 1 slide (server)
app/(app)/carrusel/page.tsx               ← server page (sesión + brand)
app/(app)/carrusel/CarruselesClient.tsx   ← máquina de estados del flujo
components/carruseles/StylePicker.tsx     ← pantalla 1 + lightbox
components/carruseles/StyleSidePanel.tsx  ← columna sticky / strip móvil
components/carruseles/CopyStudio.tsx      ← idea + propuesta editable + ajustes
components/carruseles/WireframeStrip.tsx  ← 1/4 … con tipo visual previsto
components/carruseles/GeneratingView.tsx  ← progreso por slide
components/carruseles/ResultGallery.tsx   ← galería final + acciones
public/carruseles/refs/<styleId>/*.jpg    ← imágenes de referencia reales
tests/carruseles-prompts.test.ts          ← rotación, parse, firma, exactitud
```