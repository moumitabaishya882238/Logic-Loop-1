import { useEffect, useState } from 'react';
import { GovLayout } from '@/components/GovLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { FilePlus2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NGORequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  const fetchRequests = async () => {
    try {
      const data = await api.getNGORequests();
      setRequests(data);
    } catch (error) {
      console.error('Error loading NGO requests:', error);
      toast.error('Failed to load NGO requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateRequestStatus = async (requestId, action) => {
    try {
      if (action === 'approve') {
        await api.approveNGORequest(requestId);
        toast.success('NGO request approved and partner added');
      } else {
        await api.rejectNGORequest(requestId);
        toast.success('NGO request rejected');
      }
      fetchRequests();
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update NGO request');
    }
  };

  const pendingCount = requests.filter((item) => item.status === 'PENDING').length;

  return (
    <GovLayout>
      <div className="p-6 space-y-6" data-testid="ngo-requests-page">
        <div>
          <h1 className="text-3xl font-bold text-white">NGO REQUESTS</h1>
          <p className="text-[#94A3B8] mt-1">Review NGO onboarding requests</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Total Requests</p>
            <p className="text-3xl font-bold text-white mt-2">{requests.length}</p>
          </div>
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Pending</p>
            <p className="text-3xl font-bold text-[#F59E0B] mt-2">{pendingCount}</p>
          </div>
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
            <p className="text-[#94A3B8] text-sm uppercase">Join Form URL</p>
            <p className="text-sm font-semibold text-[#38BDF8] mt-2">/ngo/join</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#94A3B8]">Loading NGO requests...</div>
        ) : requests.length === 0 ? (
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-12 text-center">
            <FilePlus2 className="w-12 h-12 mx-auto mb-3 text-[#94A3B8] opacity-50" />
            <p className="text-[#94A3B8]">No NGO requests available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-[#1E293B] border border-[#334155] rounded-lg p-5"
                data-testid={`ngo-request-${request.id}`}
              >
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{request.organizationName}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded border ${
                          request.status === 'PENDING'
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                            : request.status === 'APPROVED'
                              ? 'bg-green-500/20 text-green-400 border-green-500/40'
                              : 'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <p className="text-[#CBD5E1] text-sm">
                      {request.contactPerson} | {request.phone} | {request.email}
                    </p>
                    <p className="text-[#94A3B8] text-sm mt-1">City: {request.city}</p>
                    <p className="text-[#94A3B8] text-sm mt-1">
                      Team Size: {request.teamSize || 0} | HQ: {request.latitude}, {request.longitude}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRequestId((previous) =>
                          previous === request.id ? null : request.id
                        )
                      }
                      className="mt-3 text-sm text-[#38BDF8] hover:text-[#7DD3FC]"
                      data-testid={`toggle-details-${request.id}`}
                    >
                      {expandedRequestId === request.id ? 'Show Less' : 'Read Full Details'}
                    </button>

                    {expandedRequestId === request.id && (
                      <div className="mt-3 bg-[#0F172A] border border-[#334155] rounded-md p-3 space-y-2 text-sm">
                        <p className="text-[#CBD5E1]">
                          <span className="text-[#94A3B8]">Coverage Areas: </span>
                          {request.coverageAreas?.length
                            ? request.coverageAreas.join(', ')
                            : 'Not provided'}
                        </p>
                        <p className="text-[#CBD5E1]">
                          <span className="text-[#94A3B8]">Capabilities: </span>
                          {request.capabilities?.length
                            ? request.capabilities.join(', ')
                            : 'Not provided'}
                        </p>
                        <p className="text-[#CBD5E1]">
                          <span className="text-[#94A3B8]">Requested At: </span>
                          {request.createdAt || 'N/A'}
                        </p>
                        <p className="text-[#CBD5E1]">
                          <span className="text-[#94A3B8]">Reviewed At: </span>
                          {request.reviewedAt || 'Not reviewed yet'}
                        </p>
                      </div>
                    )}
                  </div>

                  {request.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateRequestStatus(request.id, 'approve')}
                        className="bg-[#059669] hover:bg-[#047857] text-white"
                        data-testid={`approve-ngo-${request.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => updateRequestStatus(request.id, 'reject')}
                        className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                        data-testid={`reject-ngo-${request.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GovLayout>
  );
};

export default NGORequests;
