import axios from 'axios';

// Android emulator should use 10.0.2.2 to reach host machine.
const BACKEND_URL = 'http://10.0.2.2:8001';
const API_URL = `${BACKEND_URL}/api`;

const api = {
  // Create SOS incident
  createSOSIncident: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/incidents/sos`, data);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Get all incidents
  getIncidents: async (params = {}) => {
    try {
      const response = await axios.get(`${API_URL}/incidents`, { params });
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Get incident stats
  getIncidentStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/incidents/stats/summary`);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
};

export default api;
