# Build Plan - TrackUG

## Milestones
- **M0: Foundation**
    - [ ] Create monorepo structure: `mkdir -p apps services packages infra db docs tests`
        - *Proof:* `ls -R trackug/`
    - [ ] Initialize `pnpm` workspace: `pnpm init`
    - [ ] Setup CI skeleton (`.github/workflows/ci.yml`): `pnpm verify` runs
    - [ ] Setup Docker Compose with DB, Redis, MinIO: `docker compose up --build`
    - [ ] Implement Migration 0001 (Schema Init): `pnpm db:migrate`
    - [ ] Setup Health/Ready endpoints: `curl http://localhost:8080/health`
    - [ ] Create design tokens and Storybook setup
- **M1: Auth and Users**
- **M2: Data Path**
- **M3: Core API**
- **M4: Dashboard**
- **M5: ANPR Edge**
- **M6: Hardening**

*Detailed task breakdowns for M1-M6 will be populated upon M0 completion.*

## Risks
- Scope creep, hardware delivery delays, ANPR accuracy on real-world plates.

## Needs from User
- Hosting provider/region, SMS provider, map tile provider, project deadline.
