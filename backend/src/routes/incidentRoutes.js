const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const incidentController = require("../controllers/incidentController");

const router = express.Router();

router.get("/", asyncHandler(incidentController.root));

router.post("/incidents/sos", asyncHandler(incidentController.createSosIncident));
router.post("/incidents/cctv", asyncHandler(incidentController.createCctvIncident));
router.post("/incidents/disaster", asyncHandler(incidentController.createDisasterIncident));

router.get("/incidents", asyncHandler(incidentController.getIncidents));
router.get("/incidents/stats/summary", asyncHandler(incidentController.getIncidentStats));
router.get("/incidents/:incidentId", asyncHandler(incidentController.getIncidentById));

router.patch("/incidents/:incidentId/respond", asyncHandler(incidentController.respondToIncident));
router.patch("/incidents/:incidentId/resolve", asyncHandler(incidentController.resolveIncident));

module.exports = router;
