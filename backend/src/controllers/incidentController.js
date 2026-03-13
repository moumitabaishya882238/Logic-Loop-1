const { getIncidentsCollection } = require("../config/db");
const {
  INCIDENT_TYPES,
  INCIDENT_STATUSES,
  INCIDENT_SEVERITIES,
} = require("../constants/incident");
const { createIncidentDoc } = require("../models/incidentModel");
const {
  validateCreatePayload,
  validateRespondPayload,
} = require("../validators/incidentValidator");

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

async function root(_req, res) {
  res.json({ message: "SurakshaNet API Server", status: "active" });
}

async function createSosIncident(req, res) {
  const payload = { ...req.body, type: INCIDENT_TYPES.SOS };
  const error = validateCreatePayload(payload);
  if (error) throw badRequest(error);

  const incidents = getIncidentsCollection();
  const incident = createIncidentDoc(payload, INCIDENT_TYPES.SOS);
  await incidents.insertOne({ ...incident });

  res.status(200).json(incident);
}

async function createCctvIncident(req, res) {
  const payload = {
    ...req.body,
    type: INCIDENT_TYPES.CCTV,
    reportedBy: req.body.reportedBy || "AI_CCTV_SYSTEM",
  };

  const error = validateCreatePayload(payload);
  if (error) throw badRequest(error);

  const incidents = getIncidentsCollection();
  const incident = createIncidentDoc(payload, INCIDENT_TYPES.CCTV);
  await incidents.insertOne({ ...incident });

  res.status(200).json(incident);
}

async function createDisasterIncident(req, res) {
  const payload = {
    ...req.body,
    type: INCIDENT_TYPES.DISASTER,
    reportedBy: req.body.reportedBy || "DISASTER_MONITORING_SYSTEM",
  };

  const error = validateCreatePayload(payload);
  if (error) throw badRequest(error);

  const incidents = getIncidentsCollection();
  const incident = createIncidentDoc(payload, INCIDENT_TYPES.DISASTER);
  await incidents.insertOne({ ...incident });

  res.status(200).json(incident);
}

async function getIncidents(req, res) {
  const query = {};

  if (req.query.type) {
    query.type = String(req.query.type).toUpperCase();
  }

  if (req.query.status) {
    query.status = String(req.query.status).toUpperCase();
  }

  const limit = Number(req.query.limit || 100);
  const incidents = getIncidentsCollection();

  const data = await incidents
    .find(query, { projection: { _id: 0 } })
    .sort({ timestamp: -1 })
    .limit(Number.isFinite(limit) ? limit : 100)
    .toArray();

  res.json(data);
}

async function getIncidentById(req, res) {
  const incidents = getIncidentsCollection();

  const incident = await incidents.findOne(
    { id: req.params.incidentId },
    { projection: { _id: 0 } }
  );

  if (!incident) throw notFound("Incident not found");

  res.json(incident);
}

async function respondToIncident(req, res) {
  const error = validateRespondPayload(req.body);
  if (error) throw badRequest(error);

  const incidents = getIncidentsCollection();
  const { responderId, responderName } = req.body;

  const updateResult = await incidents.updateOne(
    { id: req.params.incidentId },
    {
      $set: {
        status: INCIDENT_STATUSES.ACCEPTED,
        responderId,
        responderName,
        responseTime: new Date().toISOString(),
      },
    }
  );

  if (!updateResult.matchedCount) throw notFound("Incident not found");

  const incident = await incidents.findOne(
    { id: req.params.incidentId },
    { projection: { _id: 0 } }
  );

  res.json(incident);
}

async function resolveIncident(req, res) {
  const incidents = getIncidentsCollection();

  const updateResult = await incidents.updateOne(
    { id: req.params.incidentId },
    { $set: { status: INCIDENT_STATUSES.RESOLVED } }
  );

  if (!updateResult.matchedCount) throw notFound("Incident not found");

  const incident = await incidents.findOne(
    { id: req.params.incidentId },
    { projection: { _id: 0 } }
  );

  res.json(incident);
}

async function getIncidentStats(_req, res) {
  const incidents = getIncidentsCollection();
  const all = await incidents.find({}, { projection: { _id: 0 } }).toArray();

  const total = all.length;
  const active = all.filter(
    (incident) =>
      incident.status === INCIDENT_STATUSES.PENDING ||
      incident.status === INCIDENT_STATUSES.ACCEPTED
  ).length;
  const resolved = all.filter(
    (incident) => incident.status === INCIDENT_STATUSES.RESOLVED
  ).length;

  const byType = {
    [INCIDENT_TYPES.SOS]: 0,
    [INCIDENT_TYPES.CCTV]: 0,
    [INCIDENT_TYPES.DISASTER]: 0,
  };

  const bySeverity = {
    [INCIDENT_SEVERITIES.LOW]: 0,
    [INCIDENT_SEVERITIES.MEDIUM]: 0,
    [INCIDENT_SEVERITIES.HIGH]: 0,
    [INCIDENT_SEVERITIES.CRITICAL]: 0,
  };

  all.forEach((incident) => {
    if (byType[incident.type] !== undefined) byType[incident.type] += 1;
    if (bySeverity[incident.severity] !== undefined) bySeverity[incident.severity] += 1;
  });

  res.json({ total, active, resolved, byType, bySeverity });
}

module.exports = {
  root,
  createSosIncident,
  createCctvIncident,
  createDisasterIncident,
  getIncidents,
  getIncidentById,
  respondToIncident,
  resolveIncident,
  getIncidentStats,
};
