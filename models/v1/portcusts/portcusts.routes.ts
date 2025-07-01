// src/routes/weather.route.ts
import express from 'express';
 
import { verifyUser } from "../../../middleware/verifyUsers";
import { createPortcusts } from './portcusts.controllers';


const router = express.Router();

router.post("/create", verifyUser('USER'), createPortcusts);

 
export default router;