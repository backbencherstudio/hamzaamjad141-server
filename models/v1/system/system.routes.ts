import express from "express";
import { verifyUser } from "../../../middleware/verifyUsers";
import { testGCSConnection, getSystemInfo } from "./system.controllers";

const router = express.Router();

// Test GCS connection - ADMIN only
router.get("/test-gcs", verifyUser("ADMIN"), testGCSConnection);

// Get system info - ADMIN only
router.get("/info", verifyUser("ADMIN"), getSystemInfo);

export default router;
