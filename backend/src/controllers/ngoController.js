const crypto = require("crypto");
const {
  getNgosCollection,
  getNgoRequestsCollection,
  getNgoSessionsCollection,
  getIncidentsCollection,
} = require("../config/db");

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

function unauthorized(message) {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function parseCommaSeparated(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getAuthenticatedNgo(req) {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const headerToken = req.headers["x-ngo-token"];
  const token = (bearerToken || headerToken || "").trim();

  if (!token) {
    throw unauthorized("NGO authentication token is required");
  }

  const sessions = getNgoSessionsCollection();
  const ngos = getNgosCollection();
  const session = await sessions.findOne({ token });

  if (!session) {
    throw unauthorized("Invalid NGO session. Please login again.");
  }

  const ngo = await ngos.findOne({ id: session.ngoId });
  if (!ngo) {
    throw unauthorized("NGO account not found for this session");
  }

  await sessions.updateOne(
    { token },
    {
      $set: {
        lastActiveAt: new Date().toISOString(),
      },
    }
  );

  return ngo;
}

async function getNgos(_req, res) {
  const ngos = getNgosCollection();
  const data = await ngos
    .find({}, { projection: { _id: 0, passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  res.json(data);
}

async function createNgoRequest(req, res) {
  const {
    organizationName,
    contactPerson,
    phone,
    email,
    city,
    coverageAreas,
    capabilities,
    teamSize,
    latitude,
    longitude,
    password,
  } = req.body || {};

  if (!organizationName || !contactPerson || !phone || !email || !city || !password) {
    throw badRequest(
      "organizationName, contactPerson, phone, email, city and password are required"
    );
  }

  const parsedTeamSize = Number(teamSize);
  if (!Number.isFinite(parsedTeamSize) || parsedTeamSize <= 0) {
    throw badRequest("teamSize must be a positive number");
  }

  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  if (lat == null || lng == null) {
    throw badRequest("latitude and longitude are required numbers");
  }

  const now = new Date().toISOString();
  const ngoRequests = getNgoRequestsCollection();

  const requestDoc = {
    id: crypto.randomUUID(),
    organizationName: String(organizationName).trim(),
    contactPerson: String(contactPerson).trim(),
    phone: String(phone).trim(),
    email: String(email).trim().toLowerCase(),
    city: String(city).trim(),
    teamSize: Math.round(parsedTeamSize),
    latitude: lat,
    longitude: lng,
    coverageAreas: parseCommaSeparated(coverageAreas),
    capabilities: parseCommaSeparated(capabilities),
    passwordHash: hashPassword(password),
    status: "PENDING",
    createdAt: now,
    reviewedAt: null,
  };

  await ngoRequests.insertOne(requestDoc);
  res.status(201).json(requestDoc);
}

async function getNgoRequests(req, res) {
  const query = {};
  if (req.query.status) {
    query.status = String(req.query.status).toUpperCase();
  }

  const ngoRequests = getNgoRequestsCollection();
  const data = await ngoRequests
    .find(query, { projection: { _id: 0, passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  res.json(data);
}

async function approveNgoRequest(req, res) {
  const ngoRequests = getNgoRequestsCollection();
  const ngos = getNgosCollection();

  const request = await ngoRequests.findOne({ id: req.params.requestId });
  if (!request) {
    throw notFound("NGO request not found");
  }

  const now = new Date().toISOString();

  await ngoRequests.updateOne(
    { id: req.params.requestId },
    {
      $set: {
        status: "APPROVED",
        reviewedAt: now,
      },
    }
  );

  const existingNgo = await ngos.findOne({ name: request.organizationName });
  if (!existingNgo) {
    await ngos.insertOne({
      id: crypto.randomUUID(),
      name: request.organizationName,
      contactPerson: request.contactPerson,
      phone: request.phone,
      email: request.email,
      city: request.city,
      teamSize: request.teamSize,
      latitude: request.latitude,
      longitude: request.longitude,
      coverageAreas: request.coverageAreas || [],
      capabilities: request.capabilities || [],
      passwordHash: request.passwordHash,
      availabilityStatus: "OFFLINE",
      activeMembers: 0,
      sourceRequestId: request.id,
      createdAt: now,
      status: "ACTIVE",
    });
  }

  const updatedRequest = await ngoRequests.findOne(
    { id: req.params.requestId },
    { projection: { _id: 0, passwordHash: 0 } }
  );

  res.json(updatedRequest);
}

async function rejectNgoRequest(req, res) {
  const ngoRequests = getNgoRequestsCollection();

  const update = await ngoRequests.updateOne(
    { id: req.params.requestId },
    {
      $set: {
        status: "REJECTED",
        reviewedAt: new Date().toISOString(),
      },
    }
  );

  if (!update.matchedCount) {
    throw notFound("NGO request not found");
  }

  const updatedRequest = await ngoRequests.findOne(
    { id: req.params.requestId },
    { projection: { _id: 0, passwordHash: 0 } }
  );

  res.json(updatedRequest);
}

async function ngoLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw badRequest("email and password are required");
  }

  const ngos = getNgosCollection();
  const sessions = getNgoSessionsCollection();
  const ngo = await ngos.findOne({
    email: String(email).trim().toLowerCase(),
    status: "ACTIVE",
  });

  if (!ngo || ngo.passwordHash !== hashPassword(password)) {
    throw unauthorized("Invalid NGO email or password");
  }

  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  await sessions.insertOne({
    token,
    ngoId: ngo.id,
    createdAt: now,
    lastActiveAt: now,
  });

  res.json({
    token,
    ngo: {
      id: ngo.id,
      name: ngo.name,
      contactPerson: ngo.contactPerson,
      email: ngo.email,
      phone: ngo.phone,
      city: ngo.city,
      teamSize: ngo.teamSize || 0,
      availabilityStatus: ngo.availabilityStatus || "OFFLINE",
      activeMembers: ngo.activeMembers || 0,
    },
  });
}

async function getNgoProfile(req, res) {
  const ngo = await getAuthenticatedNgo(req);
  res.json({
    id: ngo.id,
    name: ngo.name,
    contactPerson: ngo.contactPerson,
    email: ngo.email,
    phone: ngo.phone,
    city: ngo.city,
    teamSize: ngo.teamSize || 0,
    availabilityStatus: ngo.availabilityStatus || "OFFLINE",
    activeMembers: ngo.activeMembers || 0,
    coverageAreas: ngo.coverageAreas || [],
    capabilities: ngo.capabilities || [],
  });
}

async function setNgoAvailability(req, res) {
  const ngo = await getAuthenticatedNgo(req);
  const requestedStatus = String(req.body?.availabilityStatus || "").toUpperCase();
  const activeMembers = Number(req.body?.activeMembers || 0);

  if (!["ONLINE", "OFFLINE"].includes(requestedStatus)) {
    throw badRequest("availabilityStatus must be ONLINE or OFFLINE");
  }

  if (!Number.isFinite(activeMembers) || activeMembers < 0) {
    throw badRequest("activeMembers must be a non-negative number");
  }

  const ngos = getNgosCollection();
  await ngos.updateOne(
    { id: ngo.id },
    {
      $set: {
        availabilityStatus: requestedStatus,
        activeMembers: Math.round(activeMembers),
        availabilityUpdatedAt: new Date().toISOString(),
      },
    }
  );

  const updatedNgo = await ngos.findOne({ id: ngo.id }, { projection: { _id: 0, passwordHash: 0 } });
  res.json(updatedNgo);
}

async function getNgoAssignedIncidents(req, res) {
  const ngo = await getAuthenticatedNgo(req);
  const incidents = getIncidentsCollection();
  const data = await incidents
    .find(
      {
        responderType: "NGO",
        ngoPartner: ngo.name,
      },
      { projection: { _id: 0 } }
    )
    .sort({ timestamp: -1 })
    .limit(100)
    .toArray();

  res.json(data);
}

async function ngoLogout(req, res) {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const headerToken = req.headers["x-ngo-token"];
  const token = (bearerToken || headerToken || "").trim();

  if (token) {
    const sessions = getNgoSessionsCollection();
    await sessions.deleteOne({ token });
  }

  res.json({ success: true });
}

module.exports = {
  getNgos,
  createNgoRequest,
  getNgoRequests,
  approveNgoRequest,
  rejectNgoRequest,
  ngoLogin,
  getNgoProfile,
  setNgoAvailability,
  getNgoAssignedIncidents,
  ngoLogout,
};
