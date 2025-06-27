import { Request, Response } from "express";
import {sendForgotPasswordOTP} from "../../../utils/emailService.utils";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createInstructorAndAddLog = async (req: Request, res: Response) => {
  
  const { email, name, phone } = req.query;


  // Create filter criteria based on the available query parameters
  const filter: any = {};

  if (email && typeof email === "string") {  
    filter.email = email;
  }
  if (name && typeof name === "string") {
    filter.name = { contains: name, mode: 'insensitive' }; // case-insensitive search
  }
  if (phone && typeof phone === "string") {
    filter.phone = phone;
  }

  if (Object.keys(filter).length === 0) {
     res.status(400).json({
      success: false,
      message: "At least one of email, name, or phone is required as query parameters",
    });
  }
  try {
    const instructors = await prisma.userInstructor.findUnique({
      where: filter,
    });

    if( !instructors) {
       res.status(404).json({
        success: false,
        message: "No instructors found matching the criteria",
      });
    }
    const instructorEmail = instructors.email; 
    const {date,from, to,aircrafttype,tailNumber,flightTime,pictime,dualrcv,
      daytime,nightime,ifrtime,crossCountry,takeoffs,landings} = req.body;
      const addPilotLog=await prisma.addLog.create({
        data: { 
          date: new Date(date),
          from,
          to,
          aircrafttype,
          tailNumber,
          flightTime,
          pictime,
          dualrcv,
          daytime,
          nightime,
          ifrtime,
          crossCountry,
          takeoffs: parseInt(takeoffs, 10),
          landings: parseInt(landings, 10),
          userId: instructors.userId,
          instructorId: instructors.id,
        },
      });
      sendForgotPasswordOTP(instructorEmail, addPilotLog.id.toString());
    res.status(200).json({
      success: true,
      data: instructors,
      message: "Instructors fetched successfully",
    });

  } catch (error) {
    console.error("Error in createInstructorAndAddLog:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create instructor and log",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
