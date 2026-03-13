import { useEffect, useState } from 'react';
import { CitizenLayout } from '@/components/CitizenLayout';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Shield, AlertTriangle, Camera, CloudLightning } from 'lucide-react';
import { format } from 'date-fns';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const SafetyMap = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  
  const defaultCenter = [26.1445, 91.7362];

  useEffect(() => {
    fetchIncidents();
    getUserLocation();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents({ limit: 100 });
      setIncidents(data.filter(i => i.status !== 'RESOLVED'));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      toast.error('Failed to load map data');
    }
  };

  const getMarkerColor = (incident) => {
    if (incident.type === 'CCTV') return '#DC2626';
    if (incident.type === 'SOS') return '#D97706';
    if (incident.type === 'DISASTER') return '#2563EB';
    return '#059669';
  };

  const mapCenter = userLocation || defaultCenter;

  return (
    <CitizenLayout>
      <div className="h-[calc(100vh-140px)] flex flex-col" data-testid="safety-map-page">
        <div className="p-4 bg-white border-b border-[#CBD5E1]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#059669]" />
              <div>
                <h2 className="font-bold text-[#0F172A]">Safety Map</h2>
                <p className="text-xs text-[#64748B]">Live incident tracking</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#64748B]">Active Alerts</p>
              <p className="text-lg font-bold text-[#DC2626]">{incidents.length}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-[#F1F5F9]">
              <p className="text-[#64748B]">Loading map...</p>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {userLocation && (
                <Marker
                  position={[userLocation.lat, userLocation.lng]}
                  icon={createCustomIcon('#059669')}
                >
                  <Popup>
                    <div className="p-2">
                      <p className="font-bold text-green-600">Your Location</p>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {incidents.map((incident) => (
                <Marker
                  key={incident.id}
                  position={[incident.location.lat, incident.location.lng]}
                  icon={createCustomIcon(getMarkerColor(incident))}
                >
                  <Popup>
                    <div className="p-2" style={{ minWidth: '200px' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded text-xs font-bold" style={{
                          background: getMarkerColor(incident) + '33',
                          color: getMarkerColor(incident)
                        }}>
                          {incident.type}
                        </span>
                      </div>
                      <h3 className="font-bold mb-1">{incident.description}</h3>
                      <p className="text-xs text-gray-600 mb-1">
                        {incident.location.address}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(incident.timestamp), 'dd MMM, HH:mm')}
                      </p>
                    </div>
                  </Popup>
                  
                  {incident.severity === 'CRITICAL' && (
                    <Circle
                      center={[incident.location.lat, incident.location.lng]}
                      radius={150}
                      pathOptions={{
                        fillColor: getMarkerColor(incident),
                        fillOpacity: 0.1,
                        color: getMarkerColor(incident),
                        weight: 1,
                        opacity: 0.4
                      }}
                    />
                  )}
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="p-3 bg-white border-t border-[#CBD5E1]">
          <div className="flex items-center justify-around text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#059669] rounded-full"></div>
              <span className="text-[#64748B]">You</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#DC2626] rounded-full"></div>
              <span className="text-[#64748B]">CCTV</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#D97706] rounded-full"></div>
              <span className="text-[#64748B]">SOS</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#2563EB] rounded-full"></div>
              <span className="text-[#64748B]">Disaster</span>
            </div>
          </div>
        </div>
      </div>
    </CitizenLayout>
  );
};

export default SafetyMap;
