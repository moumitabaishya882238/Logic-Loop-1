import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const api = {
  // Incidents
  createSOSIncident: async (data) => {
    const response = await axios.post(`${API}/incidents/sos`, data);
    return response.data;
  },
  
  createCCTVIncident: async (data) => {
    const response = await axios.post(`${API}/incidents/cctv`, data);
    return response.data;
  },
  
  createDisasterIncident: async (data) => {
    const response = await axios.post(`${API}/incidents/disaster`, data);
    return response.data;
  },
  
  getIncidents: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await axios.get(`${API}/incidents?${params.toString()}`);
    return response.data;
  },
  
  getIncidentById: async (id) => {
    const response = await axios.get(`${API}/incidents/${id}`);
    return response.data;
  },
  
  respondToIncident: async (id, data) => {
    const response = await axios.patch(`${API}/incidents/${id}/respond`, data);
    return response.data;
  },

  autoAssignNearestNGO: async (id) => {
    const response = await axios.patch(`${API}/incidents/${id}/auto-assign-ngo`);
    return response.data;
  },
  
  resolveIncident: async (id) => {
    const response = await axios.patch(`${API}/incidents/${id}/resolve`);
    return response.data;
  },
  
  getIncidentStats: async () => {
    const response = await axios.get(`${API}/incidents/stats/summary`);
    return response.data;
  },

  // NGOs
  getNGOPartners: async () => {
    const response = await axios.get(`${API}/ngos`);
    return response.data;
  },

  createNGORequest: async (data) => {
    const response = await axios.post(`${API}/ngo-requests`, data);
    return response.data;
  },

  getNGORequests: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await axios.get(`${API}/ngo-requests?${params.toString()}`);
    return response.data;
  },

  approveNGORequest: async (requestId) => {
    const response = await axios.patch(`${API}/ngo-requests/${requestId}/approve`);
    return response.data;
  },

  rejectNGORequest: async (requestId) => {
    const response = await axios.patch(`${API}/ngo-requests/${requestId}/reject`);
    return response.data;
  },

  ngoLogin: async (credentials) => {
    const response = await axios.post(`${API}/ngo-auth/login`, credentials);
    return response.data;
  },

  ngoLogout: async (token) => {
    const response = await axios.post(
      `${API}/ngo-auth/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  getNGOProfile: async (token) => {
    const response = await axios.get(`${API}/ngo-auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  updateNGOAvailability: async (token, payload) => {
    const response = await axios.patch(`${API}/ngo-auth/availability`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  getNGOAssignedIncidents: async (token) => {
    const response = await axios.get(`${API}/ngo-auth/incidents`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};

export default api;
