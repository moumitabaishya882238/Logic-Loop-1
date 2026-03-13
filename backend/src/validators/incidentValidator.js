const {
  INCIDENT_TYPES,
  INCIDENT_SEVERITIES,
} = require("../constants/incident");
const { normalizeLocation } = require("../models/incidentModel");

const incidentTypes = new Set(Object.values(INCIDENT_TYPES));
const severities = new Set(Object.values(INCIDENT_SEVERITIES));
const responderTypes = new Set(["GOVERNMENT", "NGO", "DRONE"]);

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

  if (body.voiceNoteBase64 != null) {
    if (typeof body.voiceNoteBase64 !== "string") {
      return "voiceNoteBase64 must be a string";
    }

    if (!body.voiceNoteBase64.startsWith("data:audio/")) {
      return "voiceNoteBase64 must be a valid audio data URI";
    }
  }

  return null;
}

function validateRespondPayload(body) {
  const { responderId, responderName, responderType, ngoPartner } = body || {};
  if (!responderId) {
    return "responderId is required";
  }

  const normalizedResponderType = String(responderType || "GOVERNMENT").toUpperCase();
  if (!responderTypes.has(normalizedResponderType)) {
    return "responderType must be GOVERNMENT, NGO or DRONE";
  }

  if (normalizedResponderType === "DRONE") {
    return null;
  }

  if (!responderName) {
    return "responderName is required for GOVERNMENT or NGO assignment";
  }

  if (normalizedResponderType === "NGO" && !ngoPartner) {
    return "ngoPartner is required when responderType is NGO";
  }

  return null;
}

module.exports = {
  validateCreatePayload,
  validateRespondPayload,
};
