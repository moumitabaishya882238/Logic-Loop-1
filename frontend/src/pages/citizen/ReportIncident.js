import { useState } from 'react';
import { CitizenLayout } from '@/components/CitizenLayout';
import { FileText, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ReportIncident = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    severity: 'MEDIUM',
    type: 'SOS'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const incidentData = {
              type: formData.type,
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                address: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`
              },
              description: formData.description,
              severity: formData.severity,
              reportedBy: formData.name
            };

            await api.createSOSIncident(incidentData);
            toast.success('Incident reported successfully!');
            setFormData({ name: '', description: '', severity: 'MEDIUM', type: 'SOS' });
            navigate('/citizen');
          } catch (error) {
            console.error('Error reporting incident:', error);
            toast.error('Failed to report incident');
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Unable to get your location. Please enable location services.');
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to report incident');
      setLoading(false);
    }
  };

  return (
    <CitizenLayout>
      <div className="p-6 space-y-6" data-testid="report-incident-page">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-[#2563EB]" />
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A]">Report Incident</h2>
            <p className="text-sm text-[#64748B]">Help us keep the community safe</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-[#0F172A] mb-2 block">Your Name *</label>
            <Input
              type="text"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-testid="report-name-input"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#0F172A] mb-2 block">Incident Type *</label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger data-testid="report-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOS">Emergency / SOS</SelectItem>
                <SelectItem value="DISASTER">Natural Disaster</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#0F172A] mb-2 block">Description *</label>
            <Textarea
              placeholder="Describe what happened in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
              data-testid="report-description-input"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#0F172A] mb-2 block">Severity Level *</label>
            <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
              <SelectTrigger data-testid="report-severity-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low - Minor Issue</SelectItem>
                <SelectItem value="MEDIUM">Medium - Needs Attention</SelectItem>
                <SelectItem value="HIGH">High - Urgent</SelectItem>
                <SelectItem value="CRITICAL">Critical - Life Threatening</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-[#F1F5F9] rounded-lg p-4 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#2563EB] mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0F172A]">Location Auto-Capture</p>
              <p className="text-xs text-[#64748B] mt-1">Your current location will be automatically attached to the report</p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-6 text-lg"
            disabled={loading}
            data-testid="report-submit-button"
          >
            {loading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </form>

        <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#DC2626] mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#DC2626]">For Immediate Emergencies</p>
            <p className="text-xs text-[#991B1B] mt-1">If you're in immediate danger, please call emergency services or use the SOS button on the home page</p>
          </div>
        </div>
      </div>
    </CitizenLayout>
  );
};

export default ReportIncident;
