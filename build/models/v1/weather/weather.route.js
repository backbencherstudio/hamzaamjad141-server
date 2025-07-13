"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/weather.route.ts
const express_1 = __importDefault(require("express"));
const weather_controller_1 = require("./weather.controller");
const verifyUsers_1 = require("../../../middleware/verifyUsers");
const router = express_1.default.Router();
router.get("/search", weather_controller_1.getWeather);
router.post("/add-favourite", (0, verifyUsers_1.verifyUser)("ANY"), weather_controller_1.addToFavourite);
router.post("/add-homebase", (0, verifyUsers_1.verifyUser)("ANY"), weather_controller_1.addToHomeBase);
router.get("/get-homebase", (0, verifyUsers_1.verifyUser)("ANY"), weather_controller_1.getHomeBaseWeather);
router.get("/get-favourite", (0, verifyUsers_1.verifyUser)("ANY"), weather_controller_1.getFavouriteWeather);
router.delete("/delete-favourite/:id", (0, verifyUsers_1.verifyUser)("ANY"), weather_controller_1.deleteLog);
exports.default = router;
//# sourceMappingURL=weather.route.js.map