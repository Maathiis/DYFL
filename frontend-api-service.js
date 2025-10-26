// Service API centralisé pour le frontend
import API_CONFIG from "./api-config.js";

class DYFLAPIService {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
  }

  // Méthode générique pour les requêtes
  async request(endpoint, options = {}) {
    const url = API_CONFIG.buildURL(endpoint);
    const config = {
      ...options,
      headers: {
        ...API_CONFIG.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // === USERS ===
  async createUser(deviceId, pushToken = null) {
    return this.request(API_CONFIG.endpoints.users.create, {
      method: "POST",
      body: JSON.stringify({ deviceId, pushToken }),
    });
  }

  // === FRIENDS ===
  async getFriends(deviceId) {
    return this.request(API_CONFIG.endpoints.friends.getAll, {
      method: "GET",
      headers: API_CONFIG.getHeaders(deviceId),
    });
  }

  async getFriendsStats(deviceId) {
    return this.request(API_CONFIG.endpoints.friends.getStats, {
      method: "GET",
      headers: API_CONFIG.getHeaders(deviceId),
    });
  }

  async addFriend(deviceId, riotId) {
    return this.request(API_CONFIG.endpoints.friends.add, {
      method: "POST",
      headers: API_CONFIG.getHeaders(deviceId),
      body: JSON.stringify({ riotId }),
    });
  }

  async removeFriends(deviceId, riotIds) {
    return this.request(API_CONFIG.endpoints.friends.remove, {
      method: "DELETE",
      headers: API_CONFIG.getHeaders(deviceId),
      body: JSON.stringify({ riotIds }),
    });
  }

  // === NOTIFICATIONS ===
  async registerPushToken(deviceId, token) {
    return this.request(API_CONFIG.endpoints.notifications.register, {
      method: "POST",
      headers: { "X-Device-ID": deviceId },
      body: JSON.stringify({ token }),
    });
  }

  async testNotification(token, title = "Test", body = "Hello!") {
    return this.request(API_CONFIG.endpoints.notifications.test, {
      method: "POST",
      body: JSON.stringify({ token, title, body }),
    });
  }

  // === HEALTH ===
  async checkHealth() {
    return this.request(API_CONFIG.endpoints.health);
  }

  // === DOCUMENTATION ===
  async getAPIDocs() {
    return this.request("/");
  }
}

// Instance singleton
const apiService = new DYFLAPIService();

export default apiService;

// Exemple d'utilisation :
/*
import apiService from './frontend-api-service.js';

// Créer un utilisateur
const user = await apiService.createUser('device-123', 'push-token-456');

// Récupérer les amis
const friends = await apiService.getFriends('device-123');

// Récupérer les stats
const stats = await apiService.getFriendsStats('device-123');

// Ajouter un ami
await apiService.addFriend('device-123', 'Zoorva#EUW');

// Supprimer des amis
await apiService.removeFriends('device-123', ['Zoorva#EUW', 'Inoxtag2#EUW']);
*/
