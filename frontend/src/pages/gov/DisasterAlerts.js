import { useEffect, useState } from 'react';
import { GovLayout } from '@/components/GovLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { CloudLightning, MapPin, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DisasterAlerts = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responderName, setResponderName] = useState('');

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents({ type: 'DISASTER' });
      setIncidents(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching disaster alerts:', error);
      toast.error('Failed to load disaster alerts');
    }
  };

  const handleRespond = async (incidentId) => {
    if (!responderName.trim()) {
      toast.error('Please enter responder name');
      return;
    }

    try {
      await api.respondToIncident(incidentId, {
        responderId: `RESP-${Date.now()}`,
        responderName: responderName
      });
      toast.success('Response team assigned successfully');
      fetchIncidents();
    } catch (error) {
      console.error('Error responding to incident:', error);
      toast.error('Failed to assign response team');
    }
  };

  const handleResolve = async (incidentId) => {
    try {
      await api.resolveIncident(incidentId);
      toast.success('Incident marked as resolved');
      fetchIncidents();
    } catch (error) {
      console.error('Error resolving incident:', error);
      toast.error('Failed to resolve incident');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'ACCEPTED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'RESOLVED': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <GovLayout>
      <div className="p-6 space-y-6" data-testid="disaster-alerts-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">DISASTER ALERTS</h1>
            <p className="text-[#94A3B8] mt-1">Natural Disaster & Emergency Warnings</p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="text"
              placeholder="Responder Name"
              value={responderName}
              onChange={(e) => setResponderName(e.target.value)}
              className="bg-[#1E293B] border-[#334155] text-white"
              data-testid="responder-name-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Total Disasters</p>
            <p className="text-3xl font-bold text-white mt-2">{incidents.length}</p>
          </div>
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Pending</p>
            <p className="text-3xl font-bold text-[#DC2626] mt-2">
              {incidents.filter(i => i.status === 'PENDING').length}
            </p>
          </div>
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Resolved</p>
            <p className="text-3xl font-bold text-[#059669] mt-2">
              {incidents.filter(i => i.status === 'RESOLVED').length}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-[#94A3B8]">Loading disaster alerts...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-12 text-center">
              <CloudLightning className="w-12 h-12 mx-auto mb-3 text-[#94A3B8] opacity-50" />
              <p className="text-[#94A3B8]">No disaster alerts at this time</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 hover:border-[#475569] transition-colors"
                data-testid={`disaster-incident-${incident.id}`}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <CloudLightning className="w-5 h-5 text-[#2563EB]" />
                      <span className={`px-3 py-1 rounded border text-xs font-bold uppercase ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getSeverityColor(incident.severity)}`}></div>
                        <span className="text-white text-sm font-bold">{incident.severity}</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3">{incident.description}</h3>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#94A3B8] mt-0.5" />
                        <div>
                          <p className="text-[#94A3B8]">Affected Area</p>
                          <p className="text-white font-medium">
                            {incident.location.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#94A3B8] mt-0.5" />
                        <div>
                          <p className="text-[#94A3B8]">Alert Time</p>
                          <p className="text-white font-medium mono">
                            {format(new Date(incident.timestamp), 'dd MMM yyyy HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CloudLightning className="w-4 h-4 text-[#94A3B8] mt-0.5" />
                        <div>
                          <p className="text-[#94A3B8]">Alert System</p>
                          <p className="text-white font-medium">{incident.reportedBy || 'DISASTER_MONITORING_SYSTEM'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CloudLightning className="w-4 h-4 text-[#94A3B8] mt-0.5" />
                        <div>
                          <p className="text-[#94A3B8]">Incident ID</p>
                          <p className="text-white font-medium mono text-xs">{incident.id}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {incident.status === 'PENDING' && (
                      <Button
                        onClick={() => handleRespond(incident.id)}
                        className="bg-[#059669] hover:bg-[#047857] text-white"
                        data-testid={`respond-btn-${incident.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept & Respond
                      </Button>
                    )}
                    {incident.status === 'ACCEPTED' && (
                      <Button
                        onClick={() => handleResolve(incident.id)}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                        data-testid={`resolve-btn-${incident.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Resolved
                      </Button>
                    )}
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

export default DisasterAlerts;
