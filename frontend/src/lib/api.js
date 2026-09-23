import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || response.statusText);
  }

  return response.json();
}

export const api = {
  // Stations
  getStations: () => apiRequest('/stations'),
  getAllStations: () => apiRequest('/stations'),
  getStation: (id) => apiRequest(`/stations/${id}`),
  getStationDashboard: (id) => apiRequest(`/stations/${id}/dashboard`),

  // Personnel
  getPersonnel: () => apiRequest('/personnel'),
  getPersonnelMe: () => apiRequest('/personnel/me'),

  // Inventory
  getStationInventory: (stationId) => apiRequest(`/inventory/station/${stationId}`),
  addInventory: (itemData) => apiRequest('/inventory', { method: 'POST', body: JSON.stringify(itemData) }),
  forecastInventory: (itemId) => apiRequest(`/inventory/${itemId}/forecast`, { method: 'POST' }),
  deleteInventoryItem: (itemId) => apiRequest(`/inventory/${itemId}`, { method: 'DELETE' }),

  // Cargo
  getCargo: () => apiRequest('/cargo'),
  optimizeCargo: (manifestId, constraints) => 
    apiRequest(`/cargo/${manifestId}/optimize`, {
      method: 'POST',
      body: JSON.stringify(constraints),
    }),

  // Routes
  getRoutes: () => apiRequest('/routes'),
  computeRoute: (routeData) =>
    apiRequest('/routes/compute', {
      method: 'POST',
      body: JSON.stringify(routeData),
    }),

  // Hazards
  getHazards: (status) => apiRequest(`/hazards${status ? `?status=${status}` : ''}`),
  detectHazards: (imageUrl) =>
    apiRequest('/hazards/detect', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    }),

  // SOS
  getSOSEvents: (status) => apiRequest(`/sos${status ? `?status=${status}` : ''}`),
  createSOS: (sosData) =>
    apiRequest('/sos', {
      method: 'POST',
      body: JSON.stringify(sosData),
    }),
  acknowledgeSOS: (id) =>
    apiRequest(`/sos/${id}/acknowledge`, { method: 'PUT' }),

  // Wellness
  getPersonnelWellness: (personnelId) => apiRequest(`/wellness/personnel/${personnelId}`),
  getStationWellness: (stationId) => apiRequest(`/wellness/station/${stationId}`),
  submitWellness: (wellnessData) =>
    apiRequest('/wellness', {
      method: 'POST',
      body: JSON.stringify(wellnessData),
    }),

  // Alerts
  getAlerts: (isRead) =>
    apiRequest(`/alerts${isRead !== undefined ? `?isRead=${isRead}` : ''}`),
  acknowledgeAlert: (id) =>
    apiRequest(`/alerts/${id}/acknowledge`, { method: 'PUT' }),

  // Compliance
  getComplianceFlags: (resolved) =>
    apiRequest(`/compliance${resolved !== undefined ? `?resolved=${resolved}` : ''}`),

  // Weather snapshots
  getLatestWeatherSnapshot: () =>
    apiRequest('/weather-snapshots/latest'),

  // Audit
  getAuditLogs: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/audit${query ? `?${query}` : ''}`);
  },

  // Additional helper functions for dashboards
  getAllStations: () => apiRequest('/stations'),
  getAllPersonnel: () => apiRequest('/personnel'),
  getAllWellness: () => apiRequest('/wellness'),
  getAllSOS: () => apiRequest('/sos'),
  getAllAlerts: () => apiRequest('/alerts'),

  // Search functions
  searchInventory: async (query) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .or(`item_name.ilike.%${query}%,category.ilike.%${query}%`)
        .limit(5);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search inventory error:', error);
      return [];
    }
  },

  searchPersonnel: async (query) => {
    try {
      const { data, error } = await supabase
        .from('personnel')
        .select('*')
        .or(`full_name.ilike.%${query}%,role.ilike.%${query}%`)
        .limit(5);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search personnel error:', error);
      return [];
    }
  },

  searchAlerts: async (query) => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search alerts error:', error);
      return [];
    }
  },
};
