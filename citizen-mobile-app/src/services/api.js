import axios from 'axios';

// Candidate backend URLs for common local development setups.
const BACKEND_CANDIDATES = [
  'http://localhost:8001',
  'http://127.0.0.1:8001',
  'http://10.0.2.2:8001',
];

let preferredBackend = null;

const getOrderedBackends = () => {
  if (!preferredBackend) {
    return BACKEND_CANDIDATES;
  }
  return [preferredBackend, ...BACKEND_CANDIDATES.filter((url) => url !== preferredBackend)];
};

const isNetworkError = (error) => {
  if (!error) {
    return false;
  }
  return (
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error' ||
    (!error.response && !!error.request)
  );
};

const requestWithFallback = async (requestFactory) => {
  const errors = [];

  for (const backendUrl of getOrderedBackends()) {
    try {
      const response = await requestFactory(`${backendUrl}/api`);
      preferredBackend = backendUrl;
      return response.data;
    } catch (error) {
      errors.push({ backendUrl, error });
      if (!isNetworkError(error)) {
        throw error;
      }
    }
  }

  const attemptedHosts = getOrderedBackends().join(', ');
  console.error('API connection failed on all hosts:', attemptedHosts, errors);
  throw new Error(
    'Unable to reach backend. For physical Android via USB, run: adb reverse tcp:8001 tcp:8001, then retry.'
  );
};

const api = {
  // Create SOS incident
  createSOSIncident: async (data) => {
    try {
      return await requestWithFallback((apiBase) =>
        axios.post(`${apiBase}/incidents/sos`, data, { timeout: 20000 })
      );
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Get all incidents
  getIncidents: async (params = {}) => {
    try {
      return await requestWithFallback((apiBase) =>
        axios.get(`${apiBase}/incidents`, { params, timeout: 15000 })
      );
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Get incident stats
  getIncidentStats: async () => {
    try {
      return await requestWithFallback((apiBase) =>
        axios.get(`${apiBase}/incidents/stats/summary`, { timeout: 15000 })
      );
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
};

export default api;
