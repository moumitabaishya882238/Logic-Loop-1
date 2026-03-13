import { useEffect, useState } from 'react';
import { GovLayout } from '@/components/GovLayout';
import { Activity, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, incidentsData] = await Promise.all([
        api.getIncidentStats(),
        api.getIncidents({ limit: 10 })
      ]);
      setStats(statsData);
      setRecentIncidents(incidentsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-red-500/20 text-red-400';
      case 'ACCEPTED': return 'bg-yellow-500/20 text-yellow-400';
      case 'RESOLVED': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <GovLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-[#059669]" />
            <p className="text-[#94A3B8]">Loading dashboard...</p>
          </div>
        </div>
      </GovLayout>
    );
  }

  return (
    <GovLayout>
      <div className="p-6 space-y-6" data-testid="gov-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">COMMAND DASHBOARD</h1>
            <p className="text-[#94A3B8] mt-1">Real-time Emergency Response Monitoring</p>
          </div>
          <div className="flex items-center gap-2 text-[#94A3B8] mono text-sm">
            <div className="w-2 h-2 bg-[#059669] rounded-full animate-pulse"></div>
            <span>SYSTEM ACTIVE</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div 
            className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 stat-card-glow"
            data-testid="stat-total-incidents"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#94A3B8] text-sm uppercase tracking-wide">Total Incidents</p>
                <p className="text-4xl font-bold text-white mt-2">{stats?.total || 0}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-[#059669]" />
            </div>
          </div>

          <div 
            className="bg-[#1E293B] border border-[#334155] rounded-lg p-6"
            data-testid="stat-active-incidents"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#94A3B8] text-sm uppercase tracking-wide">Active</p>
                <p className="text-4xl font-bold text-[#DC2626] mt-2">{stats?.active || 0}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-[#DC2626] blink-alert" />
            </div>
          </div>

          <div 
            className="bg-[#1E293B] border border-[#334155] rounded-lg p-6"
            data-testid="stat-resolved-incidents"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#94A3B8] text-sm uppercase tracking-wide">Resolved</p>
                <p className="text-4xl font-bold text-[#059669] mt-2">{stats?.resolved || 0}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-[#059669]" />
            </div>
          </div>

          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
            <p className="text-[#94A3B8] text-sm uppercase tracking-wide mb-3">By Type</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#94A3B8]">SOS</span>
                <span className="text-white font-bold">{stats?.byType?.SOS || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#94A3B8]">CCTV</span>
                <span className="text-white font-bold">{stats?.byType?.CCTV || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#94A3B8]">Disaster</span>
                <span className="text-white font-bold">{stats?.byType?.DISASTER || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Incidents Feed */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg" data-testid="recent-incidents-feed">
          <div className="p-6 border-b border-[#334155]">
            <h2 className="text-xl font-bold text-white">LIVE INCIDENT FEED</h2>
          </div>
          <div className="divide-y divide-[#334155] max-h-96 overflow-y-auto">
            {recentIncidents.length === 0 ? (
              <div className="p-8 text-center text-[#94A3B8]">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No incidents reported yet</p>
              </div>
            ) : (
              recentIncidents.map((incident) => (
                <div 
                  key={incident.id} 
                  className="p-4 hover:bg-[#334155]/30 transition-colors"
                  data-testid={`incident-${incident.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-bold bg-[#334155] text-white">
                          {incident.type}
                        </span>
                        <span className={`text-xs font-bold ${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                      </div>
                      <p className="text-white font-medium mb-1">{incident.description}</p>
                      <p className="text-[#94A3B8] text-sm">{incident.location.address || `${incident.location.lat}, ${incident.location.lng}`}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#94A3B8] text-xs mono">
                        {format(new Date(incident.timestamp), 'HH:mm:ss')}
                      </p>
                      <p className="text-[#64748B] text-xs mono mt-1">
                        {format(new Date(incident.timestamp), 'dd MMM yy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </GovLayout>
  );
};

export default Dashboard;
