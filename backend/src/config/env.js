const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const env = {
  port: Number(process.env.PORT || 8001),
  mongoUrl: process.env.MONGO_URL,
  dbName: process.env.DB_NAME || "SurakshaNet",
  corsOrigins: (process.env.CORS_ORIGINS || "*").split(","),
};

if (!env.mongoUrl) {
  throw new Error("MONGO_URL is not configured in backend/.env");
}

module.exports = env;
