# BRÄVE Studio — Client (Frontend)

Next.js 14 (App Router) application. This is the user-facing app.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Environment

Copy `.env.example` → `.env.local` and fill in the values.

## Deploy (Vercel)

Create a Vercel project from the repo with **Root Directory = `client`**.
Framework preset: **Next.js**. Add the env vars from `.env.example` in the
Vercel dashboard.
