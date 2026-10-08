# Stories Diseño — rework "mini Canva" (oct 2026)

Galería de plantillas de stories 9:16 estilo Canva: la usuaria elige un diseño, BRÄVE adapta los textos a su salón y ella pone las fotos; exporta la secuencia en PNG y la sube a Instagram en orden. Sustituye al marketplace de packs anterior.

---

## 1. Piezas

| Pieza | Archivo | Rol |
|---|---|---|
| Catálogo | `app/(app)/stories-diseno/StoriesDisenoCatalog.tsx` | Galería: buscador, chips de temática, grid 2/3/4 col, previews live, favoritos, modal de preview, monta el editor |
| Editor | `app/(app)/stories-diseno/StoriesEditor.tsx` | Edición full-screen: 3 paneles desktop / sheets móvil, IA (variantes + adaptar secuencia), fotos zoom/pan, export PNG |
| Renderer | `app/(app)/stories-diseno/SlideCanvas.tsx` | Dibuja un slide en DOM layers (1080×1920 canvas coords, `scale` prop). Export via html-to-image del mismo DOM |
| Tipos | `lib/stories-diseno/types.ts` | Schema v2: slides con `zIndex`, roles, constraints, aiConfig |
| Seeds | `lib/stories-diseno/samples.ts` + `samples-editorial.ts` | Packs demo (sin DB). Editorial seeds: lazy `editorialSeeds()` — **nunca const a nivel de módulo** (ciclo ESM ↔ samples, TDZ) |
| Iconos | `lib/stories-diseno/icons.ts` | Mapa de stickers SVG |
| Builder admin | `components/admin/StoriesBuilder.tsx` | Builder visual full-screen: páginas (dnd), capas (dnd + ojo/lock), canvas con transform free (move/resize/rotate), panel de propiedades |
| Admin library | `components/admin/StoriesTab.tsx` | Lista de plantillas, miniatura live, Diseñar (builder), Duplicar, Archivar/Desarchivar, editor JSON |
| API admin | `app/api/stories-diseno/admin/*` | CRUD packs/templates; PATCH acepta `status: archived`; POST duplica plantilla |
| API favoritos | `app/api/stories-diseno/favorites/route.ts` | GET lista / POST `{templateId}` toggle (best-effort, degrada sin tabla) |
| Página | `app/(app)/stories-diseno/page.tsx` | Server: DB → catálogo; demo → `demoPacks()`. Descarta archived. Pasa `initialFavorites` |
| Fonts | `lib/stories-diseno/fonts.ts` | Lista curada de tipografías (`STORY_FONTS`, css usa variables next/font montadas en `app/layout.tsx`). Nunca Cormorant/Playfair/Inter/Manrope/Jost |
| API upload | `app/api/stories-diseno/admin/upload/route.ts` | POST multipart `file` (admin) → Storage `story-design-assets` (público, se crea si falta) → `{ url }` |

## 2. Modelo de datos

- `story_design_packs` + `story_design_templates` (existentes). **Sin migración de schema**: los campos nuevos v2 viven en `slides` (jsonb, opcionalmente en cada elemento).
- `story_design_templates.status`: `draft | published | archived` (const constraint en `supabase/migrations/20261008110000_add_story_design_favorites.sql`).
- `story_design_favorites` (misma migración): `(user_id, template_id)` PK compuesto, FKs con cascade, RLS own-only (select/insert/delete). Pegar en SQL Editor de Supabase.

### Rol de elementos v2
`fixed` (no editable) · `editable` (texto libre) · `ai` (texto con IA, `aiConfig.purpose+hints`) · `replaceable` (foto intercambiable) · `brand` (tokén `{{salon_name}}`/`{{ig}}`/`{{service}}`) · `decorative`. Flags: `locked`, `visible`.

### Campos v2 por elemento
`zIndex` (orden explícito; si ningún elemento lo declara se usa el orden legacy), `constraints` (`maxLength`, `maxLines`), `aiConfig`, `style` extendido, sticker/icon paths (`src`, viewBox).

## 3. Flujo IA
El editor reusa el proxy `/api/ai/generate` + `generateAIContent`/`extractJSON` (no nuevos clientes). Dos modos: **variantes** de un texto editable y **adaptar secuencia** completa al brand. Inyecta brand-context siempre (`BrandFullContextInput` desde `brand_profiles`).

## 3b. Edición libre de la usuaria (8-oct-2026)
- **Mover**: los textos/badges con role editable/ai/brand se arrastran en el canvas (overlay de movimiento) y se mueven con flechas en el panel (pasos de 40px). Estado de sesión `posEdits` → `SlideCanvas` prop `positions` (canvas, miniaturas y export lo reciben = WYSIWYG).
- **Tipografía**: chips con las 8 fuentes curadas en el panel del texto/badge (`fontEdits` → prop `fontOverrides`). Estado de sesión; el diseño por defecto vive en la plantilla.
- La foto sigue en su hueco (pan/zoom), los elementos fixed/decorative no se mueven.

## 4. Galería (detalles concretos)

- Buscador: `norm()` sin acentos; `metaHay()` (título/categoría/desc/tags/pack) para **chips**, `haystack()` añade el **contenido** de los elementos para el **buscador libre** (p. ej. "balayage" vive dentro de un texto).
- Chips de temática: 10 (Todos, Para vender, Agenda, Autoridad, Resultados, Tratamientos, Antes y después, Consejos, Promociones, Interacción) con palabras clave.
- Cards: preview live del slide 1 (`LiveCover` + `ResizeObserver` → `scale = w/1080`), un solo badge visible en el footer por prioridad `recomendado > nuevo` (IA solo en el modal), estrella de favoritos, overlay "Próximamente" si locked.
- Preview modal: bottom-sheet móvil / centrado desktop, secuencia completa en scroll horizontal, "Usar plantilla" cierra modal antes de montar editor.
- Favoritos: `useState` hydrata `{...localStorage, ...db}`; toggle actualiza localStorage + `POST /api/stories-diseno/favorites` best-effort. Key local: `brave_sd_favs`; en DB la clave es el **id de plantilla** (en demo son slugs sintéticos).

## 5. Export
Botón "Guardar" del editor: html-to-image sobre cada canvas `[data-slide-export]` con todos los elementos a escala real (1080×1920), descarga PNG por story. Fotos soportan zoom/pan persistente en el elemento.

## 6. Seeding prod
Seed script REST en `/tmp/sd-seed/` (Node type-stripping: imports locales con **extensión `.ts`** y `import type` para types-only). Idempotente por slug. 12 plantillas / 3 packs sembrados en prod.

## 7. QA / cómo probar

```bash
cd client && npx tsc --noEmit   # filtrar salida "carousel/" (de Jota)
npm run build
```

- Galería: buscar "balayage" (match por contenido), chip «Agenda», favorito (estrella), preview → Usar → editor.
- Editor móvil (390px): sheets de texto/foto, pan de foto, export.
- Admin (rol admin): `/admin` → Stories → Diseñar (builder); Duplicar; Archivar.
- Favorito con DB: require migración 20261008110000 aplicada.

## 8. Límites conocidos
- Covers/preview/export no son interactivos: cuando no hay edición, SlideCanvas renderiza `div` en lugar de `button` (evita nested buttons / hydration).
- `docs/ARCHITECTURE.md` y el renderer 2D de carruseles son de otra fase — este módulo no depende de ellos.
- Los favoritos en demo (sin DB) son solo localStorage.
- Las posiciones/typografías de la usuaria son de sesión: se exportan al PNG pero no se guardan en DB (la plantilla es intactable por diseño).
- El builder marca las fotos con presets claros (a sangre / hero / cuadro) y acepta **arrastrar una foto al lienzo** (sube a Storage y crea el elemento image en el punto del drop); soltar texto crea un elemento de texto.