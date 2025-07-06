// src/routes/weather.route.ts
import express from 'express';
import { createInstructor,findInstructor, updateInstructor, deleteInstructor,userInstructor, myInstructor } from './instructors.controllers';
import { verifyUser } from "../../../middleware/verifyUsers";

const router = express.Router();

router.post('/create',verifyUser('ADMIN'), createInstructor);
router.post('/set-instructor/:id',verifyUser('USER'), userInstructor);

router.get('/my-instructor', verifyUser('USER'), myInstructor )

router.get('/find',  findInstructor);

router.patch('/update/:id', verifyUser('ADMIN'), updateInstructor); 
router.delete('/delete/:id', verifyUser('ADMIN'), deleteInstructor);

export default router;