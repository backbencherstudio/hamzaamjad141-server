import express from "express";
import {
  createUser,
  loginUser,
  changePassword,
  verifyOtp,
  forgotPassword,
  verifyOtpAndResetPassword,
  resetPassword,
  verifyOtpAndCreateUser,
  googleLogin,
  facebookLogin,
 
  updateUser,
  resentOtp,
  userInfo,
  deleteUser,
  sendChangeEmailOtp, verifyChangeEmail, getalluser
} from "./users.controllers";

import upload from "../../../config/multer.config";

import { verifyUser } from "../../../middleware/verifyUsers";
import {
  getAllPilotUser,
  membership,
  overview,
  toActiveUser,
  toDeActiveUser,
} from "./admin.controllers";

const router = express.Router();


router.post("/register", createUser);
router.post("/registerVerify", verifyOtpAndCreateUser);


router.post("/login", loginUser);


router.post("/forgetPassword", forgotPassword);
router.post("/verify-top", verifyOtpAndResetPassword);
router.patch("/resent-otp", resentOtp);
router.put("/change-password", resetPassword);

router.patch("/update-password", verifyUser("ANY"), changePassword);


router.post("/google-login", googleLogin);
router.post("/facebook-login", facebookLogin);


router.get("/me", verifyUser("ANY"), userInfo);

router.delete("/delete", verifyUser("ANY"), deleteUser);

router.patch(
  "/update-user",
  verifyUser("ANY"),
  upload.single("image"),
  updateUser
);
 



router.get("/all-pilot-user", verifyUser("ADMIN"), getAllPilotUser);
router.get("/membership", verifyUser("ADMIN"), membership);
router.get("/dashboard", verifyUser("ADMIN"), overview);
router.patch("/to-active-user/:id", verifyUser("ADMIN"), toActiveUser);
router.patch("/to-deactive-user/:id", verifyUser("ADMIN"), toDeActiveUser);


//stpe1
router.post("/send-change-email-otp", verifyUser("ANY"), sendChangeEmailOtp);
//step2
router.post("/verify-change-email", verifyUser("ANY"), verifyChangeEmail);

router.get('/getalluser', getalluser)
export default router;