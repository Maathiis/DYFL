import express from 'express';
import User from '../models/User.js';
import { sendPushNotification } from '../services/notificationManager.js';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();
const router = express.Router();

// POST /push/register
router.post('/push/register', async (req, res) => {
    const deviceId = req.headers['x-device-id'];
    const { token } = req.body;
  
    if (!deviceId || !token) {
      return res.status(400).json({ error: 'deviceId ou token manquant' });
    }
  
    const user = await User.findOneAndUpdate(
      { deviceId },
      { pushToken: token },
      { upsert: true, new: true }
    );
  
    res.json({ success: true, user });
});

router.post('/push/all', async (req, res) => {
    const { message } = req.body;
    const users = await User.find({ expoPushToken: { $exists: true } });
  
    for (const user of users) {
      await sendPushNotification(user.expoPushToken, message);
    }
  
    res.json({ success: true });
});

// Endpoint de test pour les notifications push
router.post('/push/test', async (req, res) => {
    try {
        const { token, title = 'Test notification', body = 'Hello from backend!' } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token manquant' });
        }

        // Utiliser le SDK Expo
        const messages = [{
            to: token,
            sound: 'default',
            title: title,
            body: body,
            data: { custom: 'data' },
        }];

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (let chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('Erreur lors de l\'envoi du chunk:', error);
            }
        }

        res.json({ 
            success: true, 
            message: 'Notification envoyée avec succès',
            tickets: tickets 
        });
        
    } catch (error) {
        console.error('Erreur lors du test de notification:', error);
        res.status(500).json({ 
            error: 'Erreur interne du serveur',
            message: error.message 
        });
    }
});

// Endpoint de test simple avec token fixe
router.post('/push/test-simple', async (req, res) => {
    try {
        const token = 'ExponentPushToken[oG2n4SGizqfsT8B593dGhj]';
        const { title = 'Test notification', body = 'Hello from backend!' } = req.body;

        // Vérifier si le token est valide
        if (!Expo.isExpoPushToken(token)) {
            return res.status(400).json({ 
                error: 'Token Expo invalide',
                token: token 
            });
        }

        // Utiliser le SDK Expo avec configuration minimale
        const messages = [{
            to: token,
            sound: 'default',
            title: title,
            body: body,
            priority: 'high',
            channelId: 'default',
        }];

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (let chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('Erreur lors de l\'envoi du chunk:', error);
            }
        }

        // Vérifier les résultats
        const errors = tickets.filter(ticket => ticket.status === 'error');
        const success = tickets.filter(ticket => ticket.status === 'ok');

        res.json({ 
            success: errors.length === 0,
            message: errors.length === 0 ? 'Notification envoyée avec succès' : 'Erreurs lors de l\'envoi',
            tickets: tickets,
            errors: errors,
            success_count: success.length,
            error_count: errors.length
        });
        
    } catch (error) {
        console.error('Erreur lors du test de notification:', error);
        res.status(500).json({ 
            error: 'Erreur interne du serveur',
            message: error.message 
        });
    }
});

// Endpoint alternatif avec API Expo directe
router.post('/push/test-direct', async (req, res) => {
    try {
        const token = 'ExponentPushToken[oG2n4SGizqfsT8B593dGhj]';
        const { title = 'Test notification', body = 'Hello from backend!' } = req.body;

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
            },
            body: JSON.stringify({
                to: token,
                title: title,
                body: body,
                sound: 'default',
                priority: 'high',
            }),
        });

        const result = await response.json();
        
        res.json({ 
            success: response.ok,
            message: response.ok ? 'Notification envoyée avec succès' : 'Erreur lors de l\'envoi',
            status: response.status,
            result: result 
        });
        
    } catch (error) {
        console.error('Erreur lors du test de notification:', error);
        res.status(500).json({ 
            error: 'Erreur interne du serveur',
            message: error.message 
        });
    }
});

export default router;