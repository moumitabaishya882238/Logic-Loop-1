import { useEffect, useState } from 'react';
import { CitizenLayout } from '@/components/CitizenLayout';
import { MapPin, Clock, AlertTriangle, Camera, CloudLightning } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

const NearbyAlerts = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents({ limit: 50 });
      const activeIncidents = data.filter(i => i.status !== 'RESOLVED');
      setIncidents(activeIncidents);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching nearby alerts:', error);
      toast.error('Failed to load nearby alerts');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'SOS': return <AlertTriangle className="w-5 h-5" />;
      case 'CCTV': return <Camera className="w-5 h-5" />;
      case 'DISASTER': return <CloudLightning className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'SOS': return 'bg-orange-500';
      case 'CCTV': return 'bg-red-500';
      case 'DISASTER': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[severity] || colors.MEDIUM;
  };

  return (
    <CitizenLayout>
      <div className="p-6 space-y-6" data-testid="nearby-alerts-page">
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-8 h-8 text-[#DC2626]" />
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A]">Nearby Alerts</h2>
            <p className="text-sm text-[#64748B]">Stay informed about incidents in your area</p>
          </div>
        </div>

        <div className="bg-[#F1F5F9] rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#0F172A]">Active Alerts</p>
            <p className="text-2xl font-bold text-[#DC2626]">{incidents.length}</p>
          </div>
          <div className="w-12 h-12 bg-[#DC2626] rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-[#64748B]">Loading alerts...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="bg-white border border-[#CBD5E1] rounded-lg p-12 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-[#CBD5E1]" />
              <p className="text-[#64748B]">No active alerts in your area</p>
              <p className="text-sm text-[#94A3B8] mt-2">You're all safe for now!</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-white border border-[#CBD5E1] rounded-lg p-4 hover:shadow-md transition-shadow"
                data-testid={`nearby-incident-${incident.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${getTypeColor(incident.type)} rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                    {getTypeIcon(incident.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#64748B] uppercase">{incident.type}</span>
                      <span className={`px-2 py-0.5 rounded border text-xs font-medium ${getSeverityBadge(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <h3 className="font-bold text-[#0F172A] mb-2">{incident.description}</h3>
                    <div className="space-y-1 text-sm text-[#64748B]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{incident.location.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(incident.timestamp), 'dd MMM yyyy, HH:mm')}</span>
                      </div>
                    </div>
                    {incident.status === 'ACCEPTED' && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded px-3 py-2">
                        <p className="text-xs text-green-800 font-medium">✓ Response team dispatched</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </CitizenLayout>
  );
};

export default NearbyAlerts;
