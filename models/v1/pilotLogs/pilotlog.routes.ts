import express from "express";
import upload from "../../../config/multer.congig";
import { verifyUser } from "../../../middleware/verifyUsers";
import {createLog, getLogbook, instructorApprov, instructorReject, deleteLog, getLogSummary, getAllUserLogSummaries, getUserLogs} from "./pilotlog.controllers";
import { premiumGuard } from "../../../middleware/premiumGuard";

const router = express.Router();

router.post("/add-addlog", verifyUser('ANY'), premiumGuard, createLog);
router.get("/get-logbook", verifyUser('ANY'), getLogbook);

router.post("/addlog-approve/:id", instructorApprov);
router.post("/addlog-reject/:id", instructorReject);

router.get("/get-logsummary", verifyUser('USER'),  premiumGuard, getLogSummary);

router.delete("/delete-log/:id", verifyUser('ANY'), premiumGuard, deleteLog);

router.get("/get-user-log-summary", verifyUser('ADMIN'),  getAllUserLogSummaries);

// Add this new route
router.get("/get-user-logs/:userId", getUserLogs);

export default router;