import express from "express";

import users from "./users/users.routes";
import weatherRouter from "./weather/weather.route";
import addlogRouter from "./pilotLogs/pilotlog.routes";
import instructor from "./instructor/instructors.routes";
import ai from "./ai/ai.routes";
import portcusts from "./portcusts/portcusts.routes";
import ebook from "./ebook/ebook.routes";
import subscriptions from "./subscriptions/subscriptions.routes";


const router = express.Router();

const moduleRoutes = [
  { path: "/users", route: users },
  { path: "/weather", route: weatherRouter },
  { path: "/addlog", route: addlogRouter },
  { path: "/instructor", route: instructor },
  { path: "/ai",  route: ai },
  { path: "/portcusts", route: portcusts  },
  { path: "/ebook", route: ebook },
  { path: "/subscription", route: subscriptions},

];

moduleRoutes.forEach(({ path, route }) => {
  router.use(path, route);
});

export default router;
