// src/controllers/weather.controller.ts
import { Request, Response } from "express";
import { getWeatherData } from "../../../utils/weather.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getWeather = async (req, res) => {
  const { location } = req.query;

  if (!location) {
    res.status(400).json({ message: "Missing input" });
    return;
  }

  try {
    const weatherData = await getWeatherData(location);
    res.status(200).json(weatherData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch weather data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const addToFavourite = async (req: any, res: Response) => {
  const { data } = req.body;
  const userId = req.user?.userId;
  console.log("Data received in addToFavourite:", data);

  if (!userId) {
    res.status(401).json({ message: "Unauthorized user!" });
    return;
  }
  if (!data) {
    res.status(400).json({ message: "data is requird!" });
    return;
  }
  try {
    let createdWeather = await prisma.weather.create({
      data: {
        userId,
        data,
        status: "FAVURATE",
      },
    });

    res.status(201).json({
      success: true,
      message: "Weather added to favourites",
      data: createdWeather,
    });
  } catch (error) {
    console.error("Error in addToFavourite:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add to favourites",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

//  addHomeBaseWeather, getHomeBaseWeather, getFavouriteWeather, deleteFavouriteWeather

export const addToHomeBase = async (req: any, res: Response) => {
  const { data } = req.body;
  const userId = req.user?.userId;

  if (!data || !userId) {
    res.status(400).json({ message: "Data and user ID are required!" });
    return;
  }

  try {
    const existing = await prisma.weather.findFirst({
      where: { userId, status: "HOMEBASE" },
    });

    const result = await prisma.weather.upsert({
      where: { id: existing?.id ?? "___dummy_id___" },
      update: {
        data,
        updatedAt: new Date(),
      },
      create: {
        userId,
        data,
        status: "HOMEBASE",
      },
    });

    res.status(existing ? 200 : 201).json({
      success: true,
      message: existing
        ? "Home base weather updated"
        : "Home base weather added",
      weather: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to upsert home base weather",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getHomeBaseWeather = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(400).json({ message: "Authorization header are required!" });
      return;
    }

    const data = await prisma.weather.findFirst({
      where: { userId, status: "HOMEBASE" },
    });

    if (!data) {
      res.status(404).json({ message: "No home base weather found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Home base weather fetched successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch weather data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getFavouriteWeather = async (req: any, res: Response) => {
  console.log("getFavouriteWeather called");
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(400).json({ message: "Authorization header are required!" });
      return;
    }

    const data = await prisma.weather.findMany({
      where: { userId, status: "FAVURATE" },
    });

    if (!data) {
      res.status(404).json({ message: "No home base weather found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Home base weather fetched successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch weather data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteFavouriteWeather = async (req: any, res: Response) => {
  console.log("deleteFavouriteWeather called"); 
  const userId = req.user?.userId;
  const { id } = req.body;
  try {
    if (!userId) {
      res.status(400).json({ message: "Authorization header are required!" });
      return;
    }

    if (!id) {
      res
        .status(400)
        .json({
          message: "Weather id is required to delete favourite weather",
        });
      return;
    }

    const deleted = await prisma.weather.deleteMany({
      where: {
        id,
        userId,
        status: "FAVURATE",
      },
    });

    if (deleted.count === 0) {
      res.status(400).json({ message: "No favourite weather found to delete" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Favourite weather deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteFavouriteWeather:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete favourite weather",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
};
