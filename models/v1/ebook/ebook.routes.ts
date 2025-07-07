import express from "express";
import { verifyUser } from "../../../middleware/verifyUsers";
import upload from "../../../config/multer.congig";
import { createEbooks, getAllebook, updateEbook, deleteEbook, searchEbooks } from "./ebook.controllers";

const router = express.Router();

router.post(
  "/create",
//   verifyUser('ADMIN'),
  upload.fields([
    { name: 'pdf', maxCount: 1 }, 
    { name: 'cover', maxCount: 1 }
  ]),
  createEbooks
);

router.get("/all", getAllebook);

router.get("/all-ebook", verifyUser('ADMIN'), searchEbooks);

router.patch(
  "/update/:id",
  upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  updateEbook
);

router.delete("/delete/:id", verifyUser('ADMIN'), deleteEbook);


export default router;
