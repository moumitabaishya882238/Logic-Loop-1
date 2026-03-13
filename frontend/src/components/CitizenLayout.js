import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, MapPin, Shield, Activity } from 'lucide-react';

export const CitizenLayout = ({ children }) => {
  const location = useLocation();
  
  const menuItems = [
    { path: '/citizen', icon: Home, label: 'Home' },
    { path: '/citizen/report', icon: FileText, label: 'Report' },
    { path: '/citizen/nearby', icon: MapPin, label: 'Nearby' },
    { path: '/citizen/map', icon: Shield, label: 'Safety Map' },
  ];
  
  return (
    <div className="citizen-theme min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#CBD5E1] sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#DC2626]" />
              <div>
                <h1 className="text-lg font-bold text-[#0F172A]">SurakshaNet</h1>
                <p className="text-xs text-[#64748B]">Your Safety Companion</p>
              </div>
            </div>
            <Link
              to="/gov/dashboard"
              data-testid="nav-gov-view"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F172A] text-white text-xs font-medium hover:bg-[#1E293B] transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>Gov View</span>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-[#CBD5E1] sticky bottom-0">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-around">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`citizen-nav-${item.label.toLowerCase()}`}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-[#DC2626]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};
