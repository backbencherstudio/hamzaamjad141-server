import express from "express";
import upload from "../../../config/multer.congig";
import { verifyUser } from "../../../middleware/verifyUsers";
import {createInstructorAndAddLog,getLogbookSummary,instructorApprov,instructorReject} from "./pilotlog.controllers";

const router = express.Router();

router.post("/add-addlog", verifyUser('USER'), createInstructorAndAddLog);
router.get("/get-logbook", verifyUser('USER'), getLogbookSummary);
router.post("/addlog-approve/:id", verifyUser('USER'), instructorApprov);
router.post("/addlog-reject/:id", verifyUser('USER'), instructorReject);
router.post("/addlog-pending/:id", verifyUser('USER'), instructorApprov);



export default router;