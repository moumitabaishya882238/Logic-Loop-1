import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CheckCircle, LogOut, RadioTower, Users, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const NGODashboard = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [ngo, setNgo] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMembers, setActiveMembers] = useState(0);

  useEffect(() => {
    const authToken = localStorage.getItem('ngoAuthToken');
    if (!authToken) {
      navigate('/ngo/login');
      return;
    }

    setToken(authToken);
    loadDashboard(authToken);
  }, [navigate]);

  const loadDashboard = async (authToken) => {
    try {
      const [profile, assignedIncidents] = await Promise.all([
        api.getNGOProfile(authToken),
        api.getNGOAssignedIncidents(authToken),
      ]);
      setNgo(profile);
      setActiveMembers(profile.activeMembers || 0);
      setIncidents(assignedIncidents);
    } catch (error) {
      console.error('Failed to load NGO dashboard:', error);
      toast.error('Session expired. Please login again.');
      localStorage.removeItem('ngoAuthToken');
      navigate('/ngo/login');
    } finally {
      setLoading(false);
    }
  };

  const setAvailability = async (availabilityStatus) => {
    try {
      const updated = await api.updateNGOAvailability(token, {
        availabilityStatus,
        activeMembers,
      });
      setNgo(updated);
      toast.success(`NGO marked ${availabilityStatus}`);
    } catch (error) {
      console.error('Failed to update NGO availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const handleLogout = async () => {
    try {
      await api.ngoLogout(token);
    } catch (error) {
      console.error('NGO logout error:', error);
    }

    localStorage.removeItem('ngoAuthToken');
    navigate('/ngo/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] text-[#94A3B8] flex items-center justify-center">
        Loading NGO dashboard...
      </div>
    );
  }

  if (!ngo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-white p-6 space-y-6" data-testid="ngo-dashboard-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{ngo.name} Dashboard</h1>
          <p className="text-[#94A3B8] mt-1">NGO operations portal</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-[#1E293B] border border-[#334155] rounded-md px-3 py-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
          <p className="text-[#94A3B8] text-sm uppercase">Availability</p>
          <p
            className={`text-2xl font-bold mt-2 ${
              ngo.availabilityStatus === 'ONLINE' ? 'text-[#10B981]' : 'text-[#94A3B8]'
            }`}
          >
            {ngo.availabilityStatus || 'OFFLINE'}
          </p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
          <p className="text-[#94A3B8] text-sm uppercase">Team Size</p>
          <p className="text-2xl font-bold mt-2 text-white">{ngo.teamSize || 0}</p>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
          <p className="text-[#94A3B8] text-sm uppercase">Assigned Incidents</p>
          <p className="text-2xl font-bold mt-2 text-[#38BDF8]">{incidents.length}</p>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-5 space-y-4">
        <h2 className="text-xl font-semibold">Set Availability Status</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-[#CBD5E1] flex items-center gap-2">
            <Users className="w-4 h-4" />
            Active Members
          </label>
          <input
            type="number"
            min="0"
            max={ngo.teamSize || 0}
            value={activeMembers}
            onChange={(e) => setActiveMembers(Number(e.target.value || 0))}
            className="w-28 bg-[#0F172A] border border-[#334155] rounded-md px-2 py-1"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setAvailability('ONLINE')}
            className="bg-[#059669] hover:bg-[#047857] rounded-md px-4 py-2 flex items-center gap-2"
          >
            <RadioTower className="w-4 h-4" />
            Go Online
          </button>
          <button
            onClick={() => setAvailability('OFFLINE')}
            className="bg-[#334155] hover:bg-[#475569] rounded-md px-4 py-2 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Go Offline
          </button>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-4">Assigned Incidents</h2>
        {incidents.length === 0 ? (
          <p className="text-[#94A3B8]">No incidents assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => {
              const severityColors = {
                CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
                HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
                MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
                LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
              };
              const typeColors = {
                SOS: 'text-orange-300 bg-orange-500/10',
                CCTV: 'text-red-300 bg-red-500/10',
                DISASTER: 'text-blue-300 bg-blue-500/10',
              };
              return (
                <div key={incident.id} className="bg-[#0F172A] border border-[#334155] rounded-md p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${typeColors[incident.type] || 'text-gray-300 bg-gray-500/10'}`}>
                      {incident.type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border font-bold ${severityColors[incident.severity] || 'text-gray-400'}`}>
                      {incident.severity}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${incident.status === 'ACCEPTED' ? 'text-yellow-400 bg-yellow-500/10' : 'text-green-400 bg-green-500/10'}`}>
                      {incident.status}
                    </span>
                  </div>
                  <p className="font-semibold text-white">{incident.description}</p>
                  <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {incident.location?.address || `${incident.location?.lat?.toFixed(4)}, ${incident.location?.lng?.toFixed(4)}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(incident.timestamp), 'dd MMM HH:mm')}
                    </span>
                  </div>
                  {incident.responderName && (
                    <p className="text-xs text-[#64748B]">Assigned to: {incident.responderName}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NGODashboard;
