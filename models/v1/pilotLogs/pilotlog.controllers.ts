import { Request, Response } from "express";
import {
  instructorConformations,
} from "../../../utils/emailService.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createInstructorAndAddLog = async (req: any, res: Response) => {
  try {
    const { id } = req.user;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if user has an instructor assigned
    if (!user.instructor) {
      res.status(400).json({
        success: false,
        message: "No instructor assigned to this user",
      });
      return;
    }

    // Get instructor details
    const instructor = await prisma.instructor.findUnique({
      where: { id: user.instructor },
    });

    if (!instructor) {
      res.status(404).json({
        success: false,
        message: "Instructor not found",
      });
      return;
    }

    // Validate required fields
    const logRequiredFields = [
      "from",
      "to",
      "aircrafttype",
      "tailNumber",
      "flightTime",
      "daytime",
      "nightime",
      "ifrtime",
      "crossCountry",
      "takeoffs",
      "landings",
    ];

    const logMissingField = logRequiredFields.find((field) => !req.body[field]);
    if (logMissingField) {
      res.status(400).json({
        success: false,
        message: `${logMissingField} is required for log entry!`,
      });
      return;
    }

    const newLog = await prisma.addLog.create({
      data: {
        ...req.body,
        userId: id,
        action: "active",
      },
    });

    instructorConformations(instructor.email, user.name, {
      ...newLog,
      createdAt: newLog.createdAt,
    });

    res.status(201).json({
      success: true,
      message: "Log created successfully and instructor notified",
      data: newLog,
    });
  } catch (error) {
    console.error("Error creating log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create log entry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
