const {
  INCIDENT_TYPES,
  INCIDENT_SEVERITIES,
} = require("../constants/incident");
const { normalizeLocation } = require("../models/incidentModel");

const incidentTypes = new Set(Object.values(INCIDENT_TYPES));
const severities = new Set(Object.values(INCIDENT_SEVERITIES));

function validateCreatePayload(body) {
  if (!body || typeof body !== "object") {
    return "Invalid request body";
  }

  const type = String(body.type || "").toUpperCase();
  if (!incidentTypes.has(type)) {
    return "type must be SOS, CCTV or DISASTER";
  }

  const severity = String(body.severity || INCIDENT_SEVERITIES.MEDIUM).toUpperCase();
  if (!severities.has(severity)) {
    return "severity must be LOW, MEDIUM, HIGH or CRITICAL";
  }

  const location = normalizeLocation(body.location);
  if (Number.isNaN(location.lat) || Number.isNaN(location.lng)) {
    return "location.lat and location.lng are required numbers";
  }

  if (!body.description || typeof body.description !== "string") {
    return "description is required";
  }

  return null;
}

function validateRespondPayload(body) {
  const { responderId, responderName } = body || {};
  if (!responderId || !responderName) {
    return "responderId and responderName are required";
  }

  return null;
}

module.exports = {
  validateCreatePayload,
  validateRespondPayload,
};
