# DYFL Backend API Documentation

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### Users

- `POST /api/users` - Créer/récupérer un utilisateur
  - Body: `{ deviceId: string, pushToken?: string }`

### Friends

- `GET /api/friends` - Récupérer tous les amis
  - Headers: `X-Device-ID: your-device-id`
- `GET /api/friends/stats` - Statistiques des amis
  - Headers: `X-Device-ID: your-device-id`
- `POST /api/friends` - Ajouter un ami
  - Headers: `X-Device-ID: your-device-id`
  - Body: `{ riotId: string }`
- `DELETE /api/friends` - Supprimer des amis
  - Headers: `X-Device-ID: your-device-id`
  - Body: `{ riotIds: string[] }`

### Notifications

- `POST /api/notifications/push/register` - Enregistrer token
- `POST /api/notifications/push/test` - Tester notification

### Health

- `GET /api/health` - État de l'API

### Documentation

- `GET /api` - Documentation complète de l'API

## Utilisation Frontend

### Avec le service centralisé

```javascript
import apiService from "./frontend-api-service.js";

// Toutes les méthodes sont disponibles
const friends = await apiService.getFriends("device-123");
const stats = await apiService.getFriendsStats("device-123");
```

### Avec fetch direct

```javascript
const response = await fetch("http://localhost:3000/api/friends/stats", {
  headers: { "X-Device-ID": "device-123" },
});
```
