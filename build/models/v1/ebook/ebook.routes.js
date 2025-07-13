"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const verifyUsers_1 = require("../../../middleware/verifyUsers");
const multer_congig_1 = __importDefault(require("../../../config/multer.congig"));
const ebook_controllers_1 = require("./ebook.controllers");
const premiumGuard_1 = require("../../../middleware/premiumGuard");
const router = express_1.default.Router();
router.post("/create", 
//   verifyUser('ADMIN'),
multer_congig_1.default.fields([
    { name: "pdf", maxCount: 1 },
    { name: "cover", maxCount: 1 },
]), ebook_controllers_1.createEbooks);
router.get("/all", (0, verifyUsers_1.verifyUser)("USER"), premiumGuard_1.premiumGuard, ebook_controllers_1.getAllebook);
router.get("/all-ebook", (0, verifyUsers_1.verifyUser)("ADMIN"), ebook_controllers_1.searchEbooks);
router.patch("/update/:id", multer_congig_1.default.fields([
    { name: "pdf", maxCount: 1 },
    { name: "cover", maxCount: 1 },
]), ebook_controllers_1.updateEbook);
router.delete("/delete/:id", (0, verifyUsers_1.verifyUser)("ADMIN"), ebook_controllers_1.deleteEbook);
exports.default = router;
//# sourceMappingURL=ebook.routes.js.map