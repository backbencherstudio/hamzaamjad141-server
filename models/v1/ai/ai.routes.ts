// src/routes/weather.route.ts
import express from 'express';
 
import { verifyUser } from "../../../middleware/verifyUsers";
import { generateAIResponse } from './ai.controllers';

const router = express.Router();

router.get('/generate', generateAIResponse);
 
export default router;