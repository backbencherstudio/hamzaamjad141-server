import express from "express";
import { verifyUser } from "../../../middleware/verifyUsers";
import upload from "../../../config/multer.congig";
import { createPromoCode } from "./promocode.controllers"

const router = express.Router();

 router.post("/create-promocode", createPromoCode);


export default router;
