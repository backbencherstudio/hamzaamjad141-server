// src/controllers/weather.controller.ts
import { Request, Response } from "express";
import { getWeatherData } from "../../../utils/weather.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getWeather = async (req, res) => {
  const { location, status, userId } = req.query;
  console.log("Received query parameters:", { location, status, userId });

  if (!location || !status || !userId) {
    res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    const weatherData = await getWeatherData(location);

    if (status === "HOMEBASE") {
      const existingWeather = await prisma.weather.findFirst({
        where: {
          userId,
          status,
        },
      });
      console.log("Existing weather data:", existingWeather);
      if (existingWeather) {
        res.status(200).json({ message: "Weather data already saved" });
      } else {
        const newWeather = await prisma.weather.create({
          data: {
            userId,
            data: weatherData,
            status,
          },
        });

        res.status(201).json(newWeather);
      }
    }
     else {
      const newWeather = await prisma.weather.create({
        data: {
          userId,
          data: weatherData,
          status,
        },
      });
      res.status(201).json(newWeather);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create log entry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
