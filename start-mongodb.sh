#!/bin/bash

echo "🚀 Démarrage de MongoDB..."

# Vérifier si MongoDB est installé
if ! command -v mongod &> /dev/null; then
    echo " MongoDB n'est pas installé. Veuillez l'installer d'abord."
    echo "Sur macOS avec Homebrew: brew install mongodb-community"
    echo "Ou téléchargez depuis: https://www.mongodb.com/try/download/community"
    exit 1
fi

# Créer le répertoire de données s'il n'existe pas
mkdir -p ~/data/db

# Démarrer MongoDB
echo "📁 Utilisation du répertoire de données: ~/data/db"
echo "🔗 MongoDB sera accessible sur: mongodb://localhost:27017"
echo "⏹️  Pour arrêter MongoDB, appuyez sur Ctrl+C"
echo ""

mongod --dbpath ~/data/db 