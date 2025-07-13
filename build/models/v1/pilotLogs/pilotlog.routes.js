"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const verifyUsers_1 = require("../../../middleware/verifyUsers");
const pilotlog_controllers_1 = require("./pilotlog.controllers");
const premiumGuard_1 = require("../../../middleware/premiumGuard");
const router = express_1.default.Router();
router.post("/add-addlog", (0, verifyUsers_1.verifyUser)('ANY'), premiumGuard_1.premiumGuard, pilotlog_controllers_1.createLog);
router.get("/get-logbook", (0, verifyUsers_1.verifyUser)('ANY'), pilotlog_controllers_1.getLogbook);
router.post("/addlog-approve/:id", pilotlog_controllers_1.instructorApprov);
router.post("/addlog-reject/:id", pilotlog_controllers_1.instructorReject);
router.get("/get-logsummary", (0, verifyUsers_1.verifyUser)('ANY'), premiumGuard_1.premiumGuard, pilotlog_controllers_1.getLogSummary);
router.delete("/delete-log/:id", (0, verifyUsers_1.verifyUser)('ANY'), pilotlog_controllers_1.deleteLog);
router.get("/get-user-log-summary", (0, verifyUsers_1.verifyUser)('USER'), premiumGuard_1.premiumGuard, pilotlog_controllers_1.getAllUserLogSummaries);
// Add this new route
router.get("/get-user-logs/:userId", pilotlog_controllers_1.getUserLogs);
exports.default = router;
//# sourceMappingURL=pilotlog.routes.js.map