// src/controllers/weather.controller.ts
import { Request, Response } from 'express';
import { getWeatherData } from '../../utils/weather.service';

export const getWeather = async (req: Request, res: Response) => {
  console.log('Received weather request:', req.query); // Debug log
  try {
    const location = req.query.location as string; // Explicit type casting
    
    if (!location) {
       res.status(400).json({ error: 'Location parameter is required' });
    }

    console.log('Fetching weather for:', location); // Add debug log

    const weatherData = await getWeatherData(location);
    
    console.log('Weather data:', weatherData); // Debug log
    
    if (!weatherData || Object.keys(weatherData).length === 0) {
       res.status(404).json({ error: 'No weather data found' });
    }

     res.json(weatherData);
  } catch (error) {
    console.error('Weather error:', error);
     res.status(500).json({ 
      error: 'Failed to fetch weather data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

