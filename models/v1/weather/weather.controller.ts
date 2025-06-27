// src/controllers/weather.controller.ts
import { Request, Response } from 'express';
import { getWeatherData } from '../../../utils/weather.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// export const getWeather = async (req: Request, res: Response) => {
//   console.log('Received weather request:', req.query); // Debug log
//   try {
//     const location = req.query.location as string; // Explicit type casting
    
//     if (!location) {
//        res.status(400).json({ error: 'Location parameter is required' });
//     }

//     console.log('Fetching weather for:', location); // Add debug log

//     const weatherData = await getWeatherData(location);
    
//     console.log('Weather data:', weatherData); // Debug log
    
//     if (!weatherData || Object.keys(weatherData).length === 0) {
//        res.status(404).json({ error: 'No weather data found' });
//     }

//      res.json(weatherData);
//   } catch (error) {
//     console.error('Weather error:', error);
//      res.status(500).json({ 
//       error: 'Failed to fetch weather data',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// };

export const getWeather = async (req: Request, res: Response) => {
  try {
    const location = req.query.location as string;
    // const userIdStr = req.query.userId as string;
    // const userId = Number(userIdStr);

    // if (!location || !userIdStr || isNaN(userId)) {
    //    res.status(400).json({ error: "Location and valid numeric userId are required" });
    // }

    const userId =1;
    // Step 1: Check if location exists in DB
    let dbLocation = await prisma.location.findUnique({ where: { name: location } });

    // Define weatherData in the outer scope
    let weatherData: any;

    if (!dbLocation) {
      // If not exists, fetch weather and create location
      weatherData = await getWeatherData(location);
      if (!weatherData) {
          res.status(404).json({ error: "Weather data not found" });
      }

      dbLocation = await prisma.location.create({
        data: {
          name: location,
        },
      });
    } else {
      // If location exists, fetch weather data
      weatherData = await getWeatherData(location);
      if (!weatherData) {
          res.status(404).json({ error: "Weather data not found" });
      }
    }

    // Step 2: Check if user already has weather data for this location
    const existing = await prisma.pilotWeather.findUnique({
      where: {
        userId_locationId: {
          userId: userId,
          locationId: dbLocation.id,
        },
      },
    });

    if (existing) {
      // If the data already exists for the user and location, delete the previous data
      await prisma.pilotWeather.delete({
        where: {
          userId_locationId: {
            userId: userId,
            locationId: dbLocation.id,
          },
        },
      });

      // Insert the new weather data after deletion
      const newWeatherData = await prisma.pilotWeather.create({
        data: {
          userId,
          locationId: dbLocation.id,
          data: weatherData, // Now weatherData is always defined
        },
      });

      res.status(200).json({ message: "Previous data deleted and new data inserted", data: newWeatherData });
    } else {
      // If no existing data, directly insert the new data
      const newWeatherData = await prisma.pilotWeather.create({
        data: {
          userId,
          locationId: dbLocation.id,
          data: weatherData,
        },
      });

      res.status(200).json({ message: "New data inserted", data: newWeatherData });
    }
  } catch (error) {
    console.error("Weather error:", error);
    res.status(500).json({
      error: "Failed to fetch weather data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};