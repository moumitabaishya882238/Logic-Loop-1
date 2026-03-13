import { useState } from 'react';
import { CitizenLayout } from '@/components/CitizenLayout';
import { AlertTriangle, Shield, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const CitizenHome = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    severity: 'MEDIUM'
  });

  const handleSOSPress = () => {
    setShowDialog(true);
  };

  const handleSubmitSOS = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      // Get user location
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const incidentData = {
              type: 'SOS',
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
            toast.success('SOS alert sent successfully! Help is on the way.');
            setShowDialog(false);
            setFormData({ name: '', description: '', severity: 'MEDIUM' });
          } catch (error) {
            console.error('Error sending SOS:', error);
            toast.error('Failed to send SOS alert');
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
      toast.error(error.message || 'Failed to send SOS alert');
      setLoading(false);
    }
  };

  return (
    <CitizenLayout>
      <div className="p-6 space-y-6" data-testid="citizen-home">
        {/* Hero Section */}
        <div className="text-center pt-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-[#DC2626]" />
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Your Safety Matters</h2>
          <p className="text-[#64748B]">Press SOS for immediate emergency assistance</p>
        </div>

        {/* SOS Button */}
        <div className="flex items-center justify-center py-12">
          <button
            onClick={handleSOSPress}
            data-testid="sos-button"
            className="sos-pulse w-48 h-48 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white flex flex-col items-center justify-center shadow-2xl transition-all"
          >
            <AlertTriangle className="w-16 h-16 mb-3" />
            <span className="text-3xl font-bold">SOS</span>
            <span className="text-sm mt-2">Emergency</span>
          </button>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-[#F1F5F9] rounded-lg p-6">
          <h3 className="font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#DC2626]" />
            Emergency Contacts
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Police</span>
              <a href="tel:100" className="text-[#2563EB] font-bold">100</a>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Ambulance</span>
              <a href="tel:108" className="text-[#2563EB] font-bold">108</a>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Fire Brigade</span>
              <a href="tel:101" className="text-[#2563EB] font-bold">101</a>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Women Helpline</span>
              <a href="tel:1091" className="text-[#2563EB] font-bold">1091</a>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-[#CBD5E1] rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-[#059669]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-[#059669]" />
            </div>
            <h4 className="font-bold text-[#0F172A] mb-1">Protected</h4>
            <p className="text-xs text-[#64748B]">24/7 monitoring</p>
          </div>
          <div className="bg-white border border-[#CBD5E1] rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-[#2563EB]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6 text-[#2563EB]" />
            </div>
            <h4 className="font-bold text-[#0F172A] mb-1">Quick Response</h4>
            <p className="text-xs text-[#64748B]">Instant help</p>
          </div>
        </div>
      </div>

      {/* SOS Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#DC2626]">
              <AlertTriangle className="w-5 h-5" />
              Emergency SOS Alert
            </DialogTitle>
            <DialogDescription>
              Fill in the details below. Your location will be automatically captured.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-[#0F172A] mb-2 block">Your Name</label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="sos-name-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#0F172A] mb-2 block">Emergency Description</label>
              <Textarea
                placeholder="Describe the emergency..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                data-testid="sos-description-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#0F172A] mb-2 block">Severity</label>
              <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                <SelectTrigger data-testid="sos-severity-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitSOS}
                className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                disabled={loading}
                data-testid="sos-submit-button"
              >
                {loading ? 'Sending...' : 'Send SOS'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CitizenLayout>
  );
};

export default CitizenHome;
