const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const { connectToDatabase } = require("./config/db");
const incidentRoutes = require("./routes/incidentRoutes");
const aiRoutes = require("./routes/aiRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(
  cors({
    origin: env.corsOrigins.includes("*") ? true : env.corsOrigins,
  })
);
app.use(express.json({ limit: "50mb" }));

app.use("/api", incidentRoutes);
app.use("/api/ai", aiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

async function startApp() {
  await connectToDatabase();

  const server = app.listen(env.port, () => {
    console.log(`SurakshaNet Express API running on http://localhost:${env.port}`);
    console.log(`MongoDB database connected: ${env.dbName}`);
  });

  server.on("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
      console.error(
        `Port ${env.port} is already in use. Stop the old backend process or run npm run free-ports from repository root.`
      );
      process.exit(1);
    }

    throw error;
  });
}

module.exports = {
  app,
  startApp,
};
