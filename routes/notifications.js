import express from 'express';
import User from '../models/User.js';
import { sendPushNotification } from '../services/notificationManager.js';

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

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: token,
                title: title,
                body: body,
            }),
        });

        const result = await response.json();
        
        if (response.ok) {
            res.json({ 
                success: true, 
                message: 'Notification envoyée avec succès',
                result: result 
            });
        } else {
            res.status(400).json({ 
                error: 'Erreur lors de l\'envoi de la notification',
                result: result 
            });
        }
        
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

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: token,
                title: title,
                body: body,
            }),
        });

        const result = await response.json();
        
        if (response.ok) {
            res.json({ 
                success: true, 
                message: 'Notification envoyée avec succès',
                result: result 
            });
        } else {
            res.status(400).json({ 
                error: 'Erreur lors de l\'envoi de la notification',
                result: result 
            });
        }
        
    } catch (error) {
        console.error('Erreur lors du test de notification:', error);
        res.status(500).json({ 
            error: 'Erreur interne du serveur',
            message: error.message 
        });
    }
});

export default router;