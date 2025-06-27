// src/controllers/weather.controller.ts
import { Request, Response } from "express";
import { getWeatherData } from "../../../utils/weather.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getWeather = async (req: Request, res: Response) => {
  try {
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create log entry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
