// src/routes/weather.route.ts
import express from 'express';
 
import { verifyUser } from "../../../middleware/verifyUsers";
import { createPortcusts, deletePortcusts, getAllPortcusts, updatePortcusts } from './portcusts.controllers';
import upload from '../../../config/multer.config';
import { premiumGuard } from '../../../middleware/premiumGuard';


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

router.get("/all",  verifyUser('ANY'), getAllPortcusts);
router.get("/get-all-portcusts", verifyUser('USER'), premiumGuard, getAllPortcusts);

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
