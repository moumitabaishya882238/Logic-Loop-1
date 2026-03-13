# SurakshaNet - Smart National Safety & Emergency Response System

A comprehensive hackathon project connecting citizens, AI monitoring systems, and government authorities for real-time emergency response.

## 🎯 Project Overview

SurakshaNet is a multi-component safety ecosystem:
- **Citizens**: Report emergencies via mobile app
- **AI Systems**: Detect incidents through CCTV analysis  
- **Authorities**: Monitor & respond via government dashboard
- **NGOs/Responders**: Accept & dispatch help

## 🏗️ System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Citizen App   │────▶│ Backend API     │◀────│  Gov Dashboard   │
│ (React Native)  │     │ (Node + Express)│     │   (React Web)    │
└─────────────────┘     └─────────────────┘     └──────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │    MongoDB      │
                        └─────────────────┘
                               ▲
                               │
                        ┌─────────────────┐
                        │  AI CCTV Service│
                        │    (FastAPI)    │
                        └─────────────────┘
```

## 📁 Project Structure

```
/app/
├── backend/                    # Incident Engine + CCTV Service
│   ├── server.js              # Main Express API endpoints
│   ├── cctv_service.py        # FastAPI CCTV forwarding service
│   ├── server.py              # Legacy FastAPI backend (not primary)
│   ├── package.json
│   └── requirements.txt
│
├── frontend/                   # Government Web Dashboard (React)
│   ├── src/pages/gov/         # Dashboard, Live Map, Alerts
│   ├── src/components/        # Reusable UI components
│   └── src/lib/api.js         # API service
│
└── citizen-mobile-app/        # Citizen Mobile App (React Native)
    ├── src/screens/           # Home, Report, Nearby, Map
    ├── src/services/api.js    # Backend communication
    └── src/utils/location.js  # GPS utilities
```

## 🚀 Getting Started

### One-Command Dev (Backend + Web)
```bash
cd /app
npm install
npm run dev
# Backend: http://localhost:8001/api/
# Web: http://localhost:3000/gov/dashboard
```

### One-Command Dev (Backend + Web + CCTV FastAPI)
```bash
cd /app
npm run dev:all
```

### Backend Setup (Express)
```bash
cd /app/backend
npm install
npm run dev
```

### CCTV Service Setup (FastAPI)
```bash
cd /app/backend
python -m venv .venv
source .venv/Scripts/activate   # Git Bash on Windows
pip install -r requirements.txt
uvicorn cctv_service:app --host 0.0.0.0 --port 8002 --reload
```

### Government Dashboard (Web)
```bash
cd /app/frontend
yarn install
yarn start
# Access at: http://localhost:3000/gov/dashboard
```

### Citizen Mobile App (React Native)
```bash
cd /app/citizen-mobile-app
yarn install
npx react-native run-android  # or run-ios
```

## 📱 Features

### Government Dashboard
✅ Real-time incident monitoring  
✅ Interactive live map with markers  
✅ SOS, CCTV & Disaster alert pages  
✅ Response team management  
✅ Statistics dashboard

### Citizen Mobile App
✅ Emergency SOS button with GPS  
✅ Incident reporting form  
✅ Nearby alerts feed  
✅ Safety map view  
✅ Emergency contact quick dial

### Backend API
✅ Incident CRUD operations  
✅ Real-time statistics  
✅ Response assignment  
✅ MongoDB integration

## 🔌 API Endpoints

- `POST /api/incidents/sos` - Create SOS alert
- `POST /api/incidents/cctv` - Create CCTV detection  
- `POST /api/incidents/disaster` - Create disaster alert
- `GET /api/incidents` - Fetch all incidents
- `PATCH /api/incidents/{id}/respond` - Assign responder
- `PATCH /api/incidents/{id}/resolve` - Mark resolved
- `GET /api/incidents/stats/summary` - Get statistics

## 🎨 Tech Stack

**Frontend**: React 19, Tailwind CSS, Leaflet Maps, Shadcn/UI  
**Mobile**: React Native 0.73, React Navigation, React Native Maps  
**Backend**: Node.js, Express, MongoDB Driver  
**CCTV Service**: FastAPI, httpx  
**Database**: MongoDB

## 🎓 Hackathon Team

- **Moumita Baishya** - Government Dashboard  
- **Amlandwip Das** - Incident Management  
- **Sahid Ahmed** - Citizen Mobile App  
- **Harish Gohain** - AI CCTV Detection

---

**Built with ❤️ for community safety**
