"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLog = exports.getFavouriteWeather = exports.getHomeBaseWeather = exports.addToHomeBase = exports.addToFavourite = exports.getWeather = void 0;
const weather_service_1 = require("../../../utils/weather.service");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getWeather = async (req, res) => {
    const { location } = req.query;
    if (!location) {
        res.status(400).json({ message: "Missing input" });
        return;
    }
    try {
        const weatherData = await (0, weather_service_1.getWeatherData)(location);
        res.status(200).json({
            success: true,
            message: "Weather data fetched successfully",
            data: weatherData,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch weather data",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getWeather = getWeather;
const addToFavourite = async (req, res) => {
    const { location } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ message: "Unauthorized user!" });
        return;
    }
    if (!location) {
        res.status(400).json({ message: "Location is required!" });
        return;
    }
    try {
        // First, verify the user exists
        const userExists = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!userExists) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Check if location already exists in favourites
        const existing = await prisma.weather.findFirst({
            where: { userId, location, status: "FAVURATE" },
        });
        if (existing) {
            res.status(400).json({ message: "Location already in favourites" });
            return;
        }
        const createdWeather = await prisma.weather.create({
            data: {
                userId,
                location,
                status: "FAVURATE",
            },
        });
        res.status(201).json({
            success: true,
            message: "Location added to favourites",
            data: createdWeather,
        });
    }
    catch (error) {
        console.error("Error in addToFavourite:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add to favourites",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.addToFavourite = addToFavourite;
const addToHomeBase = async (req, res) => {
    const { location } = req.body;
    const userId = req.user?.userId;
    if (!location || !userId) {
        res.status(400).json({ message: "Location and user ID are required!" });
        return;
    }
    try {
        const existing = await prisma.weather.findFirst({
            where: { userId, status: "HOMEBASE" },
        });
        const result = await prisma.weather.upsert({
            where: { id: existing?.id ?? "___dummy_id___" },
            update: {
                location,
                updatedAt: new Date(),
            },
            create: {
                userId,
                location,
                status: "HOMEBASE",
            },
        });
        res.status(existing ? 200 : 201).json({
            success: true,
            message: existing
                ? "Home base location updated"
                : "Home base location added",
            weather: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to upsert home base location",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.addToHomeBase = addToHomeBase;
const getHomeBaseWeather = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(400).json({ message: "Authorization header are required!" });
            return;
        }
        const homeBase = await prisma.weather.findFirst({
            where: { userId, status: "HOMEBASE" },
        });
        if (!homeBase) {
            res.status(404).json({ message: "No home base location found" });
            return;
        }
        // Fetch current weather data for the home base location
        const weatherData = await (0, weather_service_1.getWeatherData)(homeBase.location);
        res.status(200).json({
            success: true,
            message: "Home base weather fetched successfully",
            data: {
                ...homeBase,
                weatherData
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch weather data",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getHomeBaseWeather = getHomeBaseWeather;
const getFavouriteWeather = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(400).json({ message: "Authorization header are required!" });
            return;
        }
        const favourites = await prisma.weather.findMany({
            where: { userId, status: "FAVURATE" },
        });
        // Fetch weather data for all favourite locations
        const favouritesWithWeather = await Promise.all(favourites.map(async (fav) => {
            try {
                const weatherData = await (0, weather_service_1.getWeatherData)(fav.location);
                return {
                    ...fav,
                    weatherData
                };
            }
            catch (error) {
                return {
                    ...fav,
                    weatherData: null,
                    error: "Failed to fetch weather data"
                };
            }
        }));
        res.status(200).json({
            success: true,
            message: "Favourite weather fetched successfully",
            data: favouritesWithWeather,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch weather data",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getFavouriteWeather = getFavouriteWeather;
const deleteLog = async (req, res) => {
    try {
        const logId = req.params.id;
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized: User ID missing",
            });
            return;
        }
        const existingLog = await prisma.addLog.findUnique({
            where: { id: logId },
        });
        if (!existingLog) {
            res.status(404).json({
                success: false,
                message: "Log not found",
            });
            return;
        }
        // Check if the log belongs to the requesting user
        if (existingLog.userId !== userId) {
            res.status(403).json({
                success: false,
                message: "Forbidden: You don't have permission to delete this log",
            });
            return;
        }
        const deletedLog = await prisma.addLog.delete({
            where: { id: logId },
        });
        res.status(200).json({
            success: true,
            message: "Log deleted successfully",
            data: deletedLog,
        });
    }
    catch (error) {
        console.error("Error deleting log:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete log entry",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.deleteLog = deleteLog;
//# sourceMappingURL=weather.controller.js.map