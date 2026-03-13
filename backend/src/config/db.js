const { MongoClient } = require("mongodb");
const env = require("./env");

let mongoClient;
let incidentsCollection;
let ngosCollection;
let ngoRequestsCollection;
let ngoSessionsCollection;
let floodSensorsCollection;

async function connectToDatabase() {
  mongoClient = new MongoClient(env.mongoUrl);
  await mongoClient.connect();

  const db = mongoClient.db(env.dbName);
  incidentsCollection = db.collection("incidents");
  ngosCollection = db.collection("ngos");
  ngoRequestsCollection = db.collection("ngo_requests");
  ngoSessionsCollection = db.collection("ngo_sessions");
  floodSensorsCollection = db.collection("flood_sensors");

  await incidentsCollection.createIndex({ id: 1 }, { unique: true });
  await incidentsCollection.createIndex({ timestamp: -1 });
  await ngosCollection.createIndex({ id: 1 }, { unique: true });
  await ngosCollection.createIndex({ name: 1 }, { unique: true });
  await ngoRequestsCollection.createIndex({ id: 1 }, { unique: true });
  await ngoRequestsCollection.createIndex({ status: 1, createdAt: -1 });
  await ngoSessionsCollection.createIndex({ token: 1 }, { unique: true });
  await ngoSessionsCollection.createIndex({ ngoId: 1, createdAt: -1 });
  await floodSensorsCollection.createIndex({ sensorId: 1 }, { unique: true });
  await floodSensorsCollection.createIndex({ status: 1, createdAt: -1 });

  return {
    db,
    incidentsCollection,
    ngosCollection,
    ngoRequestsCollection,
    ngoSessionsCollection,
    floodSensorsCollection,
  };
}

function getIncidentsCollection() {
  if (!incidentsCollection) {
    throw new Error("Database is not connected. Call connectToDatabase first.");
  }

  return incidentsCollection;
}

function getNgosCollection() {
  if (!ngosCollection) {
    throw new Error("Database is not connected. Call connectToDatabase first.");
  }

  return ngosCollection;
}

function getNgoRequestsCollection() {
  if (!ngoRequestsCollection) {
    throw new Error("Database is not connected. Call connectToDatabase first.");
  }

  return ngoRequestsCollection;
}

function getNgoSessionsCollection() {
  if (!ngoSessionsCollection) {
    throw new Error("Database is not connected. Call connectToDatabase first.");
  }

  return ngoSessionsCollection;
}

function getFloodSensorsCollection() {
  if (!floodSensorsCollection) {
    throw new Error("Database is not connected. Call connectToDatabase first.");
  }

  return floodSensorsCollection;
}

async function closeDatabase() {
  if (mongoClient) {
    await mongoClient.close();
  }
}

module.exports = {
  connectToDatabase,
  getIncidentsCollection,
  getNgosCollection,
  getNgoRequestsCollection,
  getNgoSessionsCollection,
  getFloodSensorsCollection,
  closeDatabase,
};
