from datetime import datetime
from pathlib import Path
import os
import random

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8001")

app = FastAPI(title="SurakshaNet CCTV FastAPI Service")


class CCTVAlertRequest(BaseModel):
    description: str
    severity: str = "HIGH"
    lat: float
    lng: float
    address: str | None = None


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "cctv-fastapi", "backend": BACKEND_URL}


@app.post("/detect/mock")
async def send_mock_detection(payload: CCTVAlertRequest):
    incident = {
        "type": "CCTV",
        "location": {
            "lat": payload.lat,
            "lng": payload.lng,
            "address": payload.address,
        },
        "description": payload.description,
        "severity": payload.severity,
        "reportedBy": "AI_CCTV_FASTAPI",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(f"{BACKEND_URL}/api/incidents/cctv", json=incident)

    return {
        "forwarded": response.status_code == 200,
        "statusCode": response.status_code,
        "response": response.json(),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.post("/detect/random")
async def send_random_detection():
    locations = [
        {"lat": 26.1445, "lng": 91.7362, "address": "Fancy Bazaar, Guwahati"},
        {"lat": 26.1844, "lng": 91.7458, "address": "Paltan Bazaar, Guwahati"},
        {"lat": 26.1758, "lng": 91.7630, "address": "Ganeshguri, Guwahati"},
    ]
    detections = [
        {"description": "Fight detected between two individuals", "severity": "HIGH"},
        {"description": "Suspicious crowd gathering detected", "severity": "MEDIUM"},
        {"description": "Vehicle accident detected", "severity": "CRITICAL"},
    ]

    location = random.choice(locations)
    detection = random.choice(detections)

    payload = {
        "type": "CCTV",
        "location": location,
        "description": detection["description"],
        "severity": detection["severity"],
        "reportedBy": "AI_CCTV_FASTAPI",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(f"{BACKEND_URL}/api/incidents/cctv", json=payload)

    return {
        "forwarded": response.status_code == 200,
        "payload": payload,
        "backendResponse": response.json(),
    }
