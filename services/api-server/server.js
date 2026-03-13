const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "surakshanet-api-server" });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
