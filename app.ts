import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";


import path from "path";

 import users from './models/users/users.routes';
import cookieParser from "cookie-parser";
import weatherRouter from './models/weather/weather.route';



const app = express();


app.use(cookieParser());

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

// //call index url ....
// app.use('/', (req, res)=>{
//     res.status(200).json({
//         message: "Wellcome"
//     })
// })

app.use("/users", users);
app.use('/api/weather', weatherRouter);   

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

// Make sure this line is before your routes
app.use(express.static(path.join(__dirname, "public")));

export default app;


