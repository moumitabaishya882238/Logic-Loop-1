import { useEffect, useState, useRef } from 'react';
import { GovLayout } from '@/components/GovLayout';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plane, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color, svgContent) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"><div style="color:white; display:flex; align-items:center; justify-content:center; width:20px; height:20px;">${svgContent}</div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const DroneSimulation = () => {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dronePosition, setDronePosition] = useState(null);
  const [progress, setProgress] = useState(0); // 0 to 1
  const mapRef = useRef();
  
  // Guwahati Dispur Headquarters
  const HQ_LOCATION = [26.1433, 91.7898]; 

  useEffect(() => {
    fetchIncidentDetails();
  }, [incidentId]);

  useEffect(() => {
    if (!incident || !incident.location) return;

    // Start simulation animation loop
    const targetLocation = [incident.location.lat, incident.location.lng];
    let startTime = null;
    const durationMs = 15000; // Drone flight takes 15 seconds

    const animateDrone = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      const currentProgress = Math.min(elapsedTime / durationMs, 1);
      
      setProgress(currentProgress);

      const currentLat = HQ_LOCATION[0] + (targetLocation[0] - HQ_LOCATION[0]) * currentProgress;
      const currentLng = HQ_LOCATION[1] + (targetLocation[1] - HQ_LOCATION[1]) * currentProgress;
      
      setDronePosition([currentLat, currentLng]);

      if (currentProgress < 1) {
        requestAnimationFrame(animateDrone);
      } else {
        toast.success("Drone has arrived at the incident location!");
      }
    };

    const animationId = requestAnimationFrame(animateDrone);
    return () => cancelAnimationFrame(animationId);
  }, [incident]);

  const fetchIncidentDetails = async () => {
    try {
      // In a real app we would use an endpoint to get a single incident.
      // Since SurakshaNet doesn't export a getIncidentById, we'll fetch all and filter.
      const data = await api.getIncidents({ limit: 1000 });
      const found = data.find(i => i.id === incidentId);
      if (found && found.location && found.location.lat && found.location.lng) {
        setIncident(found);
      } else {
        toast.error('Incident location not found for Drone dispatch.');
      }
    } catch (error) {
      console.error('Error fetching incident:', error);
      toast.error('Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (pos1, pos2) => {
    // Simple rough distance calculation for UI purposes (Euclidean * factor)
    const latDiff = pos1[0] - pos2[0];
    const lngDiff = pos1[1] - pos2[1];
    const distanceDeg = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    return (distanceDeg * 111).toFixed(1); // Rough mapping of degrees to km
  };

  if (loading) {
    return (
      <GovLayout>
        <div className="flex items-center justify-center h-full bg-[#0F172A]">
          <p className="text-[#94A3B8]">Loading Drone Simulation...</p>
        </div>
      </GovLayout>
    );
  }

  if (!incident) {
    return (
      <GovLayout>
        <div className="flex items-center justify-center h-full bg-[#0F172A]">
          <div className="text-center">
             <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
             <h2 className="text-xl text-white font-bold mb-2">Simulation Failed</h2>
             <p className="text-[#94A3B8] mb-6">Could not load location coordinates for this incident.</p>
             <Button onClick={() => navigate(-1)} className="bg-[#1E293B]">Go Back</Button>
          </div>
        </div>
      </GovLayout>
    );
  }

  const targetLocation = [incident.location.lat, incident.location.lng];
  const bounds = L.latLngBounds([HQ_LOCATION, targetLocation]).pad(0.2);

  const hqIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
  const targetIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  const droneIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L3 8l6 3.5L7 15l-3.5-.5L2 16l4 3.5.5 3.5 1.5-1.5-.5-3.5L11 15l5.5 6 1.2-.7c.4-.2.7-.6.6-1.1z"></path></svg>`;

  return (
    <GovLayout>
      <div className="h-full flex flex-col relative" data-testid="drone-simulation-page">
        {/* Telemetry Overlay Panel */}
        <div className="absolute top-6 left-6 z-[1000] bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl p-5 w-[380px]">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-[#334155] rounded-full text-[#94A3B8] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plane className="w-5 h-5 text-[#38BDF8]" />
                Drone Telemetry
              </h2>
              <p className="text-[#94A3B8] text-sm">Unit: DRN-X900 Alpha</p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center bg-[#0F172A] p-3 rounded-lg border border-[#334155]">
                <span className="text-[#94A3B8] text-sm font-semibold uppercase">Status</span>
                <span className="text-[#34D399] font-bold">
                  {progress < 1 ? 'EN ROUTE' : 'AT DESTINATION'}
                </span>
             </div>

             <div className="flex justify-between items-center bg-[#0F172A] p-3 rounded-lg border border-[#334155]">
                <span className="text-[#94A3B8] text-sm font-semibold uppercase">Est. Distance</span>
                <span className="text-white font-bold mono">
                  {dronePosition ? calculateDistance(dronePosition, targetLocation) : '--'} km
                </span>
             </div>

             <div className="bg-[#0F172A] p-4 rounded-lg border border-[#334155]">
                <div className="flex justify-between text-xs text-[#94A3B8] mb-2 font-semibold">
                  <span>DISPUR HQ</span>
                  <span>INCIDENT ZONE</span>
                </div>
                <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-[#38BDF8] rounded-full transition-all duration-300 ease-linear"
                     style={{ width: `${Math.max(progress * 100, 2)}%` }}
                   />
                </div>
             </div>

             <div className="mt-4 pt-4 border-t border-[#334155]">
                <p className="text-[#94A3B8] text-xs uppercase font-semibold mb-2">Target Coordinates</p>
                <p className="text-white mono text-sm">{targetLocation[0].toFixed(5)}, {targetLocation[1].toFixed(5)}</p>
             </div>
          </div>
        </div>

        {/* Map Rendering Floor */}
        <div className="flex-1 relative bg-[#0F172A]" data-testid="drone-map-container" style={{ filter: 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' }}>
          <MapContainer
            bounds={bounds}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', backgroundColor: 'transparent' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Mission Path */}
            <Polyline 
              positions={[HQ_LOCATION, targetLocation]}
              pathOptions={{ color: '#38BDF8', weight: 4, opacity: 0.6, dashArray: '10, 10' }}
            />

            {/* HQ Marker */}
            <Marker position={HQ_LOCATION} icon={createCustomIcon('#1E293B', hqIconSvg)}>
              <Popup><div className="font-bold">Govt Headquarters<br/>Dispur</div></Popup>
            </Marker>

            {/* Target Marker */}
            <Marker position={targetLocation} icon={createCustomIcon('#DC2626', targetIconSvg)}>
              <Popup>
                <div className="font-bold text-red-600 mb-1">Emergency Zone</div>
                <div className="text-sm">{incident.description}</div>
              </Popup>
            </Marker>

            {/* Drone Marker */}
            {dronePosition && (
              <Marker position={dronePosition} icon={createCustomIcon('#38BDF8', droneIconSvg)}>
                <Popup>Drone DRN-X900</Popup>
              </Marker>
            )}

          </MapContainer>
        </div>
      </div>
    </GovLayout>
  );
};

export default DroneSimulation;
