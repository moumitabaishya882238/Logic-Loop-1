const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const { getIncidentsCollection } = require("../config/db");
const { createIncidentDoc } = require("../models/incidentModel");
const router = express.Router();

const AI_ENGINE_URL = "http://localhost:8002";

router.post("/process-frame", async (req, res, next) => {
  try {
    const { videoFrameBase64, cameraId, locationLat, locationLng } = req.body;

    if (!videoFrameBase64) {
      return res.status(400).json({ error: "Missing videoFrameBase64" });
    }

    // Convert base64 DataURI to Buffer
    const base64Data = videoFrameBase64.includes(",") ? videoFrameBase64.split(",")[1] : videoFrameBase64;
    const buffer = Buffer.from(base64Data, "base64");
    console.log(`Sending image to AI Engine. Size: ${(buffer.length/1024).toFixed(2)} KB`);

    // Send to Python FastAPI Engine
    const formData = new FormData();
    formData.append("file", buffer, { filename: "frame.jpg", contentType: "image/jpeg" });

    try {
      const response = await axios.post(`${AI_ENGINE_URL}/detect`, formData, {
        headers: { ...formData.getHeaders() },
        timeout: 30000, // 30 seconds
      });

      const aiData = response.data;
      
      // If accident is detected, auto-create a high-severity incident
      let incidentId = null;
      if (aiData.detected) {
        const incidents = getIncidentsCollection();
        
        // TEMPORARILY DISABLED SPAM PROTECTOR FOR DEBUGGING
        // const existingAlert = await incidents.findOne({ ... });

        if (true) { // Force incident creation every time for now
           const incidentPayload = {
             type: "CCTV",
             severity: "CRITICAL",
             description: "AI Detected Traffic Accident",
             location: {
               lat: locationLat || 26.1158,
               lng: locationLng || 91.7086,
               address: `Camera Node: ${cameraId || "Unknown"}`
             },
             reportedBy: cameraId || "CCTV_AI_SYSTEM"
           };
           
           const newIncident = createIncidentDoc(incidentPayload, "CCTV");
           // Add AI confidence to the doc
           if (aiData.detections && aiData.detections.length > 0) {
             newIncident.aiConfidence = aiData.detections[0].confidence;
           }
           
           await incidents.insertOne(newIncident);
           incidentId = newIncident.id;
        }
      }

      return res.json({
        success: true,
        detected: aiData.detected,
        detections: aiData.detections,
        annotatedFrame: aiData.annotated_frame,
        incidentId: incidentId
      });

    } catch (aiError) {
      console.error("AI Route Error:", aiError);
      if (aiError.code === 'ECONNREFUSED' || aiError.message.includes('timeout')) {
        return res.status(503).json({ error: "AI Inference Engine unreachable. Ensure it is running on port 8002" });
      }
      return res.status(500).json({ error: "Internal Server Error in AI Route", detail: aiError.message });
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;
