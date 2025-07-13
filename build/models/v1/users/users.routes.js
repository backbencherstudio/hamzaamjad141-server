"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const users_controllers_1 = require("./users.controllers");
const multer_congig_1 = __importDefault(require("../../../config/multer.congig"));
const verifyUsers_1 = require("../../../middleware/verifyUsers");
const admin_controllers_1 = require("./admin.controllers");
const router = express_1.default.Router();
router.post("/register", users_controllers_1.createUser);
router.post("/registerVerify", users_controllers_1.verifyOtpAndCreateUser);
router.post("/login", users_controllers_1.loginUser);
router.post("/forgetPassword", users_controllers_1.forgotPassword);
router.post("/verify-top", users_controllers_1.verifyOtpAndResetPassword);
router.patch("/resent-otp", users_controllers_1.resentOtp);
router.put("/change-password", users_controllers_1.resetPassword);
router.patch("/update-password", (0, verifyUsers_1.verifyUser)("ANY"), users_controllers_1.changePassword);
router.post("/google-login", users_controllers_1.googleLogin);
router.post("/facebook-login", users_controllers_1.facebookLogin);
router.get("/me", (0, verifyUsers_1.verifyUser)("ANY"), users_controllers_1.userInfo);
router.post("/delete", (0, verifyUsers_1.verifyUser)("ANY"), users_controllers_1.deleteUser);
router.patch("/update-user", (0, verifyUsers_1.verifyUser)("ANY"), multer_congig_1.default.single("image"), users_controllers_1.updateUser);
router.get("/all-pilot-user", (0, verifyUsers_1.verifyUser)("ADMIN"), admin_controllers_1.getAllPilotUser);
router.get("/membership", (0, verifyUsers_1.verifyUser)("ADMIN"), admin_controllers_1.membership);
router.get("/dashboard", (0, verifyUsers_1.verifyUser)("ADMIN"), admin_controllers_1.overview);
router.patch("/to-active-user/:id", (0, verifyUsers_1.verifyUser)("ADMIN"), admin_controllers_1.toActiveUser);
router.patch("/to-deactive-user/:id", (0, verifyUsers_1.verifyUser)("ADMIN"), admin_controllers_1.toDeActiveUser);
//stpe1
router.post("/send-change-email-otp", (0, verifyUsers_1.verifyUser)("ANY"), users_controllers_1.sendChangeEmailOtp);
//step2
router.post("/verify-change-email", (0, verifyUsers_1.verifyUser)("ANY"), users_controllers_1.verifyChangeEmail);
exports.default = router;
//# sourceMappingURL=users.routes.js.map