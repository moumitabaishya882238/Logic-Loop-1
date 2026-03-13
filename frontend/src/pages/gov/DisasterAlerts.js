import { useEffect, useState } from 'react';
import { GovLayout } from '@/components/GovLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { CloudLightning, MapPin, Clock, CheckCircle, Waves, Gauge, TriangleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_MAP_CENTER = [26.1445, 91.7362];
const PREDEFINED_ZONES = [
  'Beltola',
  'Khanapara',
  'Six Mile',
  'Zoo Road',
  'GS Road',
  'Dispur',
  'Paltan Bazar',
  'Jalukbari',
  'Maligaon',
  'Pan Bazar',
];

const SensorLocationPicker = ({ lat, lng, onPick }) => {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={7}
      pathOptions={{ color: '#22D3EE', fillColor: '#22D3EE', fillOpacity: 0.85 }}
    />
  );
};

const DisasterAlerts = () => {
  const [incidents, setIncidents] = useState([]);
  const [sensorFeed, setSensorFeed] = useState({ sensors: [], summary: null });
  const [ngoPartners, setNgoPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sensorLoading, setSensorLoading] = useState(true);
  const [responderName, setResponderName] = useState('');
  const [responderType, setResponderType] = useState('GOVERNMENT');
  const [ngoPartner, setNgoPartner] = useState('');
  const [selectedSensorId, setSelectedSensorId] = useState(null);
  const [showAddSensorForm, setShowAddSensorForm] = useState(false);
  const [addingSensor, setAddingSensor] = useState(false);
  const [locating, setLocating] = useState(false);
  const [sensorForm, setSensorForm] = useState({
    sensorId: '',
    sensorName: '',
    zone: '',
    lat: '',
    lng: '',
    drainDepthCm: '',
    warningLevelPercent: '60',
    criticalLevelPercent: '80',
    currentWaterLevelPercent: '',
    riseRateCmPerMin: '',
    rainfallMmPerHr: '',
  });

  const severityOrder = {
    CRITICAL: 3,
    HIGH: 2,
    MEDIUM: 1,
    LOW: 0,
  };

  useEffect(() => {
    fetchIncidents();
    fetchSensorFeed();
    fetchNgoPartners();
    const interval = setInterval(fetchIncidents, 3000);
    const sensorInterval = setInterval(fetchSensorFeed, 5000);
    return () => {
      clearInterval(interval);
      clearInterval(sensorInterval);
    };
  }, []);

  const fetchSensorFeed = async () => {
    try {
      const data = await api.getFloodSensors();
      const sortedSensors = [...(data?.sensors || [])].sort((a, b) => {
        const severityDelta = (severityOrder[b.riskLevel] || 0) - (severityOrder[a.riskLevel] || 0);
        if (severityDelta !== 0) {
          return severityDelta;
        }
        return Number(b.riskScore || 0) - Number(a.riskScore || 0);
      });

      setSensorFeed({ ...data, sensors: sortedSensors });
      setSelectedSensorId((previous) => previous || sortedSensors?.[0]?.sensorId || null);
    } catch (error) {
      console.error('Error fetching flood sensors:', error);
      toast.error('Failed to load flood sensor feed');
    } finally {
      setSensorLoading(false);
    }
  };

  const fetchNgoPartners = async () => {
    try {
      const partners = await api.getNGOPartners();
      setNgoPartners(partners);
      if (partners.length > 0) {
        setNgoPartner((previous) => previous || partners[0].name);
      }
    } catch (error) {
      console.error('Error fetching NGO partners for disaster dispatch:', error);
    }
  };

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
        payload.responderName = 'Drone MedKit Unit';
      } else {
        payload.responderName = responderName;
      }

      if (responderType === 'NGO') {
        payload.ngoPartner = ngoPartner;
      }

      await api.respondToIncident(incidentId, payload);
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

  const handleGenerateFromSensors = async () => {
    try {
      const result = await api.createDisasterAlertsFromSensors();
      toast.success(result.message || 'Sensor disaster alerts generated');
      fetchIncidents();
      fetchSensorFeed();
    } catch (error) {
      console.error('Error generating alerts from sensors:', error);
      toast.error('Failed to generate disaster alerts from sensors');
    }
  };

  const handleDispatchSelectedSensor = async () => {
    if (!selectedSensor) {
      toast.error('Please select a sensor first');
      return;
    }

    if (responderType !== 'DRONE' && !responderName.trim()) {
      toast.error('Please enter responder name');
      return;
    }

    if (responderType === 'NGO' && !ngoPartner.trim()) {
      toast.error('Please select NGO partner');
      return;
    }

    try {
      let targetIncident = incidents.find(
        (incident) =>
          incident.type === 'DISASTER' &&
          incident.sourceSensorId === selectedSensor.sensorId &&
          ['PENDING', 'ACCEPTED'].includes(incident.status)
      );

      if (!targetIncident) {
        await api.createDisasterAlertsFromSensors();
        const refreshedIncidents = await api.getIncidents({ type: 'DISASTER' });
        setIncidents(refreshedIncidents);
        targetIncident = refreshedIncidents.find(
          (incident) =>
            incident.type === 'DISASTER' &&
            incident.sourceSensorId === selectedSensor.sensorId &&
            ['PENDING', 'ACCEPTED'].includes(incident.status)
        );
      }

      if (!targetIncident) {
        toast.error('Selected sensor does not currently meet auto-alert threshold (HIGH/CRITICAL).');
        return;
      }

      const payload = {
        responderId: `RESP-${Date.now()}`,
        responderType,
      };

      if (responderType === 'DRONE') {
        payload.responderName = 'Drone MedKit Unit';
      } else {
        payload.responderName = responderName;
      }

      if (responderType === 'NGO') {
        payload.ngoPartner = ngoPartner;
      }

      await api.respondToIncident(targetIncident.id, payload);
      toast.success(`Help dispatched to ${selectedSensor.sensorName}`);
      fetchIncidents();
    } catch (error) {
      console.error('Error dispatching help to selected sensor:', error);
      toast.error(error?.response?.data?.error || 'Failed to dispatch help');
    }
  };

  const updateSensorForm = (key, value) => {
    setSensorForm((previous) => ({ ...previous, [key]: value }));
  };

  const setSensorCoordinates = (lat, lng) => {
    updateSensorForm('lat', Number(lat).toFixed(6));
    updateSensorForm('lng', Number(lng).toFixed(6));
  };

  const useCurrentGpsForSensor = () => {
    if (!navigator.geolocation) {
      toast.error('GPS is not supported in this browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSensorCoordinates(position.coords.latitude, position.coords.longitude);
        toast.success('Sensor location set from GPS');
        setLocating(false);
      },
      (error) => {
        console.error('GPS error while adding sensor:', error);
        toast.error('Unable to fetch GPS location. Please allow location access.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleAddSensor = async (event) => {
    event.preventDefault();
    setAddingSensor(true);

    try {
      await api.createFloodSensor(sensorForm);
      toast.success('Flood sensor added successfully');
      setShowAddSensorForm(false);
      setSensorForm({
        sensorId: '',
        sensorName: '',
        zone: '',
        lat: '',
        lng: '',
        drainDepthCm: '',
        warningLevelPercent: '60',
        criticalLevelPercent: '80',
        currentWaterLevelPercent: '',
        riseRateCmPerMin: '',
        rainfallMmPerHr: '',
      });
      fetchSensorFeed();
    } catch (error) {
      console.error('Error adding flood sensor:', error);
      toast.error(error?.response?.data?.error || 'Failed to add flood sensor');
    } finally {
      setAddingSensor(false);
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

  const getRiskBadgeClass = (riskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  const selectedSensor =
    sensorFeed.sensors?.find((sensor) => sensor.sensorId === selectedSensorId) ||
    sensorFeed.sensors?.find((sensor) => sensor.riskLevel === 'CRITICAL') ||
    sensorFeed.sensors?.[0] ||
    null;

  const activeSensorIds = new Set(
    incidents
      .filter((incident) => incident.status !== 'RESOLVED' && incident.sourceSensorId)
      .map((incident) => incident.sourceSensorId)
  );

  const unconvertedHighRiskSensors =
    sensorFeed.sensors?.filter(
      (sensor) =>
        ['HIGH', 'CRITICAL'].includes(sensor.riskLevel) &&
        !activeSensorIds.has(sensor.sensorId)
    ) || [];

  const displayedTotalDisasters = incidents.length + unconvertedHighRiskSensors.length;
  const displayedPendingDisasters =
    incidents.filter((incident) => incident.status === 'PENDING').length +
    unconvertedHighRiskSensors.length;
  const displayedResolvedDisasters = incidents.filter((incident) => incident.status === 'RESOLVED').length;

  const waterFill = selectedSensor ? Math.max(0, Math.min(100, selectedSensor.waterLevelPercent)) : 0;
  const sensorLat = Number(sensorForm.lat);
  const sensorLng = Number(sensorForm.lng);
  const sensorMapCenter =
    Number.isFinite(sensorLat) && Number.isFinite(sensorLng)
      ? [sensorLat, sensorLng]
      : DEFAULT_MAP_CENTER;

  return (
    <GovLayout>
      <div className="p-6 space-y-6" data-testid="disaster-alerts-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">DISASTER ALERTS</h1>
            <p className="text-[#94A3B8] mt-1">Natural Disaster & Emergency Warnings</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select
              value={responderType}
              onChange={(e) => setResponderType(e.target.value)}
              className="bg-[#1E293B] border border-[#334155] text-white rounded-md px-3 py-2"
            >
              <option value="GOVERNMENT">Government Team</option>
              <option value="NGO">NGO Team</option>
              <option value="DRONE">Drone MedKit</option>
            </select>

            {responderType === 'NGO' && (
              <select
                value={ngoPartner}
                onChange={(e) => setNgoPartner(e.target.value)}
                className="bg-[#1E293B] border border-[#334155] text-white rounded-md px-3 py-2"
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
            <p className="text-[#94A3B8] text-sm uppercase">Total Disasters</p>
            <p className="text-3xl font-bold text-white mt-2">{displayedTotalDisasters}</p>
          </div>
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Pending</p>
            <p className="text-3xl font-bold text-[#DC2626] mt-2">{displayedPendingDisasters}</p>
          </div>
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Resolved</p>
            <p className="text-3xl font-bold text-[#059669] mt-2">{displayedResolvedDisasters}</p>
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-5 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">Flood Sensor Pilot (Simulated)</h2>
              <p className="text-[#94A3B8] text-sm mt-1">
                AI-ready drain water-level monitoring with risk scoring and early warning triggers
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAddSensorForm((previous) => !previous)}
                className="bg-[#334155] hover:bg-[#475569] text-white"
                data-testid="toggle-add-flood-sensor"
              >
                {showAddSensorForm ? 'Close Form' : 'Add Flood Sensor'}
              </Button>
              <Button
                onClick={handleGenerateFromSensors}
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                data-testid="generate-disaster-from-sensors"
              >
                Generate Disaster Alerts from Sensors
              </Button>
            </div>
          </div>

          {showAddSensorForm && (
            <form
              onSubmit={handleAddSensor}
              className="bg-[#0F172A] border border-[#334155] rounded-lg p-4"
              data-testid="add-flood-sensor-form"
            >
              <p className="text-[#CBD5E1] font-semibold mb-3">Add Flood Sensor</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <input
                  placeholder="Sensor ID (e.g. FS-201)"
                  value={sensorForm.sensorId}
                  onChange={(e) => updateSensorForm('sensorId', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
                <input
                  placeholder="Sensor Name"
                  value={sensorForm.sensorName}
                  onChange={(e) => updateSensorForm('sensorName', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
                <input
                  placeholder="Zone (e.g. Beltola)"
                  list="zone-options"
                  value={sensorForm.zone}
                  onChange={(e) => updateSensorForm('zone', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
                <datalist id="zone-options">
                  {PREDEFINED_ZONES.map((zone) => (
                    <option key={zone} value={zone} />
                  ))}
                </datalist>
                <div className="md:col-span-2 xl:col-span-3 bg-[#111827] border border-[#334155] rounded-md p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm text-[#CBD5E1]">Sensor Location</p>
                    <Button
                      type="button"
                      onClick={useCurrentGpsForSensor}
                      className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
                      disabled={locating}
                    >
                      {locating ? 'Getting GPS...' : 'Use GPS'}
                    </Button>
                  </div>
                  <p className="text-xs text-[#94A3B8] mb-2">
                    Click on map to pin sensor location, or use GPS.
                  </p>
                  <div className="h-56 w-full rounded-md overflow-hidden border border-[#334155]">
                    <MapContainer center={sensorMapCenter} zoom={13} scrollWheelZoom className="h-full w-full">
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <SensorLocationPicker
                        lat={sensorLat}
                        lng={sensorLng}
                        onPick={(lat, lng) => setSensorCoordinates(lat, lng)}
                      />
                    </MapContainer>
                  </div>
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={sensorForm.lat}
                  onChange={(e) => updateSensorForm('lat', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={sensorForm.lng}
                  onChange={(e) => updateSensorForm('lng', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Drain Depth (cm)"
                  value={sensorForm.drainDepthCm}
                  onChange={(e) => updateSensorForm('drainDepthCm', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Warning Level (%)"
                  value={sensorForm.warningLevelPercent}
                  onChange={(e) => updateSensorForm('warningLevelPercent', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Critical Level (%)"
                  value={sensorForm.criticalLevelPercent}
                  onChange={(e) => updateSensorForm('criticalLevelPercent', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Current Water Level (%)"
                  value={sensorForm.currentWaterLevelPercent}
                  onChange={(e) => updateSensorForm('currentWaterLevelPercent', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Rise Rate (cm/min)"
                  value={sensorForm.riseRateCmPerMin}
                  onChange={(e) => updateSensorForm('riseRateCmPerMin', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Rainfall (mm/hr)"
                  value={sensorForm.rainfallMmPerHr}
                  onChange={(e) => updateSensorForm('rainfallMmPerHr', e.target.value)}
                  className="bg-[#111827] border border-[#334155] rounded-md px-3 py-2 text-white"
                  required
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="submit" className="bg-[#059669] hover:bg-[#047857] text-white" disabled={addingSensor}>
                  {addingSensor ? 'Adding Sensor...' : 'Save Sensor'}
                </Button>
              </div>

              <div className="mt-3 text-xs text-[#94A3B8] bg-[#111827] border border-[#334155] rounded-md p-3 space-y-1">
                <p className="text-[#CBD5E1] font-semibold">Critical Setup Guide</p>
                <p>Use drain depth to compute thresholds. Recommended: Warning at 60%, Critical at 80%.</p>
                <p>Example: If drain depth is 120 cm, Warning = 72 cm water level, Critical = 96 cm water level.</p>
                <p>Typical critical detection pattern: Water level &gt;= 80%, rise rate &gt;= 1.5 cm/min, rainfall &gt;= 25 mm/hr.</p>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-[#0F172A] border border-[#334155] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[#CBD5E1] font-semibold">Live Sensor Feed</p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Sorted by Severity: Critical &gt; High &gt; Medium &gt; Low
                  </p>
                </div>
                {sensorFeed.summary && (
                  <p className="text-xs text-[#94A3B8]">
                    Avg Level: {sensorFeed.summary.averageWaterLevelPercent}% | Critical: {sensorFeed.summary.criticalSensors}
                  </p>
                )}
              </div>

              {sensorLoading ? (
                <p className="text-[#94A3B8] text-sm">Loading sensor data...</p>
              ) : (
                <div className="space-y-3">
                  {sensorFeed.sensors?.map((sensor) => (
                    <div
                      key={sensor.sensorId}
                      className={`border rounded-md p-3 bg-[#111827] cursor-pointer transition-colors ${
                        selectedSensor?.sensorId === sensor.sensorId
                          ? 'border-[#38BDF8] ring-1 ring-[#38BDF8]/60'
                          : 'border-[#334155] hover:border-[#475569]'
                      }`}
                      data-testid={`flood-sensor-${sensor.sensorId}`}
                      onClick={() => setSelectedSensorId(sensor.sensorId)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="text-white font-semibold text-sm">{sensor.sensorName}</p>
                          <p className="text-[#94A3B8] text-xs">{sensor.zone}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded border ${getRiskBadgeClass(sensor.riskLevel)}`}>
                          {sensor.riskLevel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <p className="text-[#CBD5E1]"><Waves className="w-3 h-3 inline mr-1" />{sensor.waterLevelPercent}%</p>
                        <p className="text-[#CBD5E1]"><Gauge className="w-3 h-3 inline mr-1" />{sensor.riskScore}</p>
                        <p className="text-[#CBD5E1]">Rain {sensor.rainfallMmPerHr} mm/hr</p>
                        <p className="text-[#CBD5E1]">Overflow ETA {sensor.estimatedOverflowMinutes}m</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-4">
              <p className="text-[#CBD5E1] font-semibold mb-2">3D Sensor Twin (Concept)</p>
              <p className="text-xs text-[#94A3B8] mb-3">Hardcoded pilot model for presentation and early validation</p>
              <div className="relative h-56 rounded-lg overflow-hidden border border-[#334155] bg-gradient-to-b from-[#1E3A8A] via-[#1E293B] to-[#0F172A]">
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-[#334155] opacity-60" />
                <div
                  className="absolute bottom-0 left-0 right-0 bg-[#0EA5E9]/70 transition-all duration-700"
                  style={{ height: `${Math.max(8, (waterFill / 100) * 120)}px` }}
                />
                <div className="absolute left-1/2 top-8 -translate-x-1/2 w-8 h-24 rounded-md bg-[#94A3B8] border border-[#CBD5E1] shadow-lg" />
                <div className="absolute left-1/2 top-5 -translate-x-1/2 w-14 h-5 rounded-full bg-[#0EA5E9] border border-[#67E8F9]" />
                <div className="absolute left-4 top-4 text-xs text-white bg-[#0F172A]/70 px-2 py-1 rounded">
                  {selectedSensor ? selectedSensor.sensorName : 'No Sensor'}
                </div>
              </div>
              {selectedSensor ? (
                <div className="mt-3 text-xs text-[#CBD5E1] space-y-1">
                  <p>Water Level: {selectedSensor.waterLevelPercent}%</p>
                  <p>Risk Score: {selectedSensor.riskScore}</p>
                  <p>Overflow ETA: {selectedSensor.estimatedOverflowMinutes} min</p>
                  <Button
                    onClick={handleDispatchSelectedSensor}
                    className="mt-3 bg-[#059669] hover:bg-[#047857] text-white"
                    data-testid="dispatch-help-selected-sensor"
                  >
                    {responderType === 'DRONE'
                      ? 'Send Drone MedKit'
                      : responderType === 'NGO'
                        ? 'Send NGO Help'
                        : 'Send Government Help'}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-[#94A3B8] mt-3">No sensor selected</p>
              )}
            </div>
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
                          {incident.sourceSensorName ? (
                            <p className="text-xs text-[#94A3B8] mt-1">
                              Source Sensor: {incident.sourceSensorName}
                            </p>
                          ) : null}
                          {incident.sourceRiskScore != null ? (
                            <p className="text-xs text-[#94A3B8]">Risk Score: {incident.sourceRiskScore}</p>
                          ) : null}
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
