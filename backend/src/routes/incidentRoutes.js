const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const incidentController = require("../controllers/incidentController");
const ngoController = require("../controllers/ngoController");

const router = express.Router();

router.get("/", asyncHandler(incidentController.root));

router.post("/incidents/sos", asyncHandler(incidentController.createSosIncident));
router.post("/incidents/cctv", asyncHandler(incidentController.createCctvIncident));
router.post("/incidents/disaster", asyncHandler(incidentController.createDisasterIncident));

router.get("/incidents", asyncHandler(incidentController.getIncidents));
router.get("/incidents/stats/summary", asyncHandler(incidentController.getIncidentStats));
router.get("/flood-sensors", asyncHandler(incidentController.getFloodSensorFeed));
router.post("/flood-sensors", asyncHandler(incidentController.createFloodSensor));
router.post(
	"/flood-sensors/create-disaster-alerts",
	asyncHandler(incidentController.createFloodAlertsFromSensors)
);
router.get("/incidents/:incidentId", asyncHandler(incidentController.getIncidentById));

router.patch("/incidents/:incidentId/respond", asyncHandler(incidentController.respondToIncident));
router.patch(
	"/incidents/:incidentId/auto-assign-ngo",
	asyncHandler(incidentController.autoAssignNearestNgo)
);
router.patch("/incidents/:incidentId/resolve", asyncHandler(incidentController.resolveIncident));

router.get("/ngos", asyncHandler(ngoController.getNgos));
router.post("/ngo-requests", asyncHandler(ngoController.createNgoRequest));
router.get("/ngo-requests", asyncHandler(ngoController.getNgoRequests));
router.patch("/ngo-requests/:requestId/approve", asyncHandler(ngoController.approveNgoRequest));
router.patch("/ngo-requests/:requestId/reject", asyncHandler(ngoController.rejectNgoRequest));
router.post("/ngo-auth/login", asyncHandler(ngoController.ngoLogin));
router.post("/ngo-auth/logout", asyncHandler(ngoController.ngoLogout));
router.get("/ngo-auth/profile", asyncHandler(ngoController.getNgoProfile));
router.patch("/ngo-auth/availability", asyncHandler(ngoController.setNgoAvailability));
router.get("/ngo-auth/incidents", asyncHandler(ngoController.getNgoAssignedIncidents));

module.exports = router;
