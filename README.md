# DYFL Backend

## 🇫🇷 Français

**DYFL** (Did Your Friend Lose) est une API backend qui permet de suivre les performances de vos amis sur League of Legends et de recevoir des notifications en temps réel lorsqu'ils perdent une partie classée.

### ✨ Fonctionnalités

- 🎮 **Suivi automatique** des parties classées de vos amis
- 🔔 **Notifications push** instantanées lors des défaites
- 📊 **Statistiques détaillées** : rangs, LP, KDA, durée des parties
- ⚡ **Monitoring en temps réel** toutes les 2 minutes
- 👥 **Gestion multi-utilisateurs** avec partage des joueurs

### 🚀 Démarrage rapide

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Ajoutez votre RIOT_API_KEY

# Démarrage
npm start
```

### 📡 API

Base URL: `http://localhost:3000/api`

- `POST /api/users` - Créer un utilisateur
- `GET /api/friends` - Liste des amis
- `POST /api/friends` - Ajouter un ami
- `GET /api/friends/stats` - Statistiques
- `GET /api` - Documentation complète

---

## 🇬🇧 English

**DYFL** (Did Your Friend Lose) is a backend API that allows you to track your friends' League of Legends performance and receive real-time notifications when they lose a ranked game.

### ✨ Features

- 🎮 **Automatic tracking** of your friends' ranked games
- 🔔 **Instant push notifications** on defeats
- 📊 **Detailed statistics**: ranks, LP, KDA, game duration
- ⚡ **Real-time monitoring** every 2 minutes
- 👥 **Multi-user management** with player sharing

### 🚀 Quick Start

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Add your RIOT_API_KEY

# Start
npm start
```

### 📡 API

Base URL: `http://localhost:3000/api`

- `POST /api/users` - Create user
- `GET /api/friends` - Friends list
- `POST /api/friends` - Add friend
- `GET /api/friends/stats` - Statistics
- `GET /api` - Complete documentation

---

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB
- **API**: Riot Games API
- **Notifications**: Expo Push Notifications
- **Deployment**: Render.com

## 📄 License

MIT
