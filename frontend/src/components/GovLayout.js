import { Link, useLocation } from 'react-router-dom';
import { Home, Map, AlertTriangle, Camera, CloudLightning, Users, Activity, HeartHandshake, FilePlus2 } from 'lucide-react';

export const GovLayout = ({ children }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/gov/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/gov/map', icon: Map, label: 'Live Map' },
    { path: '/gov/sos-alerts', icon: AlertTriangle, label: 'SOS Alerts' },
    { path: '/gov/cctv-alerts', icon: Camera, label: 'CCTV Alerts' },
    { path: '/gov/disaster-alerts', icon: CloudLightning, label: 'Disasters' },
    { path: '/gov/response', icon: Users, label: 'Response' },
    { path: '/gov/ngo-partners', icon: HeartHandshake, label: 'NGO Partners' },
    { path: '/gov/ngo-requests', icon: FilePlus2, label: 'NGO Requests' },
  ];

  return (
    <div className="gov-theme flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1E293B] border-r border-[#334155] flex flex-col">
        <div className="p-6 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-[#059669]" />
            <div>
              <h1 className="text-xl font-bold text-white">SURAKSHANET</h1>
              <p className="text-xs text-[#94A3B8]">Command Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                    ? 'bg-[#059669] text-white'
                    : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#334155]">
          <div className="text-center text-xs text-[#64748B]">
            <p className="mb-1">Citizen Access</p>
            <p className="font-mono">Mobile App Only</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
