import express from 'express';
import {
  getUserProfile,
  getUserEarnings,
  createOrUpdateUser,
  getInfluencerLeaderboard,
} from '../controllers/userController.js';

const router = express.Router();

// User routes
router.post('/', createOrUpdateUser);
router.get('/influencers/leaderboard', getInfluencerLeaderboard);
router.get('/:telegramId', getUserProfile);
router.get('/:telegramId/earnings', getUserEarnings);

export default router;
