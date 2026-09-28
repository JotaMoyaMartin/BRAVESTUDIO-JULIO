# BRÄVE Studio — Roadmap

> Última actualización: 2026-09-28 · Principio: priorizar lo que hace que la usuaria **vuelva todas las semanas**, no lo llamativo.

---

## 0. Criterios de evaluación

Valor de usuario · impacto en retención · frecuencia de uso · diferenciación · complejidad · coste (IA/infra) · dependencia externa · riesgo.
**Filtro UX:** ¿la usuaria sabe qué hacer ahora sin pensar? ¿la acción es ejecutable en 1 clic desde la recomendación?

---

## 1. NOW — próximo ciclo (fundamento + retención inmediata)

| # | Iniciativa | Por qué ahora | Dependencias |
|---|-----------|---------------|--------------|
| N1 | **Hardening de seguridad** (quick wins): auth + rate limit en `/api/ai/generate`; decidir autenticación mínima de `/api/team/*`; fix `CodesTab` (API route); timeout en clientes IA; `update-role` que admita `premium` | Sin esto, todo lo demás crece sobre suelo frágil | — |
| N2 | **Núcleo IA unificado**: `lib/ai/llm.ts` (timeout, retry, temperatura, system role), `lib/ai/manual.ts` (BRAVE_MANUAL constante), extractJSON único + flag `mock` visible | Elimina la mayor deuda de IA; hace mantenibles todos los generadores futuros | — |
| N3 | **Business Brain v1**: accessor server-side único que unifica las 2 gramáticas actuales (brand-context + team fallback) y compone marca + objetivos + resumen de métricas por `purpose` | Base de todo: campañas, HOME, auditoría, recomendaciones | N2 |
| N4 | **HOME "Hoy" v1** (proyección de estados + 1 recomendación del Brain + contenido pendiente + reto). Es el módulo de retención más barato: cero tablas nuevas ✅ HECHA 28 sep 2026 (v2: Home = dirección, herramientas en `/herramientas`, sin IA) | La razón de volver a diario | N3 |
| N4b | **Teleprompter V1** ✅ HECHA 28 sep 2026: grabación nativa con cámara (getUserMedia + MediaRecorder, sin deps) — `/teleprompter` (herramienta independiente con borrador local) + capacidad integrada: botón "Grabar con teleprompter" en guion de Reel y [Grabar] por Story (payload `TeleprompterInput` vía sessionStorage con secuencia "Continuar con Story N+1"). Guardado en dispositivo (Web Share API → `a[download]`). Sin edición de vídeo, sin subida a Storage. | Grabar bien lo que BRÄVE escribe | N3 |
| N4c | **Creador de Carruseles V1** ✅ HECHA 28 sep 2026: no es Canva — idea → BRÄVE escribe (3/5/7 slides, `generateCarousel` con mock en demo) → BRÄVE maqueta con motor de plantillas canvas 2D bloqueado (`lib/carousel/`: 3 familias Minimal/Beauty/Bold × 2 paletas, layouts auto por BRÄVE, texto con auto-fit medido) → personalización controlada (editar texto, foto por slide con pan/zoom, elegir familia/color) → export JPEG 1080×1350 (WYSIWYG preview=export, sin deps) + guardar en Biblioteca (`content_items.type='carrusel'`). `/carrusel` + tile en launcher. Sin editor libre, sin IA visual, sin plantillas nuevas por generación. | Presencia premium sin diseñar | N3 |
| N5 | **Onboarding → Brain progresivo**: al terminar onboarding, llevar a Mi Marca con 5 preguntas prioritarias (servicios, clienta ideal, objetivo) — el resto progresivo | El Brain sin datos no recomienda bien | N3 |
| N6 | **Métricas para todos** (o casi): conectar cuenta Metricool propia (o lectura manual simple) a la usuaria normal + cron de sync. El Brain "aprende" con datos reales | Retención semanal (ver su progreso) | N3, cron |

**Criterio de salida de NOW:** HOME recomienda acciones correctas basadas en Brain + estados; seguridad básica resuelta; toda la IA pasa por un cliente único.

## 2. NEXT — el diferencial (1-3 meses)

| # | Iniciativa | Por qué | Notas |
|---|-----------|---------|-------|
| X1 | **Campañas v1** | Módulo diferencial + motor de "qué hacer" | 4-6 objetivos predefinidos (llenar huecos, lanzar servicio, reactivar, reseñas); plan por días con acciones CREAR/GRABAR/PROGRAMAR/COMPLETAR; revisar → enviar a calendario. Reutiliza pipeline ideas + generadores + CalendarView + Metricool scheduler; WhatsApp = texto a copiar |
| X2 | **Estados unificados del pipeline** | Calendario se convierte en centro de operaciones | `idea→pendiente→crear→grabar→editar→listo→programado→publicado` mapeado a status/reto_status vía helper único (migración progresiva) |
| X3 | **Teleprompter + stories habladas** | Ataque directo al miedo a cámara (dolor #1) | PWA: cámara frontal + texto overlay + velocidad/tamaño + MediaRecorder → guardar. Sin backend nuevo (video a Storage) |
| X4 | **Auditoría IG v1** | Onboarding del valor ("BRÄVE entiende mi IG") | Checklist guiada (bio, foto, nombre, CTA, destacados, frecuencia) → 3 prioridades → cada una con acción BRÄVE (ej. "reescribe tu bio" → genera). Sin scraping inicial; métricas Metricool si existen |
| X5 | **Academia: aprendizaje mínimo + acción inmediata** | Educar mientras retiene | Gate de rol, progreso en analytics, cada lección termina en una acción (crear X) |
| X6 | **Botón global "+ Crear"** (principio Libertad, PRODUCT §6.2) | Entrada LIBRE unificada: "Recomiéndame algo" ("No sé qué crear" → vía `buildBrainContext('recommendation')`) + herramientas agrupadas en Crear: Para tus redes (Reel/Stories/Carrusel/Copy) · Inspiración (Ideas/Reels/Transiciones) · Recursos (Biblioteca/Plantillas) · IA (futuras visuales) | N3, X1 |

## 3. LATER — diferenciación visual y canales (3-6 meses)

| # | Iniciativa | Precondición |
|---|-----------|--------------|
| L1 | **Carruseles con plantillas premium bloqueadas** (IA rellena, plantilla controla diseño, sustitución de imágenes) | Diseño de 3-5 plantillas (recurso de diseño); render HTML/CSS→imagen o editor ligero |
| L2 | **Plantillas de stories bloqueadas** | Mismo motor que L1 |
| L3 | **Publicación directa IG/FB** | Informe de Instagram Graph (`instagram_content_publish`, cuenta Business, review Meta) aprobado |
| L4 | **Google Business + reseñas** | Tras campañas (reseñas = campaña tipo) |
| L5 | **WhatsApp dentro de campañas** | Tras X1 (mensajes a copiar; integración API después si vale) |
| L6 | **Servicio humano / upsell** ("editar tú con guía" vs "lo edita BRÄVE CONTENT") | Tras teleprompter (N3 genera el material a editar) |
| L7 | **Retos configurables** (constancia mensual fuera del Reto 10K) | Tras campañas (comparten motor) |

## 4. EXPERIMENTAL — WOW con control

| # | Iniciativa | Riesgo | Nota |
|---|-----------|--------|------|
| E1 | **Beauty AI** (perfil profesional, transformaciones de cabello con preservación de identidad) | Alto (realismo, expectativas) | Proveedores externos; nunca modelos propios; flag experimental visible |
| E2 | **Voz en el Business Brain** (onboarding/auditoría por voz) | Medio | Alimenta el mismo accessor del Brain |
| E3 | **Aprendizaje automático**: recomendaciones ponderadas por rendimiento real | Medio | Requiere semanas de métricas acumuladas (post-N6) |
| E4 | **Comunidad interna** | Alto coste, valor dudoso | Mantener Skool; reevaluar cuando Academia + retos generen hábito |

## 5. Evaluación resumida (criterios del brief)

| Iniciativa | Valor | Retención | Frecuencia | Diferenc. | Complejidad | Coste | Dep. ext. | Riesgo |
|---|---|---|---|---|---|---|---|---|
| N1 hardening | — | — | — | — | baja | bajo | no | ↓ elimina |
| N2-N3 IA+Brain | alto | alto | alta | alto | media | bajo | no | bajo |
| N4 HOME Hoy | alto | **muy alto** | **diaria** | medio | baja | bajo | no | bajo |
| N6 métricas | alto | alto | semanal | medio | media | bajo | Metricool | medio |
| X1 campañas | **muy alto** | alto | semanal | **muy alto** | media-alta | medio | no | medio |
| X3 teleprompter | alto | alto | alta | alto | media | bajo | no | bajo |
| X4 auditoría IG | alto | medio | mensual | alto | media | bajo | no (v1) | bajo |
| L1-L2 plantillas | alto | medio | media | **muy alto** | alta | medio | no | medio |
| L3 publicación directa | alto | alto | semanal | medio | alta | bajo | **Meta review** | alto |
| E1 Beauty AI | medio (WOW) | bajo | baja | alto | media | variable | proveedor | alto |

## 6. Primeras 5 acciones de desarrollo (orden)

1. **N1** — Hardening: auth+rate-limit `/api/ai/generate`, timeout IA, fix CodesTab, cerrar exposición team.
2. **N2** — `lib/ai/llm.ts` + `lib/ai/manual.ts` (migrar los 8 prompts + el duplicado de MiMarca).
3. **N3** — Business Brain accessor único (unificar brand-context + ForUser + resumen métricas).
4. **N4** — HOME "Hoy" v1 (proyección + recomendación del Brain).
5. **X1** — Motor de campañas v1 (2-4 objetivos, plan por días, acciones, calendario).

## 7. Dependencias críticas del roadmap

- N3 bloquea N4, X1, X4 y toda recomendación — es el cuello de botella.
- X1 depende de N2 (calidad/consistencia de generadores) y del Brain.
- L1/L2 necesitan recursos de diseño (plantillas) — no son solo código.
- L3 depende de verificación Meta (cuenta Business, app review) — empezar trámite temprano si se quiere en LATER temprano.
- N6 requiere una cuenta Metricool de la clienta (o aceptar entrada manual) — validar con clientas reales antes.

## 8. Lo que NO construiremos (decisión explícita)

Ver `docs/ARCHITECTURE.md` §7: comunidad interna, CRM WhatsApp, editor de vídeo propio, publicación directa sin informe Meta, modelos propios de imagen, scraping de IG.