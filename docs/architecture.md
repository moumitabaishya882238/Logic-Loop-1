# SurakshaNet Architecture

## Structure

- apps/citizen-app: React Native CLI mobile client
- apps/government-web: Next.js government dashboard
- services/api-server: Node.js + Express incident backend
- services/ai-cctv-service: FastAPI-based CCTV AI detection service
- shared/incident-schema: Shared incident contract schema
- shared/api-types: Shared API request/response types

## Incident Flow

1. Citizen app sends SOS/report to api-server.
2. AI CCTV service sends detection alerts to api-server.
3. API server stores incidents and exposes dashboard APIs.
4. Government web reads incidents and response states.
