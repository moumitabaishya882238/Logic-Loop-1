import { useEffect, useState } from 'react';
import { GovLayout } from '@/components/GovLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { HeartHandshake, Phone, Mail, MapPin, Users, Activity } from 'lucide-react';

const NGOPartners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = async () => {
    try {
      const data = await api.getNGOPartners();
      setPartners(data);
    } catch (error) {
      console.error('Error loading NGO partners:', error);
      toast.error('Failed to load NGO partners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  return (
    <GovLayout>
      <div className="p-6 space-y-6" data-testid="ngo-partners-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">NGO PARTNERS</h1>
            <p className="text-[#94A3B8] mt-1">Approved NGO organizations for emergency response</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Approved NGOs</p>
            <p className="text-3xl font-bold text-white mt-2">{partners.length}</p>
          </div>
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Active Cities</p>
            <p className="text-3xl font-bold text-[#38BDF8] mt-2">
              {new Set(partners.map((item) => item.city)).size}
            </p>
          </div>
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Status</p>
            <p className="text-3xl font-bold text-[#10B981] mt-2">LIVE</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#94A3B8]">Loading NGO partners...</div>
        ) : partners.length === 0 ? (
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-12 text-center">
            <HeartHandshake className="w-12 h-12 mx-auto mb-3 text-[#94A3B8] opacity-50" />
            <p className="text-[#94A3B8]">No approved NGO partners yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {partners.map((ngo) => (
              <div
                key={ngo.id}
                className="bg-[#1E293B] border border-[#334155] rounded-lg p-5"
                data-testid={`ngo-partner-${ngo.id}`}
              >
                <h3 className="text-xl font-semibold text-white">{ngo.name}</h3>
                <p className="text-sm text-[#94A3B8] mt-1">{ngo.contactPerson}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span
                    className={`px-2 py-1 rounded border ${
                      ngo.availabilityStatus === 'ONLINE'
                        ? 'bg-green-500/20 text-green-400 border-green-500/40'
                        : 'bg-gray-500/20 text-gray-300 border-gray-500/40'
                    }`}
                  >
                    {ngo.availabilityStatus || 'OFFLINE'}
                  </span>
                  <span className="text-[#CBD5E1]">Active Members: {ngo.activeMembers || 0}</span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[#CBD5E1]">
                    <Phone className="w-4 h-4 text-[#38BDF8]" />
                    <span>{ngo.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#CBD5E1]">
                    <Mail className="w-4 h-4 text-[#38BDF8]" />
                    <span>{ngo.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#CBD5E1]">
                    <MapPin className="w-4 h-4 text-[#38BDF8]" />
                    <span>{ngo.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#CBD5E1]">
                    <Users className="w-4 h-4 text-[#38BDF8]" />
                    <span>Team Size: {ngo.teamSize || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#CBD5E1]">
                    <Activity className="w-4 h-4 text-[#38BDF8]" />
                    <span>Live Team: {ngo.activeMembers || 0}</span>
                  </div>
                </div>

                {ngo.coverageAreas?.length ? (
                  <div className="mt-4">
                    <p className="text-xs text-[#94A3B8] uppercase mb-2">Coverage Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {ngo.coverageAreas.map((area, index) => (
                        <span
                          key={`${ngo.id}-coverage-${index}`}
                          className="text-xs bg-[#0F172A] border border-[#334155] text-[#CBD5E1] px-2 py-1 rounded"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </GovLayout>
  );
};

export default NGOPartners;
