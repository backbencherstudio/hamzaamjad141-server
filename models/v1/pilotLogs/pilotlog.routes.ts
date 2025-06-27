import express from "express";
import upload from "../../../config/multer.congig";
import { verifyUser } from "../../../middleware/verifyUsers";
import {createInstructorAndAddLog} from "./pilotlog.controllers";

const router = express.Router();

router.post("/create-instructor",createInstructorAndAddLog);

export default router;