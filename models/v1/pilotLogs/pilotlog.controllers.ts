import { Request, Response } from "express";
import { instructorConformations } from "../../../utils/emailService.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createLog = async (req: any, res: Response) => {
  try {
    const id = req.user?.userId;

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

    if (!user.instructorId) {
      res.status(400).json({
        success: false,
        message: "No instructor assigned to this user",
      });
      return;
    }

    const instructor = await prisma.instructor.findUnique({
      where: { id: user.instructorId },
    });

    if (!instructor) {
      res.status(404).json({
        success: false,
        message: "Instructor not found",
      });
      return;
    }

    const logRequiredFields = [
      "date",
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
    const exitAddlog = await prisma.addLog.findFirst({
      where: { id: logId },
    });
    const updatedLog = await prisma.addLog.update({
      where: { id: exitAddlog.id },
      data: {
        date: exitAddlog.date,
        from: exitAddlog.from,
        to: exitAddlog.to,
        aircrafttype: exitAddlog.aircrafttype,
        tailNumber: exitAddlog.tailNumber,
        flightTime: exitAddlog.flightTime,
        pictime: exitAddlog.pictime,
        dualrcv: exitAddlog.dualrcv,
        daytime: exitAddlog.daytime,
        nightime: exitAddlog.nightime,
        ifrtime: exitAddlog.ifrtime,
        crossCountry: exitAddlog.crossCountry,
        takeoffs: exitAddlog.takeoffs,
        landings: exitAddlog.landings,
        status: "APPROVE",
      },
    });

    res.status(200).json({
      success: true,
      message: "Log approved successfully",
      data: updatedLog,
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
    const exitAddlog = await prisma.addLog.findFirst({
      where: { id: logId },
    });
    const updatedLog = await prisma.addLog.update({
      where: { id: exitAddlog.id },
      data: {
        date: exitAddlog.date,
        from: exitAddlog.from,
        to: exitAddlog.to,
        aircrafttype: exitAddlog.aircrafttype,
        tailNumber: exitAddlog.tailNumber,
        flightTime: exitAddlog.flightTime,
        pictime: exitAddlog.pictime,
        dualrcv: exitAddlog.dualrcv,
        daytime: exitAddlog.daytime,
        nightime: exitAddlog.nightime,
        ifrtime: exitAddlog.ifrtime,
        crossCountry: exitAddlog.crossCountry,
        takeoffs: exitAddlog.takeoffs,
        landings: exitAddlog.landings,
        status: "REJECT",
      },
    });

    res.status(200).json({
      success: true,
      message: "Log approved successfully",
      data: updatedLog,
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

export const getLogbook = async (req: any, res: Response) => {
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
      return;
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

export const deleteLog = async (req: any, res: Response) => {
  try {
    const logId = req.params.id;
    const userId = req.user?.userId;

    const existingLog = await prisma.addLog.findUnique({
      where: { id: logId },
    });

    if (!existingLog) {
      res.status(404).json({
        success: false,
        message: "Log not found",
      });
      return;
    }

    const deletedLog = await prisma.addLog.delete({
      where: { id: logId },
    });

    res.status(200).json({
      success: true,
      message: "Log deleted successfully",
      data: deletedLog,
    });
  } catch (error) {
    console.error("Error deleting log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete log entry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};


export const getLogSummary = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
       res.status(400).json({
        success: false,
        message: "User not authenticated.",
      });
      return
    }

    const approvedLogs = await prisma.addLog.findMany({
      where: {
        userId: userId,
        status: 'APPROVE',
      },
    });

    // Calculate all metrics
    const totalTakeoffs = approvedLogs.reduce((sum, log) => sum + (log.takeoffs || 0), 0);
    const totalLandings = approvedLogs.reduce((sum, log) => sum + (log.landings || 0), 0);

    const summary = {
      totalFlights: approvedLogs.length,
      totalHours: approvedLogs.reduce((sum, log) => sum + Number(log.flightTime || 0), 0),
      picHours: approvedLogs.reduce((sum, log) => sum + Number(log.pictime || 0), 0),
      dayHours: approvedLogs.reduce((sum, log) => sum + Number(log.daytime || 0), 0),
      nightHours: approvedLogs.reduce((sum, log) => sum + Number(log.nightime || 0), 0),
      ifrHours: approvedLogs.reduce((sum, log) => sum + Number(log.ifrtime || 0), 0),
      totalTakeoffs: totalTakeoffs,
      totalLandings: totalLandings,
      crossCountry: approvedLogs.reduce((sum, log) => sum + Number(log.crossCountry || 0), 0),
      // Add validation for takeoffs/landings mismatch
      hasMismatch: totalTakeoffs !== totalLandings,
    };

    // Format numbers and prepare response
    const formattedSummary = {
      totalFlights: summary.totalFlights,
      totalHours: parseFloat(summary.totalHours.toFixed(2)),
      picHours: parseFloat(summary.picHours.toFixed(2)),
      dayHours: parseFloat(summary.dayHours.toFixed(2)),
      nightHours: parseFloat(summary.nightHours.toFixed(2)),
      ifrHours: parseFloat(summary.ifrHours.toFixed(2)),
      totalTakeoffs: summary.totalTakeoffs,
      totalLandings: summary.totalLandings,
      crossCountry: summary.crossCountry,
    };

    // Include warning if takeoffs and landings don't match
    if (summary.hasMismatch) {
       res.status(200).json({
        success: true,
        message: 'Logbook summary fetched with warnings',
        warning: 'Takeoffs and landings count mismatch detected',
        data: formattedSummary,
      });
      return
    }

    res.status(200).json({
      success: true,
      message: 'Logbook summary fetched successfully',
      data: formattedSummary,
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


export const getAllUserLogSummaries = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search || ""; 

    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
      skip: skip,
      take: limit,
    });

    // if (!users || users.length === 0) {
    //    res.status(404).json({
    //     success: false,
    //     message: "No users found matching the search criteria.",
    //   });
    //   return
    // }

    const userSummaries = await Promise.all(users.map(async (user) => {
      const approvedLogs = await prisma.addLog.findMany({
        where: {
          userId: user.id,
          status: 'APPROVE',
        },
      });

      const totalTakeoffs = approvedLogs.reduce((sum, log) => sum + (log.takeoffs || 0), 0);
      const totalLandings = approvedLogs.reduce((sum, log) => sum + (log.landings || 0), 0);

      const summary = {
        totalFlights: approvedLogs.length,
        totalHours: approvedLogs.reduce((sum, log) => sum + Number(log.flightTime || 0), 0),
        picHours: approvedLogs.reduce((sum, log) => sum + Number(log.pictime || 0), 0),
        dayHours: approvedLogs.reduce((sum, log) => sum + Number(log.daytime || 0), 0),
        nightHours: approvedLogs.reduce((sum, log) => sum + Number(log.nightime || 0), 0),
        ifrHours: approvedLogs.reduce((sum, log) => sum + Number(log.ifrtime || 0), 0),
        totalTakeoffs: totalTakeoffs,
        totalLandings: totalLandings,
        crossCountry: approvedLogs.reduce((sum, log) => sum + Number(log.crossCountry || 0), 0),
        hasMismatch: totalTakeoffs !== totalLandings,
      };

      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        logSummary: {
          ...summary,
          totalHours: parseFloat(summary.totalHours.toFixed(2)),
          picHours: parseFloat(summary.picHours.toFixed(2)),
          dayHours: parseFloat(summary.dayHours.toFixed(2)),
          nightHours: parseFloat(summary.nightHours.toFixed(2)),
          ifrHours: parseFloat(summary.ifrHours.toFixed(2)),
        },
      };
    }));


    const totalUsers = await prisma.user.count({
      where: {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
    });

    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      success: true,
      message: 'Users and their log summaries fetched successfully',
      data: {
        users: userSummaries,
        totalUsers,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching user log summaries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user log summaries',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};



export const getUserLogs = async (req: any, res: Response) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const statusFilter = req.query.status;

    const skip = (page - 1) * limit;

 
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

 
    const logs = await prisma.addLog.findMany({
      where: {
        userId: userId,
        ...(statusFilter && { status: statusFilter })
      },
      skip: skip,
      take: limit,
      orderBy: {
        date: 'desc' 
      }
    });


    const totalLogs = await prisma.addLog.count({
      where: {
        userId: userId,
        ...(statusFilter && { status: statusFilter })
      }
    });

    const totalPages = Math.ceil(totalLogs / limit);

    res.status(200).json({
      success: true,
      message: "User logs fetched successfully",
      data: {
        userInfo: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        logs,
        pagination: {
          totalLogs,
          totalPages,
          currentPage: page,
          limit
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user logs",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};