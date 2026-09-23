import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

router.use(authenticateUser);

// Proxy endpoint to test ML service connectivity
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.ML_SERVICE_URL}/health`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      error: 'ML service unavailable', 
      details: error.message 
    });
  }
});

export default router;
