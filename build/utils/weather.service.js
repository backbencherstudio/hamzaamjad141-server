"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeatherData = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const getWeatherData = async (location) => {
    try {
        const response = await axios_1.default.get(`https://avwx.rest/api/metar/${location}`, {
            headers: {
                'Authorization': `Bearer ${WEATHER_API_KEY}`,
                'Accept': 'application/json'
            },
            timeout: 5000
        });
        return response.data;
    }
    catch (error) {
        console.error('Weather API Error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        throw new Error('Failed to fetch weather data');
    }
};
exports.getWeatherData = getWeatherData;
//# sourceMappingURL=weather.service.js.map