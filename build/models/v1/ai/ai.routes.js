"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/weather.route.ts
const express_1 = __importDefault(require("express"));
const ai_controllers_1 = require("./ai.controllers");
const router = express_1.default.Router();
router.get('/generate/:prompt', ai_controllers_1.generateAIResponse);
exports.default = router;
//# sourceMappingURL=ai.routes.js.map