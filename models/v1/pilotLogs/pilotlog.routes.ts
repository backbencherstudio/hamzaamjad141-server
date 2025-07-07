import express from "express";
import upload from "../../../config/multer.congig";
import { verifyUser } from "../../../middleware/verifyUsers";
import {createInstructorAndAddLog,getLogbookSummary, instructorApprov, instructorReject, deleteLog} from "./pilotlog.controllers";

const router = express.Router();

router.post("/add-addlog", verifyUser('ANY'), createInstructorAndAddLog);
router.get("/get-logbook", verifyUser('ANY'), getLogbookSummary);

router.post("/addlog-approve/:id", instructorApprov);
router.post("/addlog-reject/:id", instructorReject);

router.delete("/delete-log/:id", verifyUser('ANY'), deleteLog);

export default router;