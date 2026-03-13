"""AI CCTV Detection Service - Simulates AI video analysis and sends alerts"""
import asyncio
import random
from datetime import datetime
import httpx
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Backend API URL
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8001')
API_URL = f"{BACKEND_URL}/api"

# Simulated CCTV locations across the city
CCTV_LOCATIONS = [
    {"lat": 26.1445, "lng": 91.7362, "address": "Fancy Bazaar, Guwahati"},
    {"lat": 26.1844, "lng": 91.7458, "address": "Paltan Bazaar, Guwahati"},
    {"lat": 26.1758, "lng": 91.7630, "address": "Ganeshguri, Guwahati"},
    {"lat": 26.1409, "lng": 91.7810, "address": "Bharalumukh, Guwahati"},
    {"lat": 26.1916, "lng": 91.7501, "address": "Ulubari, Guwahati"},
]

# Detection types
DETECTION_TYPES = [
    {"desc": "Fight detected between two individuals", "severity": "HIGH"},
    {"desc": "Suspicious crowd gathering detected", "severity": "MEDIUM"},
    {"desc": "Vehicle accident detected", "severity": "CRITICAL"},
    {"desc": "Unattended object detected", "severity": "HIGH"},
    {"desc": "Fire/Smoke detected", "severity": "CRITICAL"},
    {"desc": "Person fallen on ground detected", "severity": "HIGH"},
]

async def detect_and_alert():
    """Simulate AI detection and send alert to backend"""
    while True:
        try:
            # Wait random interval between 10-30 seconds
            await asyncio.sleep(random.randint(10, 30))
            
            # Random detection
            location = random.choice(CCTV_LOCATIONS)
            detection = random.choice(DETECTION_TYPES)
            
            incident_data = {
                "type": "CCTV",
                "location": location,
                "description": detection["desc"],
                "severity": detection["severity"],
                "reportedBy": "AI_CCTV_SYSTEM"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_URL}/incidents/cctv",
                    json=incident_data,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"[{datetime.now()}] CCTV Alert sent: {detection['desc']} at {location['address']}")
                    print(f"Incident ID: {result['id']}")
                else:
                    print(f"Failed to send alert: {response.status_code}")
                    
        except Exception as e:
            print(f"Error in detection loop: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    print("AI CCTV Detection Service Started")
    print(f"Monitoring {len(CCTV_LOCATIONS)} CCTV cameras...")
    print(f"Sending alerts to: {API_URL}")
    asyncio.run(detect_and_alert())