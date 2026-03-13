import { useEffect, useState } from 'react';
import { GovLayout } from '@/components/GovLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle, MapPin, Clock, User, CheckCircle, Mic, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SOSAlerts = () => {
  const [incidents, setIncidents] = useState([]);
  const [ngoPartners, setNgoPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responderName, setResponderName] = useState('');
  const [responderType, setResponderType] = useState('GOVERNMENT');
  const [ngoPartner, setNgoPartner] = useState('');

  useEffect(() => {
    fetchIncidents();
    fetchNgoPartners();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchNgoPartners = async () => {
    try {
      const data = await api.getNGOPartners();
      setNgoPartners(data);
      if (data.length > 0) {
        setNgoPartner((previous) => previous || data[0].name);
      }
    } catch (error) {
      console.error('Error fetching NGO partners:', error);
    }
  };

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents({ type: 'SOS' });
      setIncidents(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching SOS alerts:', error);
      toast.error('Failed to load SOS alerts');
    }
  };

  const handleRespond = async (incidentId) => {
    if (responderType !== 'DRONE' && !responderName.trim()) {
      toast.error('Please enter responder name');
      return;
    }

    if (responderType === 'NGO' && !ngoPartner.trim()) {
      toast.error('Please select NGO partner');
      return;
    }

    try {
      const payload = {
        responderId: `RESP-${Date.now()}`,
        responderType,
      };

      if (responderType === 'DRONE') {
        payload.responderName = 'Autonomous Drone Unit';
      } else {
        payload.responderName = responderName;
      }

      if (responderType === 'NGO') {
        payload.ngoPartner = ngoPartner;
      }

      await api.respondToIncident(incidentId, {
        ...payload,
      });
      const successLabel = responderType === 'DRONE' ? 'Drone dispatched' : 'Response team assigned';
      toast.success(`${successLabel} successfully`);
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

  const handleAutoAssignNearestNgo = async (incidentId) => {
    try {
      const updated = await api.autoAssignNearestNGO(incidentId);
      toast.success(
        `Nearest NGO assigned: ${updated.ngoPartner}${
          updated.ngoDistanceKm != null ? ` (${updated.ngoDistanceKm} km)` : ''
        }`
      );
      fetchIncidents();
    } catch (error) {
      console.error('Error auto-assigning nearest NGO:', error);
      toast.error(error?.response?.data?.error || 'Failed to auto assign nearest NGO');
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

  const getCoordinates = (incident) => {
    const lat = Number(incident?.location?.lat);
    const lng = Number(incident?.location?.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }
    return { lat, lng };
  };

  const getEmbedMapUrl = (lat, lng) =>
    `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;

  const getGoogleMapsLink = (lat, lng) =>
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <GovLayout>
      <div className="p-6 space-y-6" data-testid="sos-alerts-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">SOS ALERTS</h1>
            <p className="text-[#94A3B8] mt-1">Emergency Distress Calls from Citizens</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <select
              value={responderType}
              onChange={(e) => setResponderType(e.target.value)}
              className="bg-[#1E293B] border border-[#334155] text-white rounded-md px-3 py-2"
              data-testid="responder-type-select"
            >
              <option value="GOVERNMENT">Government Team</option>
              <option value="NGO">NGO Team</option>
              <option value="DRONE">Dispatch Drone</option>
            </select>

            {responderType === 'NGO' && (
              <select
                value={ngoPartner}
                onChange={(e) => setNgoPartner(e.target.value)}
                className="bg-[#1E293B] border border-[#334155] text-white rounded-md px-3 py-2 min-w-[230px]"
                data-testid="ngo-partner-select"
              >
                {ngoPartners.length === 0 ? (
                  <option value="">No approved NGO partners</option>
                ) : (
                  ngoPartners.map((partner) => (
                    <option key={partner.id} value={partner.name}>
                      {partner.name}
                    </option>
                  ))
                )}
              </select>
            )}

            {responderType !== 'DRONE' && (
              <Input
                type="text"
                placeholder={responderType === 'NGO' ? 'NGO Team Lead Name' : 'Responder Name'}
                value={responderName}
                onChange={(e) => setResponderName(e.target.value)}
                className="bg-[#1E293B] border-[#334155] text-white"
                data-testid="responder-name-input"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Total SOS</p>
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
              <p className="text-[#94A3B8]">Loading SOS alerts...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-[#94A3B8] opacity-50" />
              <p className="text-[#94A3B8]">No SOS alerts at this time</p>
            </div>
          ) : (
            incidents.map((incident) => {
              const coordinates = getCoordinates(incident);
              return (
              <div
                key={incident.id}
                className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 hover:border-[#475569] transition-colors"
                data-testid={`sos-incident-${incident.id}`}
              >
                <div className="flex flex-col xl:flex-row items-start gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
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
                          <p className="text-[#94A3B8]">Location</p>
                          <p className="text-white font-medium">
                            {incident.location.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#94A3B8] mt-0.5" />
                        <div>
                          <p className="text-[#94A3B8]">Reported At</p>
                          <p className="text-white font-medium mono">
                            {format(new Date(incident.timestamp), 'dd MMM yyyy HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                      {incident.reportedBy && (
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-[#94A3B8] mt-0.5" />
                          <div>
                            <p className="text-[#94A3B8]">Reported By</p>
                            <p className="text-white font-medium">{incident.reportedBy}</p>
                          </div>
                        </div>
                      )}
                      {incident.responderType && (
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-[#34D399] mt-0.5" />
                          <div>
                            <p className="text-[#94A3B8]">Assigned To</p>
                            <p className="text-white font-medium">
                              {incident.responderType === 'DRONE'
                                ? 'Drone Unit'
                                : incident.responderType === 'NGO'
                                  ? `NGO${incident.ngoPartner ? `: ${incident.ngoPartner}` : ''}`
                                  : 'Government Team'}
                            </p>
                            {incident.responderType === 'NGO' && incident.ngoDistanceKm != null ? (
                              <p className="text-xs text-[#94A3B8]">Nearest Distance: {incident.ngoDistanceKm} km</p>
                            ) : null}
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#94A3B8] mt-0.5" />
                        <div>
                          <p className="text-[#94A3B8]">Incident ID</p>
                          <p className="text-white font-medium mono text-xs">{incident.id}</p>
                        </div>
                      </div>
                    </div>

                    {incident.voiceNoteBase64 && (
                      <div className="mt-4 bg-[#0F172A] border border-[#334155] rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Mic className="w-4 h-4 text-[#38BDF8]" />
                          <p className="text-[#CBD5E1] text-sm font-semibold">Voice Note</p>
                          {incident.voiceDurationSeconds && (
                            <span className="text-xs text-[#94A3B8]">({incident.voiceDurationSeconds}s)</span>
                          )}
                        </div>
                        <audio
                          controls
                          preload="none"
                          className="w-full max-w-[560px]"
                          src={incident.voiceNoteBase64}
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    )}
                  </div>

                  <div className="w-full xl:w-[340px] flex-shrink-0 space-y-3">
                    {coordinates && (
                      <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-[#22D3EE]" />
                            <p className="text-[#CBD5E1] text-sm font-semibold">Exact SOS Location</p>
                          </div>
                          <a
                            href={getGoogleMapsLink(coordinates.lat, coordinates.lng)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#38BDF8] hover:text-[#7DD3FC]"
                          >
                            Open
                          </a>
                        </div>
                        <div className="overflow-hidden rounded-md border border-[#334155]">
                          <iframe
                            title={`SOS map ${incident.id}`}
                            src={getEmbedMapUrl(coordinates.lat, coordinates.lng)}
                            className="w-full h-44"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                    {incident.status === 'PENDING' && (
                      <>
                        <Button
                          onClick={() => handleRespond(incident.id)}
                          className="bg-[#059669] hover:bg-[#047857] text-white"
                          data-testid={`respond-btn-${incident.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {responderType === 'DRONE'
                            ? 'Dispatch Drone'
                            : responderType === 'NGO'
                              ? 'Assign NGO Team'
                              : 'Accept & Respond'}
                        </Button>
                        <Button
                          onClick={() => handleAutoAssignNearestNgo(incident.id)}
                          className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                          data-testid={`auto-ngo-btn-${incident.id}`}
                        >
                          Auto Assign Nearest NGO
                        </Button>
                      </>
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
              </div>
              );
            })
          )}
        </div>
      </div>
    </GovLayout>
  );
};

export default SOSAlerts;
