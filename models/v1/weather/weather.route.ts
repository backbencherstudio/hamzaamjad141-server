// src/routes/weather.route.ts
import express from 'express';
import { getWeather } from './weather.controller';

const router = express.Router();

router.get('/search', getWeather);

export default router;