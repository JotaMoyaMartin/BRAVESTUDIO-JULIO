# BRÄVE Studio — Documento de Producto

> Última actualización: 2026-09-28 · Origen: visión Lead Product Architect + auditoría del repo

---

## 1. Qué es BRÄVE Studio

SaaS especializado en **estilistas, peluquerías y salones de belleza**.

**Visión:** *"Tu directora de marketing para el salón."*

No es una colección de herramientas de IA. Es un producto que conoce el negocio, entiende sus objetivos y dirige al profesional paso a paso: qué hacer → estrategia → contenido → constancia → campañas → resultados → aprendizaje.

**Usuario típico:** mujer 30-45 años, estilista o dueña de salón, **baja habilidad técnica y de marketing**. No sabe qué publicar, no es constante, tiene miedo a hablar a cámara.

**Filosofía UX:** menos opciones + más dirección.
- BRÄVE no pregunta "¿qué quieres crear?" — dice: *"Esto es lo que te recomendamos hacer ahora."*
- Nunca abrumar con dashboards fríos, configuraciones técnicas o demasiadas decisiones.
- Toda recomendación debe convertirse en una acción ejecutable con 1 clic.

---

## 2. Roles y experiencias (ya implementados)

| Rol | Cómo entra | Experiencia |
|---|---|---|
| **user** (normal) | Stripe (trial 7d) / promo / skool | Self-serve: Mi Marca → Planificar → Crear → Stories → Reto 10K → Calendario |
| **premium** (servicio gestionado) | Creado por admin | Recibe estrategia + guiones del equipo (BRÄVE CONTENT); ve Mi Estrategia, Plan de Contenidos, Métricas, Academia |
| **team** (BRÄVE CONTENT) | /team (workspace interno) | CMs producen estrategia, ideas, guiones y planificación para clientas premium; sincronizan métricas Metricool |
| **admin / superadmin** | /admin | 11 tabs de gestión + Vista Premium + Modo Equipo + Finanzas |

---

## 3. El loop central del producto

```
BRÄVE ME CONOCE          → Mi Marca / onboarding → Business Brain
↓
BRÄVE SABE QUÉ NECESITO  → objetivos, servicios prioritarios, métricas
↓
BRÄVE ME DICE QUÉ HACER  → HOME "hoy", recomendaciones, campañas
↓
BRÄVE ME AYUDA A CREARLO → guiones, copies, stories, carruseles, teleprompter
↓
BRÄVE LO ORGANIZA        → calendario + estados + recordatorios
↓
YO EJECUTO               → publico (o grabo con guía / servicio humano)
↓
BRÄVE APRENDE            → métricas + resultados → mejores recomendaciones
```

**Estado actual del loop:** los eslabones "conoce / ayuda a crear / organiza" existen. Los débiles son "me dice qué hacer" (home es un launcher, no una dirección) y "aprende de los resultados" (métricas solo premium, sync manual, no alimentan recomendaciones).

---

## 4. Mapa de módulos: qué existe, qué falta

Leyenda: ✅ existe · 🟡 parcial · ❌ no existe

| # | Módulo | Estado | Notas de auditoría |
|---|--------|--------|--------------------|
| 1 | HOME / HOY | 🟡 | `/inicio` es un **launcher** de tiles, no una dirección diaria. El Reto 10K ya tiene el concepto de "misión de hoy" — es el patrón a generalizar |
| 2 | MI NEGOCIO / ESTRATEGIA | 🟡 | Mi Marca (33 preguntas → strategy_json 13 secciones + optimized_summary) es el proto-Business Brain. Onboarding solo pregunta salón (2 pasos). Sin voz |
| 3 | AUDITORÍA DIGITAL (IG) | ❌ | No existe. Base disponible: métricas Metricool (premium) + perfil de marca. Falta análisis de bio/feed/highlights |
| 4 | PLANIFICACIÓN | ✅ | `/planificar` semanal/mensual + generador de plan del Reto (30 días, distribución por frecuencia) + planning del modo team |
| 5 | CREAR | ✅ | Reels (GANCHO/CONTEXTO/SOLUCIÓN/CTA), carruseles, stories, ideas (`content_ideas` con pipeline propuesta→confirmada→guion_listo→hecha), pegar guion externo |
| 6 | STORIES | 🟡 | Escritas: ✅ (secuencias 3 + stickers IG). **Habladas + metodología completa (3-4 pasos con CTA explicado): parcial** |
| 7 | TELEPROMPTER | ❌ | No existe. Pieza clave contra el miedo a cámara |
| 8 | CARRUSELES con plantillas | ❌ | Hoy: solo texto IA por slides. No hay plantillas premium bloqueadas ni render de diseño |
| 9 | PLANTILLAS de stories | 🟡 | `StoryMockup` simula una story real (stickers, texto centrado) pero no hay plantillas bloqueadas con sustitución de imágenes |
| 10 | CAMPAÑAS / OBJETIVOS | ❌ | **El módulo diferencial.** Piezas ya construidas que lo alimentan: pipeline `content_ideas` (con anti-repetición), plan por días del Reto, planner del team, Metricool scheduler |
| 11 | CALENDARIO | ✅ | Mensual + drag&drop + list view + modal detalle. Estados: `status` (library/scheduled/draft/done) + `reto_status` (idea/grabado/editado/publicado). El team usa un ContentStatus de 11 estados — unificar |
| 12 | PUBLICACIÓN SOCIAL | 🟡 | **Metricool scheduler YA funciona** (Instagram REEL/POST) server-side en modo team. No hay integración directa IG/FB/TikTok (requiere verificación de APIs oficiales y permisos) |
| 13 | MÉTRICAS | 🟡 | Funcional vía Metricool (followers/reach/impressions/engagement por mes y red) — solo premium, sync manual, no alimenta recomendaciones |
| 14 | ACADEMIA | ✅ | LMS completo (módulos, lecciones Loom, progreso). Falta gate de rol y contar progreso en analytics. Principio pendiente: aprendizaje mínimo + acción inmediata |
| 15 | COMUNIDAD | ❌ | Skool es externo. No recomendar clonarlo (complejidad alta) — ver ROADMAP |
| 16 | RETOS / CONSTANCIA | ✅ | Reto 10K completo: onboarding (objetivo, servicios, nivel, frecuencia), plan 30 días, misiones, XP, fases, config editable en admin |
| 17 | BEAUTY AI | ❌ | Experimental. Generación/edición de imagen vía APIs externas; preservar identidad y realismo |
| 18 | GOOGLE BUSINESS | ❌ | Explorar después de IG |
| 19 | RESEÑAS | ❌ | Campañas de solicitud, respuestas, testimonios como contenido |
| 20 | WHATSAPP | ❌ | Como canal dentro de campañas (mensaje listo para copiar). NO un CRM |
| 21 | SERVICIO HUMANO / UPSELL | 🟡 | Existe implícito: premium gestionado + BRÄVE CONTENT. Falta el producto: "editar tú con nuestra guía" vs "lo edita nuestro equipo" |

---

## 5. Metodologías propietarias (activo diferencial)

**Guiones BRÄVE:** GANCHO → CONTEXTO → SOLUCIÓN → CTA.
- CTAs conversacionales (no keywords tipo "comenta ABAJO").
- 2 tipos: autoridad (35-45s, educativo) / viral (15-30s, punchy).

**Stories BRÄVE:** secuencias de 3-4 stories: identificación/problema/interacción → desarrollo → solución/autoridad → CTA explicado. Stickers de interacción con respuestas prefijadas.

**6 pilares de contenido:** autoridad, viralidad, educación, deseo, dolor, objeción (balance automático en el plan del Reto).

**XP/gamificación:** publishReel 10 · saveIdea 5 · completeMission 3; niveles en `profiles.level/xp_total`.

---

## 6. Principios de producto (no negociables)

1. **Una dirección, no un menú.** Siempre hay una "siguiente acción" recomendada.
2. **Libertad dentro de la dirección (BRÄVE recomienda, nunca encierra).** Dos modos: GUIADO ("no sé qué hacer" → Home usa el Brain, prioridad y estado para recomendar la mejor siguiente acción) y LIBRE ("sé lo que quiero crear" → Crear con las herramientas a la vista). HOME = DIRECCIÓN, CREAR = LIBERTAD. La recomendación de Home jamás bloquea el resto de herramientas (acceso secundario "+ Crear otra cosa" sin competir con la acción principal + acceso global claro a Crear). Futuro: botón global "+ Crear" con "No sé qué crear → Recomiéndame algo" (vía Business Brain) y herramientas de Crear agrupadas (Para tus redes / Inspiración / Recursos / IA).
3. **El Business Brain alimenta todo.** Ningún generador ni recomendación sin contexto de marca.
4. **Plantillas bloqueadas para diseño visual.** La IA genera/adapta contenido; la plantilla controla tipografía, márgenes, jerarquía. El output nunca debe parecer "generado por IA".
5. **Campaña = plan ejecutable por días** con acciones (CREAR/GRABAR/PROGRAMAR/COMPLETAR), revisable antes de enviar al calendario.
6. **Destructiva cero.** Borrar/limpiar siempre con confirmación y recuperación cuando sea posible.
7. **Preservar identidad** en Beauty AI (realismo > efecto).
8. **El premium no compite con el self-serve:** premium = servicio gestionado (equipo); self-serve = autonomía con dirección.

---

## 7. Pendientes de producto detectados en auditoría

- **Onboarding mínimo:** solo pregunta salón. La recogida progresiva (ciudad, rol, servicios) vive dispersa en Mi Marca — consolidar en el Business Brain progresivo.
- **Home sin dirección:** no hay "qué hacer hoy" unificado (tareas + contenido pendiente + campaña activa + recomendación).
- **Premium self-inconsistencia:** `update-role` no admite `premium` (solo `create-user` lo asigna) — no se puede promover/degradar premium sin SQL.
- **Rutas premium sin gate real:** cualquier user con acceso activo puede abrirlas por URL (gating solo UI).
- **Academia visible solo premium pero contenida genérica.**
- **Tracking incompleto:** métricas/academia/account no actualizan `last_visited_section`; analytics deriva uso de datos, no de visitas reales.
- **Retorno de la clienta:** no hay razón estructurada para abrir BRÄVE a diario fuera del Reto 10K.