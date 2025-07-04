import express from "express";
import {
  createUser,
  loginUser,
  updateAdmin,
  changePassword,
  sendOtp,
  verifyOtp,
  forgotPassword,
  verifyOtpAndResetPassword,
  resetPassword,
  verifyOtpAndCreateUser,
  googleLogin,
  facebookLogin,
  verifyEmailUpdate,
  updateUser,
  resentOtp,
  updateImage,
} from "./users.controllers";

import upload from "../../../config/multer.congig";

import { verifyUser } from "../../../middleware/verifyUsers";

const router = express.Router();


router.post("/registerVerify", verifyOtpAndCreateUser);
router.post("/login", loginUser);

router.post("/forgetPassword", forgotPassword);
router.post("/verify-top", verifyOtpAndResetPassword);
router.patch("/resent-otp", resentOtp);
router.patch("/change-password", resetPassword);

router.patch("/update-assword", verifyUser("ANY"), changePassword);

router.post("/google-login", googleLogin);
router.post("/facebook-login", facebookLogin);
router.post("/send-otp", sendOtp);

router.put(
  "/user/update/img",
  verifyUser("USER"),
  upload.single("image"),
  updateImage
);

router.put(
  "/user/update",
  verifyUser("USER"),
  updateAdmin
);

router.patch(
  "/user/update",
  verifyUser("USER"),
  upload.single("image"),
  updateUser
);

router.post("/email-verify", verifyEmailUpdate);
router.post("/verify-otp", verifyOtp);
export default router;
