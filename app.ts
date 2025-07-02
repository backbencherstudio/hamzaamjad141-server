import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";

import path from "path";
 
import v1 from "./models/v1/index";

const app = express();

app.use(
  cors({
    origin: [
      "http://192.168.30.102:3000",
      "http://192.168.30.102:*",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));




app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/", v1)

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    message: `404 route not found`,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    message: `500 Something broken!`,
    error: err.message,
  });
});


app.use(express.static(path.join(__dirname, "public")));

export default app;


