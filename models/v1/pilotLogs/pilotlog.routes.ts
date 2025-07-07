import express from "express";
import upload from "../../../config/multer.congig";
import { verifyUser } from "../../../middleware/verifyUsers";
import {createLog, getLogbook, instructorApprov, instructorReject, deleteLog, getLogSummary} from "./pilotlog.controllers";

const router = express.Router();

router.post("/add-addlog", verifyUser('ANY'), createLog);
router.get("/get-logbook", verifyUser('ANY'), getLogbook);

router.post("/addlog-approve/:id", instructorApprov);
router.post("/addlog-reject/:id", instructorReject);

router.get("/get-logsummary", verifyUser('USER'), getLogSummary);


router.delete("/delete-log/:id", verifyUser('ANY'), deleteLog);

export default router;