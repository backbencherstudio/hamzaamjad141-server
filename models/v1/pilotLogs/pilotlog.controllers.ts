import { Request, Response } from "express";
import { instructorConformations } from "../../../utils/emailService.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createInstructorAndAddLog = async (req: any, res: Response) => {
  try {
    const id = req.user?.userId;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }
    console.log(user);

    // Check if user has an instructor assigned
    if (!user.instructorId) {
      res.status(400).json({
        success: false,
        message: "No instructor assigned to this user",
      });
      return;
    }

    // Get instructor details
    const instructor = await prisma.instructor.findUnique({
      where: { id: user.instructorId },
    });
    console.log(instructor);

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
      "pictime",
      "dualrcv",
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

export const instructorApprov = async (req: any, res: Response) => {
  try {
    const logId = req.query;
    const exitAddlog =await prisma.addLog.findFirst({
      where:{id:logId}
    })
    const updatedLog = await prisma.addLog.update({
      where: { id: exitAddlog.id },
      data: { 
        date:exitAddlog.date,
        from:exitAddlog.from,
        to:exitAddlog.to,
        aircrafttype:exitAddlog.aircrafttype,
        tailNumber:exitAddlog.tailNumber,
        flightTime:exitAddlog.flightTime,
        pictime:exitAddlog.pictime,
        dualrcv:exitAddlog.dualrcv,
        daytime:exitAddlog.daytime,
        nightime:exitAddlog.nightime,
        ifrtime:exitAddlog.ifrtime,
        crossCountry:exitAddlog.crossCountry,
        takeoffs:exitAddlog.takeoffs,
        landings:exitAddlog.landings,
        status: 'APPROVE' 
      },
    });

    res.status(200).json({
      success: true,
      message: "Log approved successfully",
      data:updatedLog
    });
  } catch (error) {
    console.error("Error approving log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve log entry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const instructorReject = async (req: any, res: Response) => {
  try {
    const logId = req.query;
    const exitAddlog =await prisma.addLog.findFirst({
      where:{id:logId}
    })
    const updatedLog = await prisma.addLog.update({
      where: { id: exitAddlog.id },
      data: { 
        date:exitAddlog.date,
        from:exitAddlog.from,
        to:exitAddlog.to,
        aircrafttype:exitAddlog.aircrafttype,
        tailNumber:exitAddlog.tailNumber,
        flightTime:exitAddlog.flightTime,
        pictime:exitAddlog.pictime,
        dualrcv:exitAddlog.dualrcv,
        daytime:exitAddlog.daytime,
        nightime:exitAddlog.nightime,
        ifrtime:exitAddlog.ifrtime,
        crossCountry:exitAddlog.crossCountry,
        takeoffs:exitAddlog.takeoffs,
        landings:exitAddlog.landings,
        status: 'REJECT' 
      },
    });

    res.status(200).json({
      success: true,
      message: "Log approved successfully",
      data:updatedLog
    });
  } catch (error) {
    console.error("Error approving log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve log entry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getLogbookSummary = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const statusFilter = req.query.status;
    const page = parseInt(req.query.page as string) || 1; 
    const limit = parseInt(req.query.limit as string) || 10; 


    const skip = (page - 1) * limit;

 
    const logs = await prisma.addLog.findMany({
      where: {
        userId: userId,
        status: statusFilter, 
      },
      skip: skip,  
      take: limit,  
    });

    
    const totalLogs = await prisma.addLog.count({
      where: {
        userId: userId,
        status: statusFilter,
      },
    });

    const totalPages = Math.ceil(totalLogs / limit);

 
    if (!logs || logs.length === 0) {
    res.status(404).json({
        success: false,
        message: `No flight logs found for this user with status: ${statusFilter}`,
      });
        return 
    }

 
    res.status(200).json({
      success: true,
      message: "Logbook summary fetched successfully",
      data: {
        logs,          
        totalLogs,    
        totalPages,  
        currentPage: page, 
        limit,       
      },
    });
  } catch (error) {
    console.error("Error fetching logbook summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch logbook summary",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getLogSummary = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId; // Get userId from the request
    if (!userId) {
       res.status(400).json({
        success: false,
        message: "User not authenticated.",
      });
      return
    }

    // Fetch all logs for the user
    const logs = await prisma.addLog.findMany({
      where: {
        userId: userId,
      },
    });

    // Filter for logs with 'APPROVED' status (adjust if your status value differs)
    const approvedLogs = logs.filter(log => log.status === 'APPROVE');

    // If no approved logs exist, return a helpful message
    if (approvedLogs.length === 0) {
       res.status(404).json({
        success: false,
        message: 'No approved flight logs found for this user.',
      });
      return
    }

    // Calculate the summary for approved logs
    const summary = approvedLogs.reduce((acc, log) => {
      acc.totalFlights += 1;  // Count each approved log as a flight
      acc.totalHours += parseFloat(log.flightTime) || 0;  // Sum total flight hours
      acc.picHours += parseFloat(log.dualrcv) || 0;  // Sum PIC hours (Dual RCV)
      acc.dayHours += parseFloat(log.daytime) || 0;  // Sum Daytime hours
      acc.nightHours += parseFloat(log.nightime) || 0;  // Sum Nighttime hours
      acc.ifrHours += parseFloat(log.ifrtime) || 0;  // Sum IFR hours
      acc.totalTakeoffs += log.takeoffs || 0;  // Sum total takeoffs
      acc.totalLandings += log.landings || 0;  // Sum total landings
      acc.crossCountry += parseFloat(log.crossCountry) || 0;  // Sum cross-country hours
      return acc;
    }, {
      totalFlights: 0,
      totalHours: 0,
      picHours: 0,
      dayHours: 0,
      nightHours: 0,
      ifrHours: 0,
      totalTakeoffs: 0,
      totalLandings: 0,
      crossCountry: 0,
    });

    // Send the summary as a response
    res.status(200).json({
      success: true,
      message: 'Logbook summary fetched successfully',
      data: {
        summary,  // The calculated summary
      },
    });
  } catch (error) {
    console.error('Error fetching logbook summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logbook summary',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};


