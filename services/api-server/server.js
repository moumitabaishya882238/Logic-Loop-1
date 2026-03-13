/**
 * SurakshaNet — Central Backend Server
 * server.js
 *
 * Node.js / Express server that:
 *  1. Receives CCTV_ALERT payloads from the Python AI service
 *  2. Persists incidents to an in-memory store (swap for MongoDB/PostgreSQL)
 *  3. Broadcasts real-time alerts to connected dashboards via Socket.IO
 *  4. Exposes a REST API for the frontend to query incident history
 *
 * Start: node server.js  (or: npm start)
 */

"use strict";

const express      = require("express");
const http         = require("http");
const { Server }   = require("socket.io");
const cors         = require("cors");
const morgan       = require("morgan");
const { v4: uuid } = require("uuid");

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────
const PORT          = process.env.PORT          || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const MAX_INCIDENTS = parseInt(process.env.MAX_INCIDENTS || "500", 10); // rolling window

// ─────────────────────────────────────────────────────────────────
// In-memory incident store  (replace with DB in production)
// ─────────────────────────────────────────────────────────────────
/**
 * @type {Array<{
 *   id: string,
 *   type: string,
 *   subtype: string,
 *   camera_id: string,
 *   location: { lat: number, lng: number },
 *   timestamp: string,
 *   received_at: string,
 *   metadata: object,
 *   acknowledged: boolean
 * }>}
 */
const incidents = [];

/** Per-camera last-seen registry */
const cameraRegistry = new Map();

// ─────────────────────────────────────────────────────────────────
// App bootstrap
// ─────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: "*",   // Tighten in production
    methods: ["GET", "POST"],
  },
});

// ─────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("[:date[clf]] :method :url :status :response-time ms"));

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Store an incident and enforce rolling window.
 * @param {object} incident
 */
function storeIncident(incident) {
  incidents.unshift(incident);           // newest first
  if (incidents.length > MAX_INCIDENTS) {
    incidents.splice(MAX_INCIDENTS);     // trim oldest
  }
}

/**
 * Validate an incoming CCTV alert payload.
 * Returns { valid: true } or { valid: false, errors: string[] }
 */
function validateAlertPayload(body) {
  const errors = [];
  if (!body.type)      errors.push("'type' is required");
  if (!body.subtype)   errors.push("'subtype' is required");
  if (!body.camera_id) errors.push("'camera_id' is required");
  if (!body.timestamp) errors.push("'timestamp' is required");
  if (!body.location || typeof body.location.lat !== "number" ||
      typeof body.location.lng !== "number") {
    errors.push("'location' must have numeric lat and lng");
  }
  return errors.length === 0
    ? { valid: true }
    : { valid: false, errors };
}

/**
 * Classify severity based on subtype and optional metadata.
 */
function classifySeverity(subtype, metadata = {}) {
  const HIGH   = ["fight", "weapon", "fire"];
  const MEDIUM = ["crowd", "suspicious", "loitering"];
  if (HIGH.includes(subtype))   return "HIGH";
  if (MEDIUM.includes(subtype)) return "MEDIUM";
  return "LOW";
}

// ─────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────

/* ── Health check ─────────────────────────────────────────────── */
app.get("/health", (_req, res) => {
  res.json({
    status:      "ok",
    uptime_s:    Math.floor(process.uptime()),
    incidents:   incidents.length,
    cameras:     cameraRegistry.size,
    timestamp:   new Date().toISOString(),
  });
});

/* ── POST /api/cctv-alert ─────────────────────────────────────── */
/**
 * Primary ingest endpoint — called by the Python AI service.
 *
 * Body:
 *   { type, subtype, camera_id, location: { lat, lng },
 *     timestamp, metadata? }
 */
app.post("/api/cctv-alert", (req, res) => {
  const { valid, errors } = validateAlertPayload(req.body);

  if (!valid) {
    console.warn("[ALERT] Rejected malformed payload:", errors);
    return res.status(400).json({ error: "Invalid payload", details: errors });
  }

  const {
    type,
    subtype,
    camera_id,
    location,
    timestamp,
    metadata = {},
  } = req.body;

  const incident = {
    id:            uuid(),
    type,
    subtype,
    camera_id,
    location,
    timestamp,
    received_at:   new Date().toISOString(),
    metadata,
    severity:      classifySeverity(subtype, metadata),
    acknowledged:  false,
  };

  storeIncident(incident);

  // Update camera registry
  cameraRegistry.set(camera_id, {
    camera_id,
    location,
    last_seen:      incident.received_at,
    last_subtype:   subtype,
  });

  // Broadcast to all connected dashboard clients
  io.emit("new_incident", incident);
  io.emit("camera_update", Object.fromEntries(cameraRegistry));

  console.log(
    `[ALERT] 🚨 ${severity_icon(incident.severity)} ${subtype.toUpperCase()} ` +
    `| cam=${camera_id} | sev=${incident.severity} | id=${incident.id}`
  );

  return res.status(201).json({ received: true, id: incident.id });
});

/* ── GET /api/incidents ───────────────────────────────────────── */
/**
 * Returns paginated incident history.
 * Query params: page (default 1), limit (default 20), subtype, camera_id, severity
 */
app.get("/api/incidents", (req, res) => {
  const page      = Math.max(1, parseInt(req.query.page  || "1",  10));
  const limit     = Math.min(100, parseInt(req.query.limit || "20", 10));
  const subtype   = req.query.subtype   || null;
  const camera_id = req.query.camera_id || null;
  const severity  = req.query.severity  || null;

  let filtered = incidents;
  if (subtype)   filtered = filtered.filter(i => i.subtype   === subtype);
  if (camera_id) filtered = filtered.filter(i => i.camera_id === camera_id);
  if (severity)  filtered = filtered.filter(i => i.severity  === severity);

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data  = filtered.slice(start, start + limit);

  res.json({
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    data,
  });
});

/* ── GET /api/incidents/:id ───────────────────────────────────── */
app.get("/api/incidents/:id", (req, res) => {
  const incident = incidents.find(i => i.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: "Incident not found" });
  }
  res.json(incident);
});

/* ── PATCH /api/incidents/:id/acknowledge ────────────────────── */
app.patch("/api/incidents/:id/acknowledge", (req, res) => {
  const incident = incidents.find(i => i.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: "Incident not found" });
  }
  incident.acknowledged    = true;
  incident.acknowledged_at = new Date().toISOString();

  io.emit("incident_acknowledged", { id: incident.id });
  console.log(`[ACK] Incident ${incident.id} acknowledged`);
  res.json({ acknowledged: true, id: incident.id });
});

/* ── GET /api/cameras ─────────────────────────────────────────── */
/**
 * Returns all cameras that have ever sent an alert, with last-seen info.
 */
app.get("/api/cameras", (_req, res) => {
  res.json({
    total: cameraRegistry.size,
    cameras: Array.from(cameraRegistry.values()),
  });
});

/* ── GET /api/stats ───────────────────────────────────────────── */
/**
 * Summary statistics for the dashboard.
 */
app.get("/api/stats", (_req, res) => {
  const bySubtype  = {};
  const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const byCamera   = {};

  for (const inc of incidents) {
    bySubtype[inc.subtype]    = (bySubtype[inc.subtype]    || 0) + 1;
    bySeverity[inc.severity]  = (bySeverity[inc.severity]  || 0) + 1;
    byCamera[inc.camera_id]   = (byCamera[inc.camera_id]   || 0) + 1;
  }

  const unacknowledged = incidents.filter(i => !i.acknowledged).length;

  res.json({
    total_incidents:   incidents.length,
    unacknowledged,
    by_subtype:        bySubtype,
    by_severity:       bySeverity,
    by_camera:         byCamera,
    active_cameras:    cameraRegistry.size,
  });
});

/* ── DELETE /api/incidents (dev/testing only) ─────────────────── */
if (process.env.NODE_ENV !== "production") {
  app.delete("/api/incidents", (_req, res) => {
    incidents.splice(0, incidents.length);
    console.warn("[DEV] Incident store cleared");
    res.json({ cleared: true });
  });
}

// ─────────────────────────────────────────────────────────────────
// Socket.IO — real-time dashboard channel
// ─────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Send current state on connect
  socket.emit("init", {
    incidents: incidents.slice(0, 50),          // last 50
    cameras:   Object.fromEntries(cameraRegistry),
  });

  socket.on("acknowledge", (id) => {
    const incident = incidents.find(i => i.id === id);
    if (incident) {
      incident.acknowledged    = true;
      incident.acknowledged_at = new Date().toISOString();
      io.emit("incident_acknowledged", { id });
      console.log(`[WS] Incident ${id} acknowledged via socket`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ─────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────
function severity_icon(sev) {
  return { HIGH: "🔴", MEDIUM: "🟠", LOW: "🟡" }[sev] || "⚪";
}

// ─────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║       SurakshaNet Backend Server              ║");
  console.log(`║  Listening on http://0.0.0.0:${PORT}             ║`);
  console.log("║  POST /api/cctv-alert  ← AI service           ║");
  console.log("║  GET  /api/incidents   ← Dashboard            ║");
  console.log("║  WS   /               ← Socket.IO             ║");
  console.log("╚═══════════════════════════════════════════════╝");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[SERVER] SIGTERM received — shutting down gracefully");
  server.close(() => process.exit(0));
});

module.exports = { app, server, io };   // export for testing