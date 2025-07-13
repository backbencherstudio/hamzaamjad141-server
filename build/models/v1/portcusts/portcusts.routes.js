"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/weather.route.ts
const express_1 = __importDefault(require("express"));
const verifyUsers_1 = require("../../../middleware/verifyUsers");
const portcusts_controllers_1 = require("./portcusts.controllers");
const multer_congig_1 = __importDefault(require("../../../config/multer.congig"));
const premiumGuard_1 = require("../../../middleware/premiumGuard");
const router = express_1.default.Router();
router.post("/create", (0, verifyUsers_1.verifyUser)('ADMIN'), multer_congig_1.default.fields([
    { name: 'mp3', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), portcusts_controllers_1.createPortcusts);
router.get("/all", portcusts_controllers_1.getAllPortcusts);
router.get("/get-all-portcusts", (0, verifyUsers_1.verifyUser)('USER'), premiumGuard_1.premiumGuard, portcusts_controllers_1.getAllPortcusts);
router.patch("/update/:id", multer_congig_1.default.fields([
    { name: 'mp3', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), portcusts_controllers_1.updatePortcusts);
router.delete("/delete/:id", portcusts_controllers_1.deletePortcusts);
exports.default = router;
//# sourceMappingURL=portcusts.routes.js.map