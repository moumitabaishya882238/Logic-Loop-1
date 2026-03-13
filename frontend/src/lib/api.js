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
  
  resolveIncident: async (id) => {
    const response = await axios.patch(`${API}/incidents/${id}/resolve`);
    return response.data;
  },
  
  getIncidentStats: async () => {
    const response = await axios.get(`${API}/incidents/stats/summary`);
    return response.data;
  },
};

export default api;
