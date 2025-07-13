"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/weather.route.ts
const express_1 = __importDefault(require("express"));
const instructors_controllers_1 = require("./instructors.controllers");
const verifyUsers_1 = require("../../../middleware/verifyUsers");
const premiumGuard_1 = require("../../../middleware/premiumGuard");
const router = express_1.default.Router();
router.post("/create", (0, verifyUsers_1.verifyUser)("ADMIN"), instructors_controllers_1.createInstructor); //by admin
//conduction route create Instructor a user
router.post("/create-by-user", (0, verifyUsers_1.verifyUser)("USER"), instructors_controllers_1.createInstructorByUser);
router.post("/set-instructor/:id", (0, verifyUsers_1.verifyUser)("ANY"), premiumGuard_1.premiumGuard, instructors_controllers_1.userInstructor);
router.get("/my-instructor", (0, verifyUsers_1.verifyUser)("ANY"), premiumGuard_1.premiumGuard, instructors_controllers_1.myInstructor);
router.get("/find", (0, verifyUsers_1.verifyUser)("ANY"), premiumGuard_1.premiumGuard, instructors_controllers_1.findInstructor);
router.patch("/update/:id", (0, verifyUsers_1.verifyUser)("ADMIN"), instructors_controllers_1.updateInstructor);
router.delete("/delete/:id", (0, verifyUsers_1.verifyUser)("ADMIN"), instructors_controllers_1.deleteInstructor);
router.patch("/to-active/:id", (0, verifyUsers_1.verifyUser)("ADMIN"), instructors_controllers_1.toActiveInstructor);
router.patch("/to-deactive/:id", (0, verifyUsers_1.verifyUser)("ADMIN"), instructors_controllers_1.toDeActiveInstructor);
router.get("/all-instructors", (0, verifyUsers_1.verifyUser)("ADMIN"), instructors_controllers_1.getAllInstructors);
exports.default = router;
//# sourceMappingURL=instructors.routes.js.map