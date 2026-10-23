# Instagram en BRÄVE — conexión, análisis y publicar

## Estado (23-oct-2026)

- **Conexión + Análisis de perfil**: hecho y probado con @bravecontent.hair (100 publicaciones, 30 días
  de métricas, informe con IA). **OCULTO** por decisión de Jota hasta que Meta apruebe la app.
- Interruptor: `NEXT_PUBLIC_SHOW_INSTAGRAM=1` en Vercel (Production) + volver a publicar → aparece
  Análisis en el menú, la tarjeta «Tu Instagram» en Inicio y Mi Marca, y el paso «Conecta Instagram y mide».
  Apagado, `/analisis` sigue funcionando por URL directa (para pruebas de Jota).
- App de Meta: **bravestudio-insights** (Instagram App ID 1670747061322903), en modo **desarrollo**.
  Solo pueden conectar las cuentas añadidas como «Evaluador de Instagram» (y que acepten la invitación en
  instagram.com/accounts/manage_access › Invitaciones para evaluadores). Las demás ven
  «Rol de desarrollador insuficiente».
- Direcciones de vuelta registradas: `https://bravestudio.app/api/social/oauth/callback` y la de prueba
  `https://brave-prueba-instagram.vercel.app/api/social/oauth/callback`.

## Lo que falta para que cualquier estilista pueda conectar (App Review de lectura)

1. **Verificación de empresa** de BRÄVE Content Hair en Meta Business Suite (si no está hecha).
2. En la app › Casos de uso › API de Instagram › **Permisos y funciones**: pedir **Advanced Access** para
   `instagram_business_basic` e `instagram_business_manage_insights`.
3. Para cada permiso: explicación de uso (la estilista conecta su cuenta profesional; BRÄVE lee perfil,
   publicaciones y estadísticas para darle un informe con mejoras; solo lectura; puede desconectar y se
   borran sus datos) + **vídeo** (Conectar → pantalla de permisos de Instagram → vuelta a BRÄVE → informe).
4. Política de privacidad pública y **URL de eliminación de datos** / desautorización en «Configuración de
   inicio de sesión de empresa» (hoy vacías) → crear rutas que borren los datos (ya existe la lógica en
   `DELETE /api/social/connection`).
5. Cuando lo aprueben: app en modo **Publicada** + encender el interruptor.

---

# Publicar en Instagram desde BRÄVE — plan (22-oct-2026)

**Estado:** el código está preparado y **apagado**. No se puede publicar nada hasta que
Meta apruebe el permiso y se active `INSTAGRAM_PUBLISH_ENABLED=1` en Vercel.

## En sencillo

1. Hoy BRÄVE solo **lee** el Instagram de la estilista (perfil, publicaciones, números).
2. Para **publicar** hace falta un permiso extra de Meta: `instagram_business_content_publish`.
3. Meta solo lo da tras revisar la app (**App Review**): hay que enseñarles un vídeo de la app
   publicando y explicar para qué se usa.
4. Cuando lo aprueben: activamos el interruptor, las estilistas reconectan Instagram (una vez)
   aceptando el permiso nuevo, y ya pueden publicar desde Mi plan / Carruseles / Stories.

## Qué se puede publicar (API oficial con Instagram Login)

| Formato | Cómo | Requisitos |
|---|---|---|
| Foto | 1 imagen | JPEG en URL pública (https) |
| Carrusel | 2–10 imágenes (Meta admite hasta 20) | JPEG; todas se recortan a la proporción de la primera |
| Reel | 1 vídeo MP4 + portada opcional | URL pública; Meta lo procesa (hasta ~5 min) |
| Story | 1 imagen o 1 vídeo | Sin stickers interactivos (encuestas, enlaces…) por API |

Límite de Meta: **100 publicaciones por cuenta cada 24 h** (carrusel = 1). La app lo consulta
antes de publicar (`content_publishing_limit`).

No se puede por API: etiquetas de producto, filtros, música de la biblioteca de Instagram,
stickers de stories, ni programar dentro de Instagram (la programación la hará BRÄVE con un cron).

## Qué hay ya en el código

- `client/lib/social/instagram.ts` → `requestedScopes()`: el permiso de publicar **solo** se
  pide al conectar si `INSTAGRAM_PUBLISH_ENABLED=1`. Se guardan los permisos que la usuaria
  concede de verdad.
- `client/lib/social/publish.ts` → `buildPublishPlan()` (valida y traduce foto/carrusel/reel/story
  a llamadas de la API, con errores en español) y `publishToInstagram()` (crea contenedores,
  espera a que estén listos, publica). Probado con tests (`tests/social-profile-analysis.test.ts`),
  **nunca** contra una cuenta real.
- `client/app/api/social/publish/route.ts` → `GET` dice si se puede publicar; `POST` publica y
  exige: interruptor activo + permiso concedido + `confirm: true` + límite de 10/día por usuaria.
  Hoy responde siempre `403 publish_not_enabled`.

## Lo que falta para encenderlo

1. **Subir las piezas a una URL pública en JPEG.** Los carruseles y stories se exportan hoy en
   PNG: hay que convertirlos a JPEG y subirlos a Supabase Storage (bucket público o URL firmada
   de ~1 h). Los reels: subir el MP4 (Instagram recomienda H.264, 9:16, hasta 15 min, < 300 MB).
2. **Botón «Publicar en Instagram»** en Mi plan (pieza «Preparado») con vista previa, texto
   editable y confirmación clara («Se publicará ahora en @cuenta»). Al publicar → estado
   «Publicado» automático en Mi plan.
3. (Opcional) **Programar**: cron que publique a la hora elegida.
4. **App Review de Meta** (abajo).

## App Review — qué pide Meta

En developers.facebook.com › tu app › *App Review* › *Permissions and features*:

1. Pedir **Advanced Access** para `instagram_business_content_publish`
   (y confirmar que `instagram_business_basic` y `instagram_business_manage_insights` ya lo tienen).
2. **Business Verification** de la empresa (documento de BRÄVE / Jota) si no está hecha.
3. Para cada permiso: explicación de uso, por ejemplo:
   > «Las estilistas diseñan carruseles, stories y reels en BRÄVE Studio y los publican en su
   > propia cuenta profesional de Instagram. Solo se publica cuando la usuaria pulsa
   > "Publicar" y confirma en una vista previa.»
4. **Vídeo screencast** (inglés o subtítulos) mostrando: login con Instagram → pantalla de
   permisos → crear un carrusel → vista previa → confirmar → la publicación aparece en Instagram.
   Meta lo revisa con una cuenta de prueba, así que hay que dejar el flujo activo **solo para
   cuentas de prueba** (rol *Instagram Tester* en la app) mientras dura la revisión.
5. Política de privacidad y URL de borrado de datos publicadas (ya hay desconexión que borra
   todos los datos: `DELETE /api/social/connection`).
6. Plazo habitual: de unos días a 2–3 semanas; si lo rechazan, dicen el motivo y se reenvía.

## Cómo probarlo sin riesgo (antes de producción)

1. En la app de Meta, añadir la cuenta de pruebas de Jota como *Instagram Tester* (en modo
   desarrollo los permisos funcionan sin App Review para testers).
2. En un entorno de **preview** de Vercel (no producción): `INSTAGRAM_PUBLISH_ENABLED=1`.
3. Reconectar con la cuenta de prueba y publicar **una** foto de prueba. Comprobar en Instagram.
4. **Nunca** publicar en la cuenta real de una estilista sin su permiso explícito.
