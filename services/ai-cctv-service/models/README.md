# 🛡️ SurakshaNet — CCTV AI Detection Service

Real-time CCTV incident detection microservice built with **YOLOv8 + PyTorch + FastAPI**.  
Monitors live video streams, detects crowds and fights, and fires alerts to the SurakshaNet backend.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                  SurakshaNet AI Service                │
│                                                        │
│  ┌──────────────┐     ┌─────────────┐                  │
│  │ VideoStream  │────▶│  YOLOv8n   │  (background      │
│  │ (OpenCV,     │     │  Inference  │   thread)        │
│  │  bg thread)  │     └──────┬──────┘                  │
│  └──────────────┘            │                         │
│                    ┌─────────▼──────────┐              │
│                    │  Detection Layer   │              │
│                    │  ┌──────────────┐  │              │
│                    │  │CrowdDetector │  │              │
│                    │  ├──────────────┤  │              │
│                    │  │FightDetector │  │              │
│                    │  └──────────────┘  │              │
│                    └─────────┬──────────┘              │
│                              │ incident                │
│                    ┌─────────▼──────────┐              │
│                    │   AlertSender      │              │
│                    │ (cooldown + retry) │              │
│                    └─────────┬──────────┘              │
│                              │ HTTP POST               │
└──────────────────────────────┼─────────────────────────┘
                               │
                    ┌──────────▼────────────┐
                    │  SurakshaNet Backend  │
                    │  POST /api/cctv-alert │
                    └───────────────────────┘
```

---

## Project Structure

```
ai-cctv-service/
├── main.py                   # FastAPI server + detection orchestration
├── requirements.txt
├── detection/
│   ├── __init__.py
│   ├── crowd_detection.py    # Person count + density threshold logic
│   └── fight_detection.py    # Proximity cluster / altercation detection
├── models/
│   ├── README.md             # Model download instructions
│   └── yolov8n.pt            # Place weights here (see README)
└── utils/
    ├── __init__.py
    ├── video_stream.py       # Background-threaded OpenCV VideoCapture
    └── alert_sender.py       # HTTP POST with cooldown + retry
```

---

## Setup

### 1. Install dependencies

```bash
cd ai-cctv-service
pip install -r requirements.txt
```

### 2. Download YOLOv8 weights

```bash
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
cp ~/.cache/ultralytics/models/yolov8n.pt models/yolov8n.pt
```

Or directly:
```bash
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt \
     -O models/yolov8n.pt
```

### 3. Configure the service

Edit the `Config` class in `main.py`:

```python
class Config:
    VIDEO_SOURCE     = 0                   # 0=webcam | "rtsp://..." | "video.mp4"
    CAMERA_ID        = "CAM_01"
    LOCATION         = {"lat": 26.1445, "lng": 91.7362}
    BACKEND_URL      = "http://localhost:5000"

    # Detection thresholds
    CROWD_PERSON_THRESHOLD = 5             # ≥ N persons → crowd alert
    FIGHT_PERSON_THRESHOLD = 2             # ≥ N persons in proximity → fight
    FIGHT_PROXIMITY_PX     = 100           # pixel distance = "close"

    # Performance
    FRAME_SKIP       = 3                   # Process every 3rd frame
    CONFIDENCE_THRESHOLD = 0.45
```

### 4. Run

```bash
python main.py
```

Service starts on **http://0.0.0.0:8001**

---

## REST API

| Method | Endpoint   | Description                          |
|--------|------------|--------------------------------------|
| GET    | /health    | Liveness probe                       |
| GET    | /status    | Full runtime stats (FPS, alerts, …)  |
| PATCH  | /config    | Hot-update thresholds (no restart)   |
| POST   | /start     | Start or restart detection loop      |
| POST   | /stop      | Gracefully stop detection loop       |
| GET    | /docs      | Swagger UI (auto-generated)          |

### Example: update thresholds at runtime

```bash
curl -X PATCH http://localhost:8001/config \
     -H "Content-Type: application/json" \
     -d '{"crowd_threshold": 8, "frame_skip": 2}'
```

---

## Alert Payload (sent to Node.js backend)

```json
{
  "type": "CCTV_ALERT",
  "subtype": "crowd",
  "camera_id": "CAM_01",
  "location": { "lat": 26.1445, "lng": 91.7362 },
  "timestamp": "2025-08-15T14:30:00.000000+00:00",
  "metadata": {
    "person_count": 7
  }
}
```

| `subtype`    | Trigger condition                                    |
|--------------|------------------------------------------------------|
| `crowd`      | ≥ N persons in a single frame                        |
| `fight`      | ≥ N persons within proximity_px of each other        |
| `suspicious` | (extend via custom detector modules)                 |

---

## Performance Tips

| Goal               | Setting                                      |
|--------------------|----------------------------------------------|
| Faster on CPU      | Increase `FRAME_SKIP` (3–5)                  |
| More accuracy      | Lower `CONFIDENCE_THRESHOLD` (0.35)          |
| Less alert spam    | Increase `ALERT_COOLDOWN_SECONDS` (30–60)    |
| GPU acceleration   | Install `torch` with CUDA — auto-detected    |
| Multiple cameras   | Run one instance per camera with unique IDs  |

---

## Integrating with the Node.js Backend

The service targets `POST /api/cctv-alert` on your Express/Fastify backend.  
All you need to handle:

```js
// Express route
app.post('/api/cctv-alert', (req, res) => {
  const { type, subtype, camera_id, location, timestamp, metadata } = req.body;
  // store in DB, emit via Socket.io, trigger notifications …
  res.json({ received: true });
});
```

---

## Detected Classes (COCO)

The service currently tracks:
- **person** — crowd + fight analysis
- **car** — vehicle monitoring (extendable)
- **motorcycle / bicycle** — two-wheeler monitoring

---

*Built for SurakshaNet Hackathon — Real-Time National Safety Monitoring System*