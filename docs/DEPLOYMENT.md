# Deployment - TrackUG

## Architecture (Vercel)
- **Frontend:** Vercel (Edge).
- **API:** Vercel Serverless Functions.
- **Database:** Managed PostgreSQL (e.g., Neon).
- **Ingestion (TCP):** A small, dedicated VPS or dedicated ingestion container in a cloud environment (Vercel does not support long-lived TCP connections).

## Pipeline
- GitHub Actions -> Vercel Deployment.
- Database migrations run during build/deploy.
