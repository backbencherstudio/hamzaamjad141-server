import express from "express";

import users from "./users/users.routes";
import weatherRouter from "./weather/weather.route";
import addlogRouter from "./pilotLogs/pilotlog.routes";
import instructor from "./instructor/instructors.routes";

const router = express.Router();

const moduleRoutes = [
  { path: "/users", route: users },
  { path: "/weather", route: weatherRouter },
  { path: "/addlog", route: addlogRouter },
  { path: "/instructor", route: instructor },
];

moduleRoutes.forEach(({ path, route }) => {
  router.use(path, route);
});

export default router;
