"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const users_routes_1 = __importDefault(require("./users/users.routes"));
const weather_route_1 = __importDefault(require("./weather/weather.route"));
const pilotlog_routes_1 = __importDefault(require("./pilotLogs/pilotlog.routes"));
const instructors_routes_1 = __importDefault(require("./instructor/instructors.routes"));
const ai_routes_1 = __importDefault(require("./ai/ai.routes"));
const portcusts_routes_1 = __importDefault(require("./portcusts/portcusts.routes"));
const ebook_routes_1 = __importDefault(require("./ebook/ebook.routes"));
const subscriptions_routes_1 = __importDefault(require("./subscriptions/subscriptions.routes"));
const router = express_1.default.Router();
const moduleRoutes = [
    { path: "/users", route: users_routes_1.default },
    { path: "/weather", route: weather_route_1.default },
    { path: "/addlog", route: pilotlog_routes_1.default },
    { path: "/instructor", route: instructors_routes_1.default },
    { path: "/ai", route: ai_routes_1.default },
    { path: "/portcusts", route: portcusts_routes_1.default },
    { path: "/ebook", route: ebook_routes_1.default },
    { path: "/subscription", route: subscriptions_routes_1.default },
];
moduleRoutes.forEach(({ path, route }) => {
    router.use(path, route);
});
exports.default = router;
//# sourceMappingURL=index.js.map