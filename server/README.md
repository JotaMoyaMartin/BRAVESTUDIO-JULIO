# BRÄVE Studio — Server (Backend API)

Standalone **Express + TypeScript** REST API. Independent of the Next.js client;
deploy it as its own Vercel project.

## Structure

```
server/
├── api/
│   └── index.ts            # Vercel serverless entry (wraps the Express app)
├── src/
│   ├── config/env.ts       # validated environment config
│   ├── lib/supabase.ts     # Supabase admin + per-user clients
│   ├── middleware/
│   │   ├── auth.ts         # verifies Supabase bearer token
│   │   └── errorHandler.ts # 404 + centralized error handling
│   ├── controllers/        # request handlers (business logic)
│   ├── routes/             # route definitions, mounted under /api
│   ├── app.ts              # builds the Express app (no listen)
│   └── index.ts            # local dev entry (app.listen)
├── supabase-schema.sql     # database schema
├── vercel.json
└── tsconfig.json
```

## Develop

```bash
npm install
cp .env.example .env        # then fill in real values
npm run dev                 # http://localhost:4000
```

## Endpoints

| Method | Path                | Description                        |
| ------ | ------------------- | ---------------------------------- |
| GET    | `/`                 | service banner                     |
| GET    | `/api/health`       | liveness probe                     |
| GET    | `/api/health/ready` | readiness probe (checks Supabase)  |

Protected routes use `requireAuth` (expects `Authorization: Bearer <supabase-access-token>`).

## Add a feature module

1. Create `src/controllers/<name>.controller.ts`
2. Create `src/routes/<name>.route.ts`
3. Mount it in `src/routes/index.ts`: `router.use('/<name>', <name>Route)`

## Deploy (Vercel)

Create a Vercel project with **Root Directory = `server`**. Framework preset:
**Other**. Add the env vars from `.env.example`. `vercel.json` routes every
request to the Express app via `api/index.ts`.
