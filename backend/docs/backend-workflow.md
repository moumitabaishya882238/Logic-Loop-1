# Backend Structure And Workflow

## Folder Structure

- `server.js`: bootstrap entrypoint
- `src/app.js`: express app setup and startup lifecycle
- `src/config/env.js`: environment variable parsing
- `src/config/db.js`: MongoDB connection and collection access
- `src/constants/incident.js`: enums for type/status/severity
- `src/models/incidentModel.js`: incident document shape and location normalization
- `src/validators/incidentValidator.js`: request payload validation
- `src/controllers/incidentController.js`: business logic for incidents
- `src/routes/incidentRoutes.js`: API route definitions
- `src/middleware/asyncHandler.js`: async route wrapper
- `src/middleware/errorHandler.js`: not found and error responses

## Request Flow

1. Route receives request in `src/routes/incidentRoutes.js`.
2. Route calls controller wrapped by `asyncHandler`.
3. Controller validates input via `src/validators/incidentValidator.js`.
4. Controller creates/updates incident docs via `src/models/incidentModel.js` and `src/config/db.js`.
5. Errors flow into `src/middleware/errorHandler.js`.

## Run Commands

- Dev server: `npm run dev`
- Start server: `npm run start`

## Conventions

- Keep route handlers thin.
- Keep business rules in controllers.
- Keep document shape logic in models.
- Add new domains by replicating this module pattern.
