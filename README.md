# BRÄVE Studio — Monorepo

Two independently deployable applications. On Vercel, create **two projects** from
this same repo and set the **Root Directory** accordingly:

| Vercel project | Root Directory | What deploys | Framework preset |
| -------------- | -------------- | ------------ | ---------------- |
| Frontend       | `client`       | Next.js 14 app (UI + its own server actions / API routes) | Next.js |
| Backend API    | `server`       | Standalone Express + TypeScript API | Other |

```
brave-studio/
├── client/   → Next.js 14 fullstack app (frontend)
└── server/   → Express + TypeScript REST API (backend)
```

## Local development

```bash
# Frontend
cd client && npm install && npm run dev      # http://localhost:3000

# Backend
cd server && npm install && npm run dev      # http://localhost:4000
```

## Environment variables

Each app has its own env file (gitignored). See:
- `client/.env.local`        (copy of `client/.env.example`)
- `server/.env`              (copy of `server/.env.example`)

Both apps talk to the **same Supabase project** (`dekcpstpjqqqagjaqxot`).
