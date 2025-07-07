import express from "express";
import {
  createUser,
  loginUser,
  updateAdminPassword,
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
  adminInfo,
  userInfo,
  deleteUser
} from "./users.controllers";

import upload from "../../../config/multer.congig";

import { verifyUser } from "../../../middleware/verifyUsers";

const router = express.Router();

router.post("/register", createUser);
router.post("/registerVerify", verifyOtpAndCreateUser);
router.post("/login", loginUser);

router.post("/forgetPassword", forgotPassword);
router.post("/verify-top", verifyOtpAndResetPassword);
router.patch("/resent-otp", resentOtp);
router.put("/change-password", resetPassword);

router.patch("/update-assword", verifyUser("ANY"), changePassword);

router.post("/google-login", googleLogin);
router.post("/facebook-login", facebookLogin);
router.post("/send-otp", sendOtp);

// router.put(
//   "/update-admininfo",verifyUser("ADMIN"), (req, res) => {
//   res.send(`Hello`);  
// });
router.put(
  "/update-admininfo",
  verifyUser("ADMIN"),
  upload.single("image"),
  adminInfo
);

router.put(
  "/admin-password",
  verifyUser("ADMIN"),
  updateAdminPassword
);

router.patch(
  "/user/update",
  verifyUser("USER"),
  upload.single("image"),
  updateUser
);

router.post("/email-verify", verifyEmailUpdate);
router.post("/verify-otp", verifyOtp);


router.get('/me', verifyUser('ANY'), userInfo )
router.post("/delete", verifyUser("ANY"), deleteUser);


export default router;
