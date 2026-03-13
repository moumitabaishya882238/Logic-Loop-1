const { getIncidentsCollection, getNgosCollection } = require("../config/db");
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

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
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
  const {
    responderId,
    responderName,
    responderType: requestedResponderType,
    ngoPartner,
  } = req.body;
  const responderType = String(requestedResponderType || "GOVERNMENT").toUpperCase();
  const isDroneDispatch = responderType === "DRONE";

  if (responderType === "NGO") {
    const ngos = getNgosCollection();
    const approvedNgo = await ngos.findOne({ name: ngoPartner });
    if (!approvedNgo) {
      throw badRequest("Selected NGO partner is not approved in NGO Partners directory");
    }
  }

  const updateResult = await incidents.updateOne(
    { id: req.params.incidentId },
    {
      $set: {
        status: INCIDENT_STATUSES.ACCEPTED,
        responderId,
        responderName: isDroneDispatch
          ? "Autonomous Drone Unit"
          : responderName,
        responderType,
        ngoPartner: responderType === "NGO" ? ngoPartner : null,
        ngoDistanceKm: null,
        droneDispatched: isDroneDispatch,
        droneDispatchTime: isDroneDispatch ? new Date().toISOString() : null,
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

async function autoAssignNearestNgo(req, res) {
  const incidents = getIncidentsCollection();
  const ngos = getNgosCollection();

  const incident = await incidents.findOne({ id: req.params.incidentId });
  if (!incident) {
    throw notFound("Incident not found");
  }

  const incidentLat = Number(incident?.location?.lat);
  const incidentLng = Number(incident?.location?.lng);
  if (!Number.isFinite(incidentLat) || !Number.isFinite(incidentLng)) {
    throw badRequest("Incident location is missing or invalid");
  }

  const onlineNgos = await ngos
    .find({ status: "ACTIVE", availabilityStatus: "ONLINE" })
    .toArray();

  const eligibleNgos = onlineNgos.filter((ngo) => {
    return Number.isFinite(Number(ngo.latitude)) && Number.isFinite(Number(ngo.longitude));
  });

  if (eligibleNgos.length === 0) {
    throw badRequest("No ONLINE NGOs with valid coordinates are available for auto-assignment");
  }

  let nearestNgo = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  eligibleNgos.forEach((ngo) => {
    const distanceKm = haversineDistanceKm(
      incidentLat,
      incidentLng,
      Number(ngo.latitude),
      Number(ngo.longitude)
    );

    if (distanceKm < nearestDistance) {
      nearestDistance = distanceKm;
      nearestNgo = ngo;
    }
  });

  if (!nearestNgo) {
    throw badRequest("Unable to compute nearest NGO");
  }

  await incidents.updateOne(
    { id: req.params.incidentId },
    {
      $set: {
        status: INCIDENT_STATUSES.ACCEPTED,
        responderId: `NGO-AUTO-${Date.now()}`,
        responderName: nearestNgo.contactPerson || nearestNgo.name,
        responderType: "NGO",
        ngoPartner: nearestNgo.name,
        ngoDistanceKm: Number(nearestDistance.toFixed(2)),
        responseTime: new Date().toISOString(),
      },
    }
  );

  const updatedIncident = await incidents.findOne(
    { id: req.params.incidentId },
    { projection: { _id: 0 } }
  );

  res.json(updatedIncident);
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
  autoAssignNearestNgo,
  resolveIncident,
  getIncidentStats,
};
