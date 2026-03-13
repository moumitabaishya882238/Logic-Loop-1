import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";

// Government Dashboard Pages
import GovDashboard from "@/pages/gov/Dashboard";
import LiveMap from "@/pages/gov/LiveMap";
import SOSAlerts from "@/pages/gov/SOSAlerts";
import CCTVAlerts from "@/pages/gov/CCTVAlerts";
import DisasterAlerts from "@/pages/gov/DisasterAlerts";
import ResponsePanel from "@/pages/gov/ResponsePanel";
import NGOPartners from "@/pages/gov/NGOPartners";
import NGORequests from "@/pages/gov/NGORequests";
import JoinNGO from "@/pages/ngo/JoinNGO";
import NGOLogin from "@/pages/ngo/NGOLogin";
import NGODashboard from "@/pages/ngo/NGODashboard";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Default redirect to government dashboard */}
          <Route path="/" element={<Navigate to="/gov/dashboard" replace />} />
          
          {/* Government Dashboard Routes */}
          <Route path="/gov/dashboard" element={<GovDashboard />} />
          <Route path="/gov/map" element={<LiveMap />} />
          <Route path="/gov/sos-alerts" element={<SOSAlerts />} />
          <Route path="/gov/cctv-alerts" element={<CCTVAlerts />} />
          <Route path="/gov/disaster-alerts" element={<DisasterAlerts />} />
          <Route path="/gov/response" element={<ResponsePanel />} />
          <Route path="/gov/ngo-partners" element={<NGOPartners />} />
          <Route path="/gov/ngo-requests" element={<NGORequests />} />

          {/* NGO onboarding route */}
          <Route path="/ngo/join" element={<JoinNGO />} />
          <Route path="/ngo/login" element={<NGOLogin />} />
          <Route path="/ngo/dashboard" element={<NGODashboard />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
