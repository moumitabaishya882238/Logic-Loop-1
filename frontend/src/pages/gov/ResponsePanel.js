import { useEffect, useState } from 'react';
import { GovLayout } from '@/components/GovLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Users, Activity, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const ResponsePanel = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      const allIncidents = await api.getIncidents({ limit: 100 });
      const accepted = allIncidents.filter(i => i.status === 'ACCEPTED');
      setIncidents(accepted);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching response data:', error);
      toast.error('Failed to load response data');
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'SOS': return 'bg-orange-500/20 text-orange-400';
      case 'CCTV': return 'bg-red-500/20 text-red-400';
      case 'DISASTER': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-500';
      case 'HIGH': return 'text-orange-500';
      case 'MEDIUM': return 'text-yellow-500';
      case 'LOW': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <GovLayout>
      <div className="p-6 space-y-6" data-testid="response-panel-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">RESPONSE PANEL</h1>
            <p className="text-[#94A3B8] mt-1">Active Response Operations</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg">
            <Activity className="w-5 h-5 text-[#059669] animate-pulse" />
            <span className="text-white font-bold">{incidents.length} Active Operations</span>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-[#94A3B8]">Loading response operations...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-[#94A3B8] opacity-50" />
              <p className="text-[#94A3B8]">No active response operations</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 hover:border-[#475569] transition-colors"
                data-testid={`response-operation-${incident.id}`}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold uppercase">
                        IN PROGRESS
                      </span>
                      <span className={`px-3 py-1 rounded text-xs font-bold ${getTypeColor(incident.type)}`}>
                        {incident.type}
                      </span>
                      <span className={`text-sm font-bold ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3">{incident.description}</h3>

                    <div className="grid grid-cols-3 gap-6 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#94A3B8] mt-0.5" />
                        <div>
                          <p className="text-[#94A3B8]">Location</p>
                          <p className="text-white font-medium">
                            {incident.location.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#94A3B8] mt-0.5" />
                        <div>
                          <p className="text-[#94A3B8]">Response Started</p>
                          <p className="text-white font-medium mono">
                            {incident.responseTime 
                              ? format(new Date(incident.responseTime), 'HH:mm:ss')
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-[#94A3B8] mt-0.5" />
                        <div>
                          <p className="text-[#94A3B8]">Responder ID</p>
                          <p className="text-white font-medium mono text-xs">
                            {incident.responderId || 'Not assigned'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mt-6 pt-6 border-t border-[#334155]">
                      <p className="text-[#94A3B8] text-xs uppercase mb-3">Operation Timeline</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-[#059669] rounded-full"></div>
                          <p className="text-sm text-white">
                            Incident Reported: {format(new Date(incident.timestamp), 'HH:mm:ss')}
                          </p>
                        </div>
                        {incident.responseTime && (
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            <p className="text-sm text-white">
                              Response Team Dispatched: {format(new Date(incident.responseTime), 'HH:mm:ss')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </GovLayout>
  );
};

export default ResponsePanel;
