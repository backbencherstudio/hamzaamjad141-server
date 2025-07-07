// src/routes/weather.route.ts
import express from 'express';
import { createInstructor,findInstructor, updateInstructor, deleteInstructor,userInstructor, myInstructor, toActiveInstructor, toDeActiveInstructor, getAllInstructors } from './instructors.controllers';
import { verifyUser } from "../../../middleware/verifyUsers";

const router = express.Router();

router.post('/create',verifyUser('ADMIN'), createInstructor);
router.post('/set-instructor/:id',verifyUser('ANY'), userInstructor);

router.get('/my-instructor', verifyUser('ANY'), myInstructor )

router.get('/find',  findInstructor);

router.patch('/update/:id', verifyUser('ADMIN'), updateInstructor); 
router.delete('/delete/:id', verifyUser('ADMIN'), deleteInstructor);


router.patch('/to-active/:id', verifyUser('ADMIN'), toActiveInstructor);  
router.patch('/to-deactive/:id', verifyUser('ADMIN'), toDeActiveInstructor);  

router.get('/all-instructors', getAllInstructors)

export default router;