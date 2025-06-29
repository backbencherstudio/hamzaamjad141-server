import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
 
export const getWeatherData = async (location: string) => {
  try {
    const response = await axios.get(`https://avwx.rest/api/metar/${location}`, {
      headers: {
        'Authorization': `Bearer ${WEATHER_API_KEY}`,
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.error('Weather API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw new Error('Failed to fetch weather data');
  }
};
