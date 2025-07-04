 
import express from 'express';
import { verifyUser } from "../../../middleware/verifyUsers";
import {
  createSubscription,
  cancelSubscription,
  getSubscriptionStatus,
  updateSubscription
} from './subscriptions.controllers';

const router = express.Router();

// Create a subscription
router.post('/create', verifyUser('USER'), createSubscription);

// // Cancel subscription
// router.post('/cancel', verifyUser('USER'), cancelSubscription);

// // Get subscription status
// router.get('/status', verifyUser('USER'), getSubscriptionStatus);

// // Update subscription
// router.put('/update', verifyUser('USER'), updateSubscription);

export default router;