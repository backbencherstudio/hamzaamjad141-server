import express from "express";
import upload from "../../../config/multer.config";
import { verifyUser } from "../../../middleware/verifyUsers";
import {
  createLog, 
  getLogbook, 
  instructorApprov, 
  instructorReject, 
  deleteLog, 
  getLogSummary, 
  getAllUserLogSummaries, 
  getUserLogs,
  reviewLogPage
} from "./pilotlog.controllers";
import { premiumGuard } from "../../../middleware/premiumGuard";

const router = express.Router();

router.post("/add-addlog", verifyUser('ANY'), premiumGuard, createLog);
router.get("/get-logbook", verifyUser('ANY'), getLogbook);

// New route for reviewing logs
router.get("/review-log/:id", reviewLogPage);

router.post("/addlog-approve/:id", instructorApprov);
router.post("/addlog-reject/:id", instructorReject);

router.get("/get-logsummary", verifyUser('ANY'), premiumGuard, getLogSummary);

router.delete("/delete-log/:id", verifyUser('ANY'), premiumGuard, deleteLog);

router.get("/get-user-log-summary", verifyUser('ADMIN'), getAllUserLogSummaries);

router.get("/get-user-logs/:userId", getUserLogs);

export default router;