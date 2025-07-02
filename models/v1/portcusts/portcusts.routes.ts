// src/routes/weather.route.ts
import express from 'express';
 
import { verifyUser } from "../../../middleware/verifyUsers";
import { createPortcusts, deletePortcusts, getAllPortcusts, updatePortcusts } from './portcusts.controllers';
import upload from '../../../config/multer.congig';


const router = express.Router();

 
 router.post(
  "/create", 
  verifyUser('ADMIN'),
  upload.fields([
    { name: 'mp3', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  createPortcusts
);

router.get("/all",getAllPortcusts);

router.patch(
  "/update/:id", 
  upload.fields([
    { name: 'mp3', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  updatePortcusts
);


router.delete("/delete/:id", deletePortcusts);

export default router;