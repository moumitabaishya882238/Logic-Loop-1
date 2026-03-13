import { useEffect, useState, useRef } from 'react';
import { GovLayout } from '@/components/GovLayout';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle, Camera, CloudLightning } from 'lucide-react';
import { format } from 'date-fns';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const LiveMap = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef();
  
  const defaultCenter = [26.1445, 91.7362];

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents({ limit: 100 });
      setIncidents(data.filter(i => i.status !== 'RESOLVED'));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      toast.error('Failed to load incidents');
    }
  };

  const getMarkerColor = (incident) => {
    if (incident.type === 'CCTV') return '#DC2626';
    if (incident.type === 'SOS') return '#D97706';
    if (incident.type === 'DISASTER') return '#2563EB';
    return '#059669';
  };

  return (
    <GovLayout>
      <div className="h-full flex flex-col" data-testid="live-map-page">
        <div className="p-6 border-b border-[#334155]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">LIVE MAP</h1>
              <p className="text-[#94A3B8] mt-1">Real-time Incident Location Tracking</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#DC2626] rounded-full"></div>
                <span className="text-[#94A3B8] text-sm">CCTV</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#D97706] rounded-full"></div>
                <span className="text-[#94A3B8] text-sm">SOS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#2563EB] rounded-full"></div>
                <span className="text-[#94A3B8] text-sm">Disaster</span>
              </div>
              <div className="px-3 py-1 bg-[#1E293B] border border-[#334155] rounded-lg mono text-sm text-white">
                {incidents.length} Active
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 relative" data-testid="map-container">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-[#1E293B]">
              <p className="text-[#94A3B8]">Loading map...</p>
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {incidents.map((incident) => (
                <Marker
                  key={incident.id}
                  position={[incident.location.lat, incident.location.lng]}
                  icon={createCustomIcon(getMarkerColor(incident))}
                >
                  <Popup>
                    <div className="p-2" style={{ minWidth: '250px' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded text-xs font-bold" style={{
                          background: getMarkerColor(incident) + '33',
                          color: getMarkerColor(incident)
                        }}>
                          {incident.type}
                        </span>
                        <span className="text-xs font-bold" style={{ color: getMarkerColor(incident) }}>
                          {incident.severity}
                        </span>
                      </div>
                      <h3 className="font-bold mb-1">{incident.description}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {incident.location.address || `${incident.location.lat}, ${incident.location.lng}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(incident.timestamp), 'dd MMM yyyy HH:mm:ss')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">ID: {incident.id.slice(0, 8)}</p>
                    </div>
                  </Popup>
                  
                  {incident.severity === 'CRITICAL' && (
                    <Circle
                      center={[incident.location.lat, incident.location.lng]}
                      radius={200}
                      pathOptions={{
                        fillColor: getMarkerColor(incident),
                        fillOpacity: 0.1,
                        color: getMarkerColor(incident),
                        weight: 2,
                        opacity: 0.5
                      }}
                    />
                  )}
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </GovLayout>
  );
};

export default LiveMap;
