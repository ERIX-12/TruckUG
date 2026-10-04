# ADR 001: Hosting on Vercel

## Status
Approved

## Context
We need a hosting provider for the TrackUG platform. The system requires a web dashboard (React/Vite) and backend services (Node.js).

## Decision
We will use **Vercel** for hosting the web frontend and serverless functions (for the API).

## Consequences
- **Pros:** Excellent developer experience, fast deployment, built-in edge caching for the frontend, scalable serverless infrastructure.
- **Cons:** Database needs (PostgreSQL/PostGIS) will require a managed service outside of Vercel (e.g., Neon or Supabase) as Vercel does not host relational databases. Need to ensure stateful ingestion (TCP) can be handled, likely needing a separate small VPS or specialized ingestion gateway service.
