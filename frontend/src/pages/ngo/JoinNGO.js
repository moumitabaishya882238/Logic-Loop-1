import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [22.9734, 78.6569];

const LocationPicker = ({ latitude, longitude, onPick }) => {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!hasValidCoordinates) {
    return null;
  }

  return (
    <CircleMarker
      center={[latitude, longitude]}
      radius={8}
      pathOptions={{ color: '#22D3EE', fillColor: '#22D3EE', fillOpacity: 0.85 }}
    />
  );
};

const JoinNGO = () => {
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    organizationName: '',
    contactPerson: '',
    phone: '',
    email: '',
    city: '',
    teamSize: '',
    latitude: '',
    longitude: '',
    coverageAreas: '',
    capabilities: '',
    password: '',
  });

  const update = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const setCoordinates = (lat, lng) => {
    update('latitude', Number(lat).toFixed(6));
    update('longitude', Number(lng).toFixed(6));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('GPS is not supported in this browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates(position.coords.latitude, position.coords.longitude);
        toast.success('GPS location captured');
        setLocating(false);
      },
      (error) => {
        console.error('GPS error:', error);
        toast.error('Unable to fetch GPS location. Allow location permission and retry.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const mapCenter = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? [latitude, longitude]
    : DEFAULT_CENTER;

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await api.createNGORequest(form);
      toast.success('Request submitted successfully. Government team will review it soon.');
      setForm({
        organizationName: '',
        contactPerson: '',
        phone: '',
        email: '',
        city: '',
        teamSize: '',
        latitude: '',
        longitude: '',
        coverageAreas: '',
        capabilities: '',
        password: '',
      });
    } catch (error) {
      console.error('Failed to submit NGO request:', error);
      toast.error('Failed to submit request. Please verify details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold">Join SurakshaNet as NGO Partner</h1>
        <p className="text-[#94A3B8] mt-2">
          Submit your organization details to get onboarded for emergency response assignments.
        </p>

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <form
            onSubmit={onSubmit}
            className="xl:col-span-2 bg-[#1E293B] border border-[#334155] rounded-xl p-6 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm text-[#CBD5E1]">Organization Name</span>
              <input
                value={form.organizationName}
                onChange={(e) => update('organizationName', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm text-[#CBD5E1]">Primary Contact Person</span>
              <input
                value={form.contactPerson}
                onChange={(e) => update('contactPerson', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
                required
              />
              <p className="text-xs text-[#94A3B8]">Team lead/coordinator we call during emergency assignment.</p>
            </label>

            <label className="space-y-1">
              <span className="text-sm text-[#CBD5E1]">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm text-[#CBD5E1]">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm text-[#CBD5E1]">City</span>
              <input
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm text-[#CBD5E1]">Total Team Members</span>
              <input
                type="number"
                min="1"
                value={form.teamSize}
                onChange={(e) => update('teamSize', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm text-[#CBD5E1]">Portal Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm text-[#CBD5E1]">HQ Latitude</span>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => update('latitude', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm text-[#CBD5E1]">HQ Longitude</span>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => update('longitude', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
                required
              />
            </label>

            <div className="md:col-span-2 bg-[#0F172A] border border-[#334155] rounded-md p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm text-[#CBD5E1]">Location Picker</p>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="text-xs bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 px-3 py-1 rounded"
                >
                  {locating ? 'Getting GPS...' : 'Use GPS'}
                </button>
              </div>
              <p className="text-xs text-[#94A3B8] mb-2">
                Click on map to pick HQ coordinates, or use GPS for current location.
              </p>
              <div className="h-64 w-full rounded-md overflow-hidden border border-[#334155]">
                <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="h-full w-full">
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationPicker
                    latitude={latitude}
                    longitude={longitude}
                    onPick={(lat, lng) => setCoordinates(lat, lng)}
                  />
                </MapContainer>
              </div>
            </div>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm text-[#CBD5E1]">Coverage Areas (comma separated)</span>
              <input
                value={form.coverageAreas}
                onChange={(e) => update('coverageAreas', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm text-[#CBD5E1]">Capabilities (comma separated)</span>
              <input
                value={form.capabilities}
                onChange={(e) => update('capabilities', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2"
              />
            </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#059669] hover:bg-[#047857] disabled:opacity-60 rounded-md py-3 font-semibold"
            >
              {submitting ? 'Submitting Request...' : 'Submit NGO Request'}
            </button>
          </form>

          <div className="xl:col-span-1 bg-[#111B2F] border border-[#334155] rounded-xl p-4 xl:sticky xl:top-6">
            <p className="text-sm text-[#94A3B8] uppercase">Onboarding Journey</p>
            <div className="mt-3 space-y-3">
              <div className="bg-[#0F172A] border border-[#334155] rounded-md p-3">
                <p className="text-xs text-[#38BDF8] font-semibold">STEP 1</p>
                <p className="text-sm mt-1 font-medium">Apply</p>
                <p className="text-xs text-[#94A3B8] mt-1">Submit NGO profile and team details</p>
              </div>
              <div className="bg-[#0F172A] border border-[#334155] rounded-md p-3">
                <p className="text-xs text-[#38BDF8] font-semibold">STEP 2</p>
                <p className="text-sm mt-1 font-medium">Government Review</p>
                <p className="text-xs text-[#94A3B8] mt-1">Request is approved in NGO Requests panel</p>
              </div>
              <div className="bg-[#0F172A] border border-[#334155] rounded-md p-3">
                <p className="text-xs text-[#38BDF8] font-semibold">STEP 3</p>
                <p className="text-sm mt-1 font-medium">Login and Go Online</p>
                <p className="text-xs text-[#94A3B8] mt-1">Use NGO portal, set ONLINE, receive assignments</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinNGO;
