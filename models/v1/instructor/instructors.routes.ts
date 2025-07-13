// src/routes/weather.route.ts
import express from "express";
import {
  createInstructor,
  findInstructor,
  updateInstructor,
  deleteInstructor,
  userInstructor,
  myInstructor,
  toActiveInstructor,
  toDeActiveInstructor,
  getAllInstructors,
  createInstructorByUser
} from "./instructors.controllers";
import { verifyUser } from "../../../middleware/verifyUsers";
import { premiumGuard } from "../../../middleware/premiumGuard";

const router = express.Router();

router.post("/create", verifyUser("ADMIN"), createInstructor); //by admin

//conduction route create Instructor a user
router.post("/create-by-user", verifyUser("USER"), createInstructorByUser); 

router.post(
  "/set-instructor/:id",
  verifyUser("ANY"),
  premiumGuard,
  userInstructor
);

router.get("/my-instructor", verifyUser("ANY"), premiumGuard, myInstructor);

router.get("/find", verifyUser("ANY"), premiumGuard, findInstructor);

router.patch("/update/:id", verifyUser("ADMIN"), updateInstructor);
router.delete("/delete/:id", verifyUser("ADMIN"), deleteInstructor);

router.patch("/to-active/:id", verifyUser("ADMIN"), toActiveInstructor);
router.patch("/to-deactive/:id", verifyUser("ADMIN"), toDeActiveInstructor);

router.get("/all-instructors", verifyUser("ADMIN"), getAllInstructors);

export default router;
