# Configuración Canva Developer Portal (BRÄVE)

Pasos exactos para activar la integración — sin inventar valores: los
secrets los genera el portal y solo se pegan en Vercel/env del servidor.

## 1. Crear la app (Outside Canva — NO app embebida)

1. Entra en https://www.canva.com/developers/apps
2. **Create app** → nombre `BRÄVE Studio` (o el que prefieras).
3. El tipo NO es "App SDK embebida": elige la sección **"Outside Canva"**
   → clic **Start integrating** (crea el OAuth client).
4. Con tu cuenta Canva (la del equipo BRÄVE) con plan **Pro o Teams**
   (el autofill necesita Pro/Teams/Enterprise; Free solo da trial con cuota).

## 2. Configuration — habilitar

- Toggle de integración: **Canva REST APIs** activado.
- Scopes a habilitar (mínimo privilegio):
  - `design:meta:read`
  - `design:content:read`
  - `design:content:write`
  - `asset:read`
  - `asset:write`
  - `profile:read`
- NO activar: comments, folders, analytics, brandtemplate (aún), email/openid.

## 3. Redirect URLs (Outside Canva)

Registra EXACTAMENTE estas dos:

```
http://127.0.0.1:3000/api/canva/oauth/callback   (dev local)
https://bravestudio.app/api/canva/oauth/callback  (producción)
```

Por haber 2 URLs registradas, el OAuth SiEMPRE envía `redirect_uri` explícito
(lo hace el código a través de `CANVA_REDIRECT_URI`).

## 4. Credentials

- Copia el **Client ID**.
- **Generate secret** (empieza por `cnvca`): se muestra UNA vez — cópialo
  ahí y pégalo directo en Vercel/local, no en el chat ni en el repo.

## 5. Variables de entorno (server, NUNCA NEXT_PUBLIC_)

| Variable | Valor conceptual | Dónde la sacas |
|---|---|---|
| `CANVA_CLIENT_ID` | Client ID de la app | Portal → Credentials |
| `CANVA_CLIENT_SECRET` | Client Secret (prefijo `cnvca`) | Portal → Generate secret |
| `CANVA_REDIRECT_URI` | `http://127.0.0.1:3000/api/canva/oauth/callback` en dev; `https://bravestudio.app/api/canva/oauth/callback` en Vercel | La que registres en el paso 3 |
| `SOCIAL_TOKEN_SECRET` | (ya existe para tokens sociales) — la clave de cifrado AES de `lib/crypto.ts`; Canva la REUTILIZA | Ya en Vercel si Instagram conecta |

## 6. Primer arranque (checklist)

1. SQL pegado: `SQL-CANVA-SPIKE.sql` en Supabase (3 tablas + bucket).
2. Envs configurados en dev (`client/.env.local`) y/o Vercel.
3. `npm run dev` → entra como admin → `/admin/canva-test`.
4. Debe decir "Canva — Desconectado · Conectar Canva" → clic → consentimiento
   de Canva → vuelta con "connected".
5. Pega un Design ID con Data Autofill → Importar → Generar prueba.

## 7. Qué NO hacer

- No marcar la app como "Public" ni meterla a review para el spike.
- No pedir scopes extra (comments/folders/brandtemplate) sin necesidad.
- No pegar el secret en tickets/chat/código.
- No activar "Return navigation" ni Connect SDK aún.