const {
  getIncidentsCollection,
  getNgosCollection,
  getFloodSensorsCollection,
} = require("../config/db");
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function simulateFloodSensors() {
  const now = Date.now();
  const minuteFactor = now / 60000;

  const baseSensors = [
    {
      id: "FS-101",
      name: "Beltola Main Drain",
      lat: 26.1118,
      lng: 91.7973,
      zone: "Beltola",
      baseLevelPercent: 42,
      wave: 16,
      rainfallBase: 18,
    },
    {
      id: "FS-102",
      name: "Khanapara Underpass Drain",
      lat: 26.1402,
      lng: 91.8144,
      zone: "Khanapara",
      baseLevelPercent: 56,
      wave: 20,
      rainfallBase: 24,
    },
    {
      id: "FS-103",
      name: "Zoo Road Catchment",
      lat: 26.1714,
      lng: 91.7775,
      zone: "Zoo Road",
      baseLevelPercent: 38,
      wave: 14,
      rainfallBase: 12,
    },
    {
      id: "FS-104",
      name: "Six Mile Drain Gate",
      lat: 26.1479,
      lng: 91.8054,
      zone: "Six Mile",
      baseLevelPercent: 64,
      wave: 18,
      rainfallBase: 30,
    },
  ];

  return baseSensors.map((sensor, index) => {
    const phase = minuteFactor + index * 0.85;
    const waterLevelPercent = clamp(
      sensor.baseLevelPercent + Math.sin(phase) * sensor.wave + Math.cos(phase / 2) * 6,
      5,
      98
    );
    const riseRateCmPerMin = Number((Math.cos(phase) * 2.4 + 0.7).toFixed(2));
    const rainfallMmPerHr = clamp(
      sensor.rainfallBase + Math.sin(phase / 1.4) * 11,
      0,
      90
    );

    const riskScore = clamp(
      waterLevelPercent * 0.62 + rainfallMmPerHr * 0.28 + Math.max(riseRateCmPerMin, 0) * 8,
      0,
      100
    );

    let riskLevel = "LOW";
    if (riskScore >= 75) riskLevel = "CRITICAL";
    else if (riskScore >= 55) riskLevel = "HIGH";
    else if (riskScore >= 35) riskLevel = "MEDIUM";

    const estimatedOverflowMinutes =
      waterLevelPercent >= 96
        ? 0
        : Math.max(
            5,
            Math.round((100 - waterLevelPercent) / Math.max(Math.max(riseRateCmPerMin, 0.6), 0.6))
          );

    return {
      sensorId: sensor.id,
      sensorName: sensor.name,
      zone: sensor.zone,
      lat: sensor.lat,
      lng: sensor.lng,
      waterLevelPercent: Number(waterLevelPercent.toFixed(1)),
      riseRateCmPerMin,
      rainfallMmPerHr: Number(rainfallMmPerHr.toFixed(1)),
      riskScore: Number(riskScore.toFixed(1)),
      riskLevel,
      estimatedOverflowMinutes,
      lastUpdated: new Date().toISOString(),
    };
  });
}

function normalizeConfiguredSensor(sensor) {
  const waterLevelPercent = clamp(Number(sensor.currentWaterLevelPercent || 0), 0, 100);
  const riseRateCmPerMin = Number(sensor.riseRateCmPerMin || 0);
  const rainfallMmPerHr = clamp(Number(sensor.rainfallMmPerHr || 0), 0, 150);
  const warningLevel = clamp(Number(sensor.warningLevelPercent || 60), 1, 99);
  const criticalLevel = clamp(Number(sensor.criticalLevelPercent || 80), warningLevel + 1, 100);

  const riskScore = clamp(
    waterLevelPercent * 0.65 + rainfallMmPerHr * 0.23 + Math.max(riseRateCmPerMin, 0) * 7,
    0,
    100
  );

  let riskLevel = "LOW";
  if (waterLevelPercent >= criticalLevel || riskScore >= 80) riskLevel = "CRITICAL";
  else if (waterLevelPercent >= warningLevel || riskScore >= 60) riskLevel = "HIGH";
  else if (riskScore >= 35) riskLevel = "MEDIUM";

  const estimatedOverflowMinutes =
    waterLevelPercent >= 98
      ? 0
      : Math.max(5, Math.round((100 - waterLevelPercent) / Math.max(riseRateCmPerMin, 0.7)));

  return {
    sensorId: sensor.sensorId,
    sensorName: sensor.sensorName,
    zone: sensor.zone,
    lat: Number(sensor.lat),
    lng: Number(sensor.lng),
    waterLevelPercent: Number(waterLevelPercent.toFixed(1)),
    riseRateCmPerMin: Number(riseRateCmPerMin.toFixed(2)),
    rainfallMmPerHr: Number(rainfallMmPerHr.toFixed(1)),
    riskScore: Number(riskScore.toFixed(1)),
    riskLevel,
    estimatedOverflowMinutes,
    warningLevelPercent: warningLevel,
    criticalLevelPercent: criticalLevel,
    drainDepthCm: Number(sensor.drainDepthCm || 0),
    sourceType: "CONFIGURED",
    lastUpdated: new Date().toISOString(),
  };
}

async function getMergedFloodSensors() {
  const configuredSensorsCollection = getFloodSensorsCollection();
  const configuredSensors = await configuredSensorsCollection
    .find({ status: "ACTIVE" }, { projection: { _id: 0 } })
    .toArray();

  const configuredFeed = configuredSensors.map(normalizeConfiguredSensor);
  const simulatedFeed = simulateFloodSensors().map((sensor) => ({
    ...sensor,
    sourceType: "SIMULATED",
  }));

  return [...configuredFeed, ...simulatedFeed];
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

async function getFloodSensorFeed(_req, res) {
  const sensors = await getMergedFloodSensors();
  const critical = sensors.filter((sensor) => sensor.riskLevel === "CRITICAL").length;
  const high = sensors.filter((sensor) => sensor.riskLevel === "HIGH").length;
  const avgWater = sensors.reduce((sum, sensor) => sum + sensor.waterLevelPercent, 0) / sensors.length;

  res.json({
    mode: "HYBRID_CONFIGURED_AND_SIMULATED",
    sensors,
    summary: {
      totalSensors: sensors.length,
      criticalSensors: critical,
      highRiskSensors: high,
      averageWaterLevelPercent: Number(avgWater.toFixed(1)),
    },
  });
}

async function createFloodSensor(req, res) {
  const {
    sensorId,
    sensorName,
    zone,
    lat,
    lng,
    drainDepthCm,
    warningLevelPercent,
    criticalLevelPercent,
    currentWaterLevelPercent,
    riseRateCmPerMin,
    rainfallMmPerHr,
  } = req.body || {};

  if (!sensorId || !sensorName || !zone) {
    throw badRequest("sensorId, sensorName and zone are required");
  }

  const parsedLat = parseNumber(lat);
  const parsedLng = parseNumber(lng);
  if (parsedLat == null || parsedLng == null) {
    throw badRequest("lat and lng must be valid numbers");
  }

  const parsedDrainDepth = parseNumber(drainDepthCm);
  const parsedWarning = parseNumber(warningLevelPercent);
  const parsedCritical = parseNumber(criticalLevelPercent);
  const parsedCurrentWater = parseNumber(currentWaterLevelPercent);
  const parsedRiseRate = parseNumber(riseRateCmPerMin);
  const parsedRain = parseNumber(rainfallMmPerHr);

  if (
    parsedDrainDepth == null ||
    parsedWarning == null ||
    parsedCritical == null ||
    parsedCurrentWater == null ||
    parsedRiseRate == null ||
    parsedRain == null
  ) {
    throw badRequest(
      "drainDepthCm, warningLevelPercent, criticalLevelPercent, currentWaterLevelPercent, riseRateCmPerMin and rainfallMmPerHr are required numbers"
    );
  }

  if (parsedWarning >= parsedCritical) {
    throw badRequest("warningLevelPercent must be lower than criticalLevelPercent");
  }

  const floodSensors = getFloodSensorsCollection();
  const doc = {
    sensorId: String(sensorId).trim().toUpperCase(),
    sensorName: String(sensorName).trim(),
    zone: String(zone).trim(),
    lat: Number(parsedLat.toFixed(6)),
    lng: Number(parsedLng.toFixed(6)),
    drainDepthCm: Number(parsedDrainDepth.toFixed(1)),
    warningLevelPercent: Number(parsedWarning.toFixed(1)),
    criticalLevelPercent: Number(parsedCritical.toFixed(1)),
    currentWaterLevelPercent: Number(parsedCurrentWater.toFixed(1)),
    riseRateCmPerMin: Number(parsedRiseRate.toFixed(2)),
    rainfallMmPerHr: Number(parsedRain.toFixed(1)),
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  try {
    await floodSensors.insertOne(doc);
  } catch (error) {
    if (error && error.code === 11000) {
      throw badRequest("Sensor ID already exists");
    }
    throw error;
  }

  res.status(201).json(normalizeConfiguredSensor(doc));
}

async function createFloodAlertsFromSensors(_req, res) {
  const sensors = await getMergedFloodSensors();
  const incidents = getIncidentsCollection();
  const created = [];

  for (const sensor of sensors) {
    if (!["HIGH", "CRITICAL"].includes(sensor.riskLevel)) {
      continue;
    }

    const existing = await incidents.findOne({
      sourceSensorId: sensor.sensorId,
      status: { $in: [INCIDENT_STATUSES.PENDING, INCIDENT_STATUSES.ACCEPTED] },
      type: INCIDENT_TYPES.DISASTER,
    });

    if (existing) {
      continue;
    }

    const payload = {
      type: INCIDENT_TYPES.DISASTER,
      location: {
        lat: sensor.lat,
        lng: sensor.lng,
        address: `${sensor.zone} (${sensor.sensorName})`,
      },
      description: `Potential urban flooding risk at ${sensor.zone}. Water level ${sensor.waterLevelPercent}% with ${sensor.rainfallMmPerHr} mm/hr rainfall.`,
      severity: sensor.riskLevel === "CRITICAL" ? INCIDENT_SEVERITIES.CRITICAL : INCIDENT_SEVERITIES.HIGH,
      reportedBy: "FLOOD_SENSOR_PILOT_AI",
    };

    const incident = createIncidentDoc(payload, INCIDENT_TYPES.DISASTER);
    const enrichedIncident = {
      ...incident,
      sourceSensorId: sensor.sensorId,
      sourceSensorName: sensor.sensorName,
      sourceRiskScore: sensor.riskScore,
      estimatedOverflowMinutes: sensor.estimatedOverflowMinutes,
      detectionMode: sensor.sourceType === "CONFIGURED" ? "CONFIGURED_SENSOR" : "SIMULATED_PILOT",
    };

    await incidents.insertOne(enrichedIncident);
    created.push(enrichedIncident);
  }

  res.json({
    message: `Created ${created.length} disaster alert(s) from flood sensors`,
    created,
  });
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
  createFloodSensor,
  getFloodSensorFeed,
  createFloodAlertsFromSensors,
};
