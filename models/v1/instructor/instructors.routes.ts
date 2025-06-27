// src/routes/weather.route.ts
import express from 'express';
import { createInstructor,userInstructor } from './instructors.controllers';
import { verifyUser } from "../../../middleware/verifyUsers";

const router = express.Router();

router.post('/create',verifyUser('ADMIN'), createInstructor);
router.get('/user_instructor',  userInstructor);

export default router;