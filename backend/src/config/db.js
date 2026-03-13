const { MongoClient } = require("mongodb");
const env = require("./env");

let mongoClient;
let incidentsCollection;

async function connectToDatabase() {
  mongoClient = new MongoClient(env.mongoUrl);
  await mongoClient.connect();

  const db = mongoClient.db(env.dbName);
  incidentsCollection = db.collection("incidents");

  await incidentsCollection.createIndex({ id: 1 }, { unique: true });
  await incidentsCollection.createIndex({ timestamp: -1 });

  return { db, incidentsCollection };
}

function getIncidentsCollection() {
  if (!incidentsCollection) {
    throw new Error("Database is not connected. Call connectToDatabase first.");
  }

  return incidentsCollection;
}

async function closeDatabase() {
  if (mongoClient) {
    await mongoClient.close();
  }
}

module.exports = {
  connectToDatabase,
  getIncidentsCollection,
  closeDatabase,
};
