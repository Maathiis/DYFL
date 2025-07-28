import express from 'express';
import  User from '../models/User.js';

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


export default router;