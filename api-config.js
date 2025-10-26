// Configuration API centralisée pour le frontend
const API_CONFIG = {
  baseURL: process.env.API_BASE_URL || "http://localhost:3000/api",

  // Headers par défaut
  defaultHeaders: {
    "Content-Type": "application/json",
  },

  // Endpoints
  endpoints: {
    // Users
    users: {
      create: "/users",
      get: "/users",
    },

    // Friends
    friends: {
      getAll: "/friends",
      getStats: "/friends/stats",
      add: "/friends",
      remove: "/friends",
    },

    // Notifications
    notifications: {
      register: "/notifications/push/register",
      test: "/notifications/push/test",
      testSimple: "/notifications/push/test-simple",
      testDirect: "/notifications/push/test-direct",
    },

    // Health
    health: "/health",
  },

  // Fonctions utilitaires
  buildURL: (endpoint) => `${API_CONFIG.baseURL}${endpoint}`,

  // Headers avec deviceId
  getHeaders: (deviceId, additionalHeaders = {}) => ({
    ...API_CONFIG.defaultHeaders,
    "X-Device-ID": deviceId,
    ...additionalHeaders,
  }),
};

export default API_CONFIG;
