"""
SurakshaNet - CCTV AI Detection Service
main.py: FastAPI server + real-time detection runner

Starts two concurrent processes:
  1. FastAPI HTTP server (health, status, config endpoints)
  2. Background detection loop (frame grabbing → YOLO → incident analysis → alerts)
"""

import asyncio
import logging
import signal
import sys
import threading
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

import cv2
import pandas
import matplotlib.pyplot as plt
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

from detection.crowd_detection import CrowdDetector
from detection.fight_detection import FightDetector
from utils.alert_sender import AlertSender
from utils.video_stream import VideoStream

# ──────────────────────────────────────────────
# Logging setup
# ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("SurakshaNet.Main")


# ──────────────────────────────────────────────
# Global service state (shared between threads)
# ──────────────────────────────────────────────
class ServiceState:
    def __init__(self):
        self.running: bool = False
        self.frame_count: int = 0
        self.alert_count: int = 0
        self.last_detection: Optional[str] = None
        self.fps: float = 0.0
        self.detection_thread: Optional[threading.Thread] = None


state = ServiceState()


# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
class Config:
    # Video source: 0 = webcam, "rtsp://..." = RTSP, "file.mp4" = file
    VIDEO_SOURCE: str | int = 0
    CAMERA_ID: str = "CAM_01"
    LOCATION: dict = {"lat": 26.1445, "lng": 91.7362}

    # Model
    MODEL_PATH: str = "models/yolov8n.pt"
    CONFIDENCE_THRESHOLD: float = 0.45
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"

    # Performance
    FRAME_SKIP: int = 3          # Process every Nth frame
    RESIZE_WIDTH: int = 640      # Resize frame width before inference
    MAX_FPS: int = 30

    # Detection thresholds
    CROWD_PERSON_THRESHOLD: int = 5     # ≥ N persons → crowd alert
    FIGHT_PERSON_THRESHOLD: int = 2     # ≥ N persons close together → fight alert
    FIGHT_PROXIMITY_PX: int = 100       # Pixel distance to consider "close"

    # Alert settings
    BACKEND_URL: str = "http://localhost:5000"
    ALERT_COOLDOWN_SECONDS: int = 10    # Min seconds between same-type alerts


config = Config()


# ──────────────────────────────────────────────
# Core detection loop (runs in background thread)
# ──────────────────────────────────────────────
def run_detection_loop():
    """Main loop: grab frames → YOLOv8 inference → analyze → alert."""
    logger.info("Loading YOLOv8 model from %s on device '%s'", config.MODEL_PATH, config.DEVICE)

    try:
        model = YOLO(config.MODEL_PATH)
        model.to(config.DEVICE)
    except Exception as exc:
        logger.error("Failed to load YOLO model: %s", exc)
        state.running = False
        return

    crowd_detector = CrowdDetector(
        person_threshold=config.CROWD_PERSON_THRESHOLD
    )
    fight_detector = FightDetector(
        person_threshold=config.FIGHT_PERSON_THRESHOLD,
        proximity_px=config.FIGHT_PROXIMITY_PX,
    )
    alert_sender = AlertSender(
        backend_url=config.BACKEND_URL,
        camera_id=config.CAMERA_ID,
        location=config.LOCATION,
        cooldown_seconds=config.ALERT_COOLDOWN_SECONDS,
    )

    stream = VideoStream(source=config.VIDEO_SOURCE, resize_width=config.RESIZE_WIDTH)
    stream.start()
    logger.info("Video stream started — source: %s", config.VIDEO_SOURCE)

    frame_idx = 0
    fps_timer = time.time()
    fps_frame_count = 0

    # COCO class names we care about
    TARGET_CLASSES = {"person", "car", "motorcycle", "bicycle"}

    state.running = True
    logger.info("Detection loop running ✓")

    try:
        while state.running:
            frame = stream.read()
            if frame is None:
                logger.warning("No frame received — retrying in 0.5s …")
                time.sleep(0.5)
                continue

            frame_idx += 1
            fps_frame_count += 1

            # ── FPS calculation ──
            elapsed = time.time() - fps_timer
            if elapsed >= 1.0:
                state.fps = fps_frame_count / elapsed
                fps_frame_count = 0
                fps_timer = time.time()

            # ── Frame skipping for performance ──
            if frame_idx % config.FRAME_SKIP != 0:
                continue

            state.frame_count += 1

            # ── YOLOv8 inference ──
            results = model(
                frame,
                conf=config.CONFIDENCE_THRESHOLD,
                verbose=False,
                device=config.DEVICE,
            )

            # ── Parse detections ──
            detections = []  # list of {"class": str, "bbox": [x1,y1,x2,y2], "conf": float}
            for result in results:
                for box in result.boxes:
                    class_id = int(box.cls[0])
                    class_name = model.names[class_id]
                    if class_name not in TARGET_CLASSES:
                        continue
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    conf = float(box.conf[0])
                    detections.append({
                        "class": class_name,
                        "bbox": [x1, y1, x2, y2],
                        "conf": conf,
                    })

            if detections:
                class_summary = {}
                for d in detections:
                    class_summary[d["class"]] = class_summary.get(d["class"], 0) + 1
                logger.debug("Frame %d detections: %s", state.frame_count, class_summary)

            # ── Incident analysis ──
            persons = [d for d in detections if d["class"] == "person"]

            # Crowd detection
            crowd_incident = crowd_detector.analyze(persons, frame.shape)
            if crowd_incident:
                state.last_detection = "crowd"
                logger.info("🚨 CROWD detected — %d persons in frame", len(persons))
                sent = alert_sender.send_alert(
                    subtype="crowd",
                    metadata={"person_count": len(persons)},
                )
                if sent:
                    state.alert_count += 1

            # Fight / altercation detection
            fight_incident = fight_detector.analyze(persons, frame.shape)
            if fight_incident:
                state.last_detection = "fight"
                logger.info("🚨 POSSIBLE FIGHT detected — %d persons in proximity", fight_incident["cluster_size"])
                sent = alert_sender.send_alert(
                    subtype="fight",
                    metadata={
                        "person_count": len(persons),
                        "cluster_size": fight_incident["cluster_size"],
                    },
                )
                if sent:
                    state.alert_count += 1

            # Throttle loop to MAX_FPS ceiling
            time.sleep(max(0, 1.0 / config.MAX_FPS - 0.001))

    except Exception as exc:
        logger.exception("Detection loop crashed: %s", exc)
    finally:
        stream.stop()
        state.running = False
        logger.info("Detection loop stopped. Total frames: %d | Alerts sent: %d",
                    state.frame_count, state.alert_count)


# ──────────────────────────────────────────────
# FastAPI app lifecycle
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start detection loop on startup; stop on shutdown."""
    logger.info("═══ SurakshaNet CCTV AI Service starting ═══")
    state.detection_thread = threading.Thread(
        target=run_detection_loop, daemon=True, name="DetectionLoop"
    )
    state.detection_thread.start()
    yield
    logger.info("═══ SurakshaNet CCTV AI Service shutting down ═══")
    state.running = False
    if state.detection_thread:
        state.detection_thread.join(timeout=5)


app = FastAPI(
    title="SurakshaNet CCTV AI Service",
    description="Real-time CCTV incident detection powered by YOLOv8",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# API Endpoints
# ──────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health_check():
    """Liveness probe — returns service health."""
    return {
        "status": "ok" if state.running else "stopped",
        "camera_id": config.CAMERA_ID,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/status", tags=["System"])
def get_status():
    """Full runtime status for dashboard/monitoring."""
    return {
        "running": state.running,
        "camera_id": config.CAMERA_ID,
        "location": config.LOCATION,
        "device": config.DEVICE,
        "model": config.MODEL_PATH,
        "frames_processed": state.frame_count,
        "alerts_sent": state.alert_count,
        "current_fps": round(state.fps, 2),
        "last_detection_type": state.last_detection,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


class ConfigUpdate(BaseModel):
    crowd_threshold: Optional[int] = None
    fight_threshold: Optional[int] = None
    frame_skip: Optional[int] = None
    confidence: Optional[float] = None


@app.patch("/config", tags=["Configuration"])
def update_config(update: ConfigUpdate):
    """Hot-update detection thresholds without restart."""
    changes = {}
    if update.crowd_threshold is not None:
        config.CROWD_PERSON_THRESHOLD = update.crowd_threshold
        changes["crowd_threshold"] = update.crowd_threshold
    if update.fight_threshold is not None:
        config.FIGHT_PERSON_THRESHOLD = update.fight_threshold
        changes["fight_threshold"] = update.fight_threshold
    if update.frame_skip is not None:
        config.FRAME_SKIP = update.frame_skip
        changes["frame_skip"] = update.frame_skip
    if update.confidence is not None:
        config.CONFIDENCE_THRESHOLD = update.confidence
        changes["confidence"] = update.confidence
    if not changes:
        raise HTTPException(status_code=400, detail="No valid fields provided")
    logger.info("Config updated: %s", changes)
    return {"updated": changes}


@app.post("/stop", tags=["System"])
def stop_detection():
    """Gracefully stop the detection loop."""
    state.running = False
    return {"message": "Detection loop stopping …"}


@app.post("/start", tags=["System"])
def start_detection():
    """Restart the detection loop if stopped."""
    if state.running:
        return {"message": "Detection loop already running"}
    state.detection_thread = threading.Thread(
        target=run_detection_loop, daemon=True, name="DetectionLoop"
    )
    state.detection_thread.start()
    return {"message": "Detection loop restarted"}


# ──────────────────────────────────────────────
# Entrypoint
# ──────────────────────────────────────────────
if __name__ == "__main__":
    # Graceful shutdown on Ctrl+C
    def _handle_signal(sig, frame):
        logger.info("Interrupt received — shutting down")
        state.running = False
        sys.exit(0)

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info",
    )