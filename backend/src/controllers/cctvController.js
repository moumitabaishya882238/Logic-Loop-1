const crypto = require("crypto");
const { getIncidentsCollection } = require("../config/db");
const { createIncidentDoc } = require("../models/incidentModel");
const { INCIDENT_TYPES, INCIDENT_SEVERITIES } = require("../constants/incident");

// ─── Simulated AI Analysis Engine ────────────────────────────────────────────
//
// In production this would call a real computer-vision model (e.g. a PyTorch
// ResNet/SlowFast service running frame extraction via ffmpeg + accident-
// detection inference).  For the demo we simulate the pipeline using:
//   • Video file metadata (size → proxy for duration/quality)
//   • Deterministic-but-varied confidence scoring per analysis run
//   • Realistic multi-class output (accident, fight, theft, fire, normal)
//

const DETECTION_CLASSES = ["ACCIDENT", "FIGHT", "THEFT", "FIRE", "NORMAL"];

const ACCIDENT_CONFIDENCE_THRESHOLD = 0.62; // auto-creates incident above this

function simulateFrameAnalysis(fileBuffer, originalName) {
  // Use file size + name as a seed so the same upload always returns the same result
  const seedStr = `${originalName}-${fileBuffer.length}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }

  const rng = (n) => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    return (hash >>> 0) / 0xffffffff + n * 0;
  };

  // Generate raw scores, skew accident probability for demo realism
  const rawScores = {
    ACCIDENT: 0.35 + rng(0) * 0.55, // 0.35–0.90 range
    FIGHT:    0.05 + rng(1) * 0.25,
    THEFT:    0.03 + rng(2) * 0.20,
    FIRE:     0.02 + rng(3) * 0.15,
    NORMAL:   0.05 + rng(4) * 0.30,
  };

  // Softmax normalise so scores sum to 1
  const expSum = Object.values(rawScores).reduce((s, v) => s + Math.exp(v * 4), 0);
  const confidence = {};
  for (const [cls, v] of Object.entries(rawScores)) {
    confidence[cls] = Number((Math.exp(v * 4) / expSum).toFixed(3));
  }

  const topClass = Object.entries(confidence).sort((a, b) => b[1] - a[1])[0][0];
  const accidentConfidence = confidence.ACCIDENT;
  const accidentDetected = accidentConfidence >= ACCIDENT_CONFIDENCE_THRESHOLD;

  // Simulated frames processed (based on file size proxy)
  const framesAnalyzed = Math.min(120, Math.max(24, Math.round(fileBuffer.length / 50000)));

  return {
    topClass,
    accidentDetected,
    accidentConfidence,
    confidence,
    framesAnalyzed,
    modelVersion: "SurakshaNet-AccidentNet-v1.0",
    processingMs: 800 + Math.round(rng(5) * 1200),
  };
}

function mapConfidenceToSeverity(confidence) {
  if (confidence >= 0.85) return INCIDENT_SEVERITIES.CRITICAL;
  if (confidence >= 0.75) return INCIDENT_SEVERITIES.HIGH;
  if (confidence >= 0.62) return INCIDENT_SEVERITIES.MEDIUM;
  return INCIDENT_SEVERITIES.LOW;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

async function analyzeCCTVFootage(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No video file uploaded" });
  }

  const {
    cameraId,
    cameraName,
    locationAddress,
    locationLat,
    locationLng,
  } = req.body;

  const lat = Number(locationLat);
  const lng = Number(locationLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "Valid location coordinates are required" });
  }

  if (!locationAddress || !locationAddress.trim()) {
    return res.status(400).json({ error: "Camera location address is required" });
  }

  // Run simulated analysis
  const analysis = simulateFrameAnalysis(req.file.buffer, req.file.originalname);

  let createdIncident = null;

  if (analysis.accidentDetected) {
    const incidents = getIncidentsCollection();

    const payload = {
      type: INCIDENT_TYPES.CCTV,
      location: {
        lat,
        lng,
        address: locationAddress.trim(),
      },
      description: `AI-detected road accident at ${locationAddress.trim()}. Confidence: ${(analysis.accidentConfidence * 100).toFixed(1)}%`,
      severity: mapConfidenceToSeverity(analysis.accidentConfidence),
      reportedBy: cameraName ? `CCTV: ${cameraName.trim()}` : `CCTV-CAM-${cameraId || "UNKNOWN"}`,
    };

    const incident = createIncidentDoc(payload, INCIDENT_TYPES.CCTV);
    const enrichedIncident = {
      ...incident,
      cctvAnalysis: {
        cameraId: cameraId || null,
        cameraName: cameraName || null,
        modelVersion: analysis.modelVersion,
        accidentConfidence: analysis.accidentConfidence,
        framesAnalyzed: analysis.framesAnalyzed,
        allConfidences: analysis.confidence,
        processingMs: analysis.processingMs,
        videoFileName: req.file.originalname,
        videoSizeBytes: req.file.size,
        analyzedAt: new Date().toISOString(),
      },
    };

    await incidents.insertOne(enrichedIncident);
    createdIncident = enrichedIncident;
  }

  res.json({
    analysis,
    accidentDetected: analysis.accidentDetected,
    incident: createdIncident,
    message: analysis.accidentDetected
      ? `Accident detected with ${(analysis.accidentConfidence * 100).toFixed(1)}% confidence — incident created`
      : `No accident detected (highest confidence: ${(analysis.accidentConfidence * 100).toFixed(1)}% — below ${(ACCIDENT_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% threshold)`,
  });
}

module.exports = { analyzeCCTVFootage };
