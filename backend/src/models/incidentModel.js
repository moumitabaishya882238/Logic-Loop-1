const crypto = require("crypto");
const {
  INCIDENT_STATUSES,
  INCIDENT_SEVERITIES,
} = require("../constants/incident");

function normalizeLocation(location) {
  return {
    lat: Number(location?.lat ?? location?.latitude),
    lng: Number(location?.lng ?? location?.longitude),
    address: location?.address || null,
  };
}

function createIncidentDoc(body, forcedType) {
  const type = forcedType || String(body.type).toUpperCase();

  return {
    id: crypto.randomUUID(),
    type,
    status: INCIDENT_STATUSES.PENDING,
    location: normalizeLocation(body.location),
    description: body.description,
    severity: String(body.severity || INCIDENT_SEVERITIES.MEDIUM).toUpperCase(),
    reportedBy: body.reportedBy || null,
    voiceNoteBase64: body.voiceNoteBase64 || null,
    voiceDurationSeconds:
      body.voiceDurationSeconds != null ? Number(body.voiceDurationSeconds) : null,
    responderId: null,
    responderName: null,
    timestamp: new Date().toISOString(),
    responseTime: null,
  };
}

module.exports = {
  normalizeLocation,
  createIncidentDoc,
};
