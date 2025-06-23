import express from "express";
import { createUser, loginUser, updateAdmin, changePassword,sendOtp,verifyOtp,forgotPassword,verifyOtpAndResetPassword,
    verifyOtpAndCreateUser, googleLogin,facebookLogin,verifyEmailUpdate } from "./users.controllers";
 
import upload from "../../config/multer.congig";
import { send } from "process";
import { sendOTP } from "../../utils/emailService.utils";
import { verifyUser } from "../../middleware/verifyUsers";

const router = express.Router();


router.post("/register", upload.single("image"), createUser);
router.post("/registerVerify",  verifyOtpAndCreateUser);
router.post("/login",  loginUser);
router.post("/forgetPassword",  forgotPassword);
router.post("/verify-reset-password",  verifyOtpAndResetPassword);
router.patch("/changePassword", verifyUser('ANY'), changePassword);
router.post('/google-login', googleLogin); // Assuming this is for Google login, you might want to change the controller function if needed
router.post('/facebook-login', facebookLogin);
router.post('/send-otp', sendOtp);
router.put("/:id", verifyUser('ADMIN'), upload.single("image"), updateAdmin);
router.post('/email-verify', verifyEmailUpdate);
router.post('/verify-otp', verifyOtp);
export default router;