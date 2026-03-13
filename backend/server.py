from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get('DB_NAME', 'SurakshaNet')
db = client[db_name]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class IncidentType(str, Enum):
    SOS = "SOS"
    CCTV = "CCTV"
    DISASTER = "DISASTER"

class IncidentStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    RESOLVED = "RESOLVED"

class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

# Models
class Location(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None

class IncidentCreate(BaseModel):
    type: IncidentType
    location: Location
    description: str
    severity: Severity = Severity.MEDIUM
    reportedBy: Optional[str] = None

class Incident(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: IncidentType
    status: IncidentStatus = IncidentStatus.PENDING
    location: Location
    description: str
    severity: Severity
    reportedBy: Optional[str] = None
    responderId: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    responseTime: Optional[datetime] = None

class RespondToIncident(BaseModel):
    responderId: str
    responderName: str

class IncidentStats(BaseModel):
    total: int
    active: int
    resolved: int
    byType: dict
    bySeverity: dict

# Routes
@api_router.get("/")
async def root():
    return {"message": "SurakshaNet API Server", "status": "active"}

@api_router.post("/incidents/sos", response_model=Incident)
async def create_sos_incident(input: IncidentCreate):
    """Create SOS incident from citizen app"""
    incident_data = input.model_dump()
    incident_data['type'] = IncidentType.SOS
    incident_obj = Incident(**incident_data)
    
    doc = incident_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.incidents.insert_one(doc)
    return incident_obj

@api_router.post("/incidents/cctv", response_model=Incident)
async def create_cctv_incident(input: IncidentCreate):
    """Create CCTV incident from AI detection service"""
    incident_data = input.model_dump()
    incident_data['type'] = IncidentType.CCTV
    incident_data['reportedBy'] = 'AI_CCTV_SYSTEM'
    incident_obj = Incident(**incident_data)
    
    doc = incident_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.incidents.insert_one(doc)
    return incident_obj

@api_router.post("/incidents/disaster", response_model=Incident)
async def create_disaster_incident(input: IncidentCreate):
    """Create disaster warning incident"""
    incident_data = input.model_dump()
    incident_data['type'] = IncidentType.DISASTER
    incident_data['reportedBy'] = 'DISASTER_MONITORING_SYSTEM'
    incident_obj = Incident(**incident_data)
    
    doc = incident_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.incidents.insert_one(doc)
    return incident_obj

@api_router.get("/incidents", response_model=List[Incident])
async def get_incidents(
    type: Optional[IncidentType] = None,
    status: Optional[IncidentStatus] = None,
    limit: int = 100
):
    """Get incidents with optional filters"""
    query = {}
    if type:
        query['type'] = type
    if status:
        query['status'] = status
    
    incidents = await db.incidents.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for incident in incidents:
        if isinstance(incident['timestamp'], str):
            incident['timestamp'] = datetime.fromisoformat(incident['timestamp'])
        if incident.get('responseTime') and isinstance(incident['responseTime'], str):
            incident['responseTime'] = datetime.fromisoformat(incident['responseTime'])
    
    return incidents

@api_router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str):
    """Get specific incident by ID"""
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if isinstance(incident['timestamp'], str):
        incident['timestamp'] = datetime.fromisoformat(incident['timestamp'])
    if incident.get('responseTime') and isinstance(incident['responseTime'], str):
        incident['responseTime'] = datetime.fromisoformat(incident['responseTime'])
    
    return incident

@api_router.patch("/incidents/{incident_id}/respond", response_model=Incident)
async def respond_to_incident(incident_id: str, response: RespondToIncident):
    """Assign responder to incident"""
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    update_data = {
        "status": IncidentStatus.ACCEPTED,
        "responderId": response.responderId,
        "responseTime": datetime.now(timezone.utc).isoformat()
    }
    
    await db.incidents.update_one(
        {"id": incident_id},
        {"$set": update_data}
    )
    
    updated_incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    
    if isinstance(updated_incident['timestamp'], str):
        updated_incident['timestamp'] = datetime.fromisoformat(updated_incident['timestamp'])
    if updated_incident.get('responseTime') and isinstance(updated_incident['responseTime'], str):
        updated_incident['responseTime'] = datetime.fromisoformat(updated_incident['responseTime'])
    
    return updated_incident

@api_router.patch("/incidents/{incident_id}/resolve", response_model=Incident)
async def resolve_incident(incident_id: str):
    """Mark incident as resolved"""
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    await db.incidents.update_one(
        {"id": incident_id},
        {"$set": {"status": IncidentStatus.RESOLVED}}
    )
    
    updated_incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    
    if isinstance(updated_incident['timestamp'], str):
        updated_incident['timestamp'] = datetime.fromisoformat(updated_incident['timestamp'])
    if updated_incident.get('responseTime') and isinstance(updated_incident['responseTime'], str):
        updated_incident['responseTime'] = datetime.fromisoformat(updated_incident['responseTime'])
    
    return updated_incident

@api_router.get("/incidents/stats/summary", response_model=IncidentStats)
async def get_incident_stats():
    """Get incident statistics for dashboard"""
    all_incidents = await db.incidents.find({}, {"_id": 0}).to_list(1000)
    
    total = len(all_incidents)
    active = len([i for i in all_incidents if i['status'] in ['PENDING', 'ACCEPTED']])
    resolved = len([i for i in all_incidents if i['status'] == 'RESOLVED'])
    
    by_type = {}
    for incident_type in IncidentType:
        by_type[incident_type.value] = len([i for i in all_incidents if i['type'] == incident_type.value])
    
    by_severity = {}
    for severity in Severity:
        by_severity[severity.value] = len([i for i in all_incidents if i['severity'] == severity.value])
    
    return IncidentStats(
        total=total,
        active=active,
        resolved=resolved,
        byType=by_type,
        bySeverity=by_severity
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_db_check():
    await client.admin.command("ping")
    logger.info("Connected to MongoDB database: %s", db_name)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()