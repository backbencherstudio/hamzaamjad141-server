// src/routes/weather.route.ts
import express from "express";
import {
  getWeather,
  addToFavourite,
  addToHomeBase,
  getHomeBaseWeather,
  getFavouriteWeather,
  deleteLog,
} from "./weather.controller";
import { verifyUser } from "../../../middleware/verifyUsers";

const router = express.Router();

router.get("/search", getWeather);

router.post("/add-favourite", verifyUser("ANY"), addToFavourite);
router.post("/add-homebase", verifyUser("ANY"), addToHomeBase);

router.get("/get-homebase", verifyUser("ANY"), getHomeBaseWeather);
router.get("/get-favourite", verifyUser("ANY"), getFavouriteWeather);

router.delete("/delete-favourite/:id", verifyUser("ANY"), deleteLog);

export default router;
