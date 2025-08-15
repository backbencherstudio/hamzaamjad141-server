import { Request, Response } from "express";
import { instructorConformations } from "../../../utils/emailService.utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createLog = async (req: any, res: Response) => {
  console.log("hello")
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

    const logRequiredFields = ["date", "from", "to", "tailNumber"];

    const logMissingField = logRequiredFields.find((field) => !req.body[field]);
    if (logMissingField) {
      res.status(400).json({
        success: false,
        message: `${logMissingField} is required for log entry!`,
      });
      return;
    }

    let instructor = null;
    if (user.instructorId) {
      instructor = await prisma.instructor.findUnique({
        where: { id: user.instructorId },
      });
    }

    const newLog = await prisma.addLog.create({
      data: {
        ...req.body,
        userId: id,
        status: instructor ? "PENDING" : "SELF_VERIFIED",
        action: "active",
      },
    });

    if (instructor) {
      instructorConformations(instructor.email, user.name, {
        ...newLog,
        createdAt: newLog.createdAt,
      });
    }

    res.status(201).json({
      success: true,
      message: instructor
        ? "Log created successfully and instructor notified"
        : "Log created successfully with UNVERIFIED status",
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
    const logId = req.params.id;  

    if (!logId) {
      return res.status(400).json({
        success: false,
        message: "Log ID is required for rejection",
      });
    }

    const existingLog = await prisma.addLog.findUnique({
      where: { id: logId as string },
    });

    if (!existingLog) {
      return res.status(404).json({
        success: false,
        message: "Log not found",
      });
    }

 
    await prisma.addLog.delete({
      where: { id: logId as string },
    });

    res.status(200).json({
      success: true,
      message: "Log rejected and deleted successfully",
    });
  } catch (error) {
    console.error("Error rejecting (deleting) log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject and delete log entry",
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

    res.status(200).json({
      success: true,
      message: "Logbook summary fetched successfully",
      data: {
        logs: logs.length > 0 ? logs : [], // Ensure empty array if no logs
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
      return;
    }

    const approvedLogs = await prisma.addLog.findMany({
      where: {
        userId: userId,
      },
    });

    // Calculate all metrics
    const totalTakeoffs = approvedLogs.reduce(
      (sum, log) => sum + (log.takeoffs || 0),
      0
    );
    const totalLandings = approvedLogs.reduce(
      (sum, log) => sum + (log.landings || 0),
      0
    );

    const summary = {
      totalFlights: approvedLogs.length,
      totalHours: approvedLogs.reduce(
        (sum, log) => sum + Number(log.flightTime || 0),
        0
      ),
      picHours: approvedLogs.reduce(
        (sum, log) => sum + Number(log.pictime || 0),
        0
      ),
      dayHours: approvedLogs.reduce(
        (sum, log) => sum + Number(log.daytime || 0),
        0
      ),
      nightHours: approvedLogs.reduce(
        (sum, log) => sum + Number(log.nightime || 0),
        0
      ),
      ifrHours: approvedLogs.reduce(
        (sum, log) => sum + Number(log.ifrtime || 0),
        0
      ),
      totalTakeoffs: totalTakeoffs,
      totalLandings: totalLandings,
      crossCountry: approvedLogs.reduce(
        (sum, log) => sum + Number(log.crossCountry || 0),
        0
      ),
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
        message: "Logbook summary fetched with warnings",
        warning: "Takeoffs and landings count mismatch detected",
        data: formattedSummary,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Logbook summary fetched successfully",
      data: formattedSummary,
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
          mode: "insensitive",
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

    const userSummaries = await Promise.all(
      users.map(async (user) => {
        const approvedLogs = await prisma.addLog.findMany({
          where: {
            userId: user.id,
            status: "APPROVE",
          },
        });

        const totalTakeoffs = approvedLogs.reduce(
          (sum, log) => sum + (log.takeoffs || 0),
          0
        );
        const totalLandings = approvedLogs.reduce(
          (sum, log) => sum + (log.landings || 0),
          0
        );

        const summary = {
          totalFlights: approvedLogs.length,
          totalHours: approvedLogs.reduce(
            (sum, log) => sum + Number(log.flightTime || 0),
            0
          ),
          picHours: approvedLogs.reduce(
            (sum, log) => sum + Number(log.pictime || 0),
            0
          ),
          dayHours: approvedLogs.reduce(
            (sum, log) => sum + Number(log.daytime || 0),
            0
          ),
          nightHours: approvedLogs.reduce(
            (sum, log) => sum + Number(log.nightime || 0),
            0
          ),
          ifrHours: approvedLogs.reduce(
            (sum, log) => sum + Number(log.ifrtime || 0),
            0
          ),
          totalTakeoffs: totalTakeoffs,
          totalLandings: totalLandings,
          crossCountry: approvedLogs.reduce(
            (sum, log) => sum + Number(log.crossCountry || 0),
            0
          ),
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
      })
    );

    const totalUsers = await prisma.user.count({
      where: {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
    });

    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      success: true,
      message: "Users and their log summaries fetched successfully",
      data: {
        users: userSummaries,
        totalUsers,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching user log summaries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user log summaries",
      error: error instanceof Error ? error.message : "Unknown error",
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
      select: { id: true, name: true, email: true },
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
        ...(statusFilter && { status: statusFilter }),
      },
      skip: skip,
      take: limit,
      orderBy: {
        date: "desc",
      },
    });

    const totalLogs = await prisma.addLog.count({
      where: {
        userId: userId,
        ...(statusFilter && { status: statusFilter }),
      },
    });

    const totalPages = Math.ceil(totalLogs / limit);

    res.status(200).json({
      success: true,
      message: "User logs fetched successfully",
      data: {
        userInfo: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        logs,
        pagination: {
          totalLogs,
          totalPages,
          currentPage: page,
          limit,
        },
      },
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



 
 
export const reviewLogPage = async (req: Request, res: Response) => {
  try {
    const logId = req.params.id;
    if (!logId) {
      return res.status(400).send("Log ID is required");
    }

    const logEntry = await prisma.addLog.findUnique({
      where: { id: logId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!logEntry) {
      return res.status(404).send("Log entry not found");
    }

    // Helper function to format values
    const formatValue = (value: any) => {
      if (value === null || value === undefined || value === '' || value === 0) {
        return 'Not specified';
      }
      return value.toString();
    };

    // Format date
    const formatDate = (date: Date | string) => {
      if (!date) return 'Not specified';
      return new Date(date).toLocaleString();
    };

    // Generate HTML for the review page with dynamic data
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Review Flight Log</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
          min-height: 100vh;
          color: #ffffff;
          padding: 20px;
          overflow-x: hidden;
        }

        .container {
          max-width: 420px;
          margin: 0 auto;
          background: rgba(30, 41, 59, 0.95);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          padding: 32px 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
          opacity: 0.3;
        }

        .header-content {
          position: relative;
          z-index: 1;
        }

        .logo {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 18px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          transition: transform 0.3s ease;
        }

        .logo:hover {
          transform: scale(1.05);
        }

        .header h1 {
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .header p {
          font-size: 16px;
          opacity: 0.9;
          font-weight: 400;
        }

        .content {
          padding: 36px 24px;
        }

        .section {
          margin-bottom: 36px;
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .section:nth-child(1) { animation-delay: 0.1s; }
        .section:nth-child(2) { animation-delay: 0.2s; }
        .section:nth-child(3) { animation-delay: 0.3s; }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 18px;
          color: #e2e8f0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-title::before {
          content: '';
          width: 4px;
          height: 22px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .section:hover .section-title::before {
          height: 26px;
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
        }

        .info-card {
          background: rgba(51, 65, 85, 0.6);
          border-radius: 18px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .info-card:hover {
          background: rgba(51, 65, 85, 0.8);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-item:hover {
          padding-left: 8px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          margin: 0 -8px;
        }

        .info-label {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .info-item:hover .info-label {
          color: #cbd5e1;
        }

        .info-value {
          font-size: 14px;
          color: #ffffff;
          font-weight: 600;
          text-align: right;
          max-width: 60%;
          transition: all 0.2s ease;
        }

        .info-item:hover .info-value {
          color: #f1f5f9;
          transform: translateX(-2px);
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-top: 36px;
        }

        .btn {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 18px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transform: translateY(0);
        }

        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.6s ease;
        }

        .btn:hover:not(:disabled)::before {
          left: 100%;
        }

        .btn-approve {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        }

        .btn-approve:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(16, 185, 129, 0.4);
          background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        }

        .btn-approve:active:not(:disabled) {
          transform: translateY(-1px);
          transition: all 0.1s ease;
        }

        .btn-reject {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        }

        .btn-reject:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(239, 68, 68, 0.4);
          background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
        }

        .btn-reject:active:not(:disabled) {
          transform: translateY(-1px);
          transition: all 0.1s ease;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
          transition: all 0.3s ease;
        }

        .status-badge:hover {
          background: rgba(59, 130, 246, 0.3);
          color: #93c5fd;
          transform: scale(1.05);
        }

        /* Modal Styles - Perfectly Centered */
        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          padding: 36px;
          border-radius: 24px;
          width: 90%;
          max-width: 400px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
          animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .modal-icon {
          width: 88px;
          height: 88px;
          margin: 0 auto 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 42px;
          font-weight: bold;
          animation: iconPulse 0.6s ease-out;
        }

        @keyframes iconPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .modal-icon.success {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.4);
        }

        .modal-icon.error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
        }

        .modal h2 {
          color: #ffffff;
          margin-bottom: 18px;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .modal p {
          color: #94a3b8;
          margin-bottom: 28px;
          font-size: 16px;
          line-height: 1.6;
        }

        .modal-btn {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          padding: 14px 36px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }

        .modal-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(59, 130, 246, 0.4);
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
        }

        .modal-btn:active {
          transform: translateY(0);
          transition: all 0.1s ease;
        }

        .loading {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #ffffff;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .btn-text {
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
        }

        @media (max-width: 480px) {
          body {
            padding: 15px;
          }

          .container {
            margin: 0;
            border-radius: 20px;
          }
          
          .content {
            padding: 28px 20px;
          }

          .modal-content {
            width: 95%;
            padding: 32px 24px;
            border-radius: 20px;
          }

          .modal-icon {
            width: 80px;
            height: 80px;
            font-size: 38px;
          }

          .modal h2 {
            font-size: 24px;
          }
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
            <div class="logo">✈️</div>
            <h1>Flight Log Review</h1>
            <p>Review and approve flight entries</p>
          </div>
        </div>

        <div class="content">
          <div class="section">
            <h3 class="section-title">Student Information</h3>
            <div class="info-card">
              <div class="info-item">
                <span class="info-label">Name</span>
                <span class="info-value">${formatValue(logEntry.user?.name)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email</span>
                <span class="info-value">${formatValue(logEntry.user?.email)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status</span>
                <span class="status-badge">${logEntry.status}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">Flight Details</h3>
            <div class="info-card">
              <div class="info-item">
                <span class="info-label">From</span>
                <span class="info-value">${formatValue(logEntry.from)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">To</span>
                <span class="info-value">${formatValue(logEntry.to)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Aircraft Type</span>
                <span class="info-value">${formatValue(logEntry.aircrafttype)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Tail Number</span>
                <span class="info-value">${formatValue(logEntry.tailNumber)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Flight Time</span>
                <span class="info-value">${formatValue(logEntry.flightTime)} ${logEntry.flightTime && logEntry.flightTime > 0 ? 'hours' : ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">PIC Time</span>
                <span class="info-value">${formatValue(logEntry.pictime)} ${logEntry.pictime && logEntry.pictime > 0 ? 'hours' : ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Dual Received</span>
                <span class="info-value">${formatValue(logEntry.dualrcv)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Day Time</span>
                <span class="info-value">${formatValue(logEntry.daytime)} ${logEntry.daytime && logEntry.daytime > 0 ? 'hours' : ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Night Time</span>
                <span class="info-value">${formatValue(logEntry.nightime)} ${logEntry.nightime && logEntry.nightime > 0 ? 'hours' : ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">IFR Time</span>
                <span class="info-value">${formatValue(logEntry.ifrtime)} ${logEntry.ifrtime && logEntry.ifrtime > 0 ? 'hours' : ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Cross Country</span>
                <span class="info-value">${formatValue(logEntry.crossCountry)} ${logEntry.crossCountry && logEntry.crossCountry > 0 ? 'nm' : ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Takeoffs</span>
                <span class="info-value">${formatValue(logEntry.takeoffs)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Landings</span>
                <span class="info-value">${formatValue(logEntry.landings)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Date</span>
                <span class="info-value">${formatDate(logEntry.date)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Submitted</span>
                <span class="info-value">${formatDate(logEntry.createdAt)}</span>
              </div>
            </div>
          </div>

          <div class="actions">
            <button type="button" class="btn btn-approve" id="approveBtn" onclick="handleApprove()">
              <span class="btn-text">
                <span>✓</span>
                <span>Approve Log</span>
              </span>
            </button>
            <button type="button" class="btn btn-reject" id="rejectBtn" onclick="handleReject()">
              <span class="btn-text">
                <span>✗</span>
                <span>Reject Log</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Success Modal -->
      <div id="successModal" class="modal">
        <div class="modal-content">
          <div class="modal-icon success">✓</div>
          <h2>Success!</h2>
          <p id="successMessage">Flight log has been processed successfully.</p>
          <button class="modal-btn" onclick="closeWindow()">OK</button>
        </div>
      </div>

      <!-- Error Modal -->
      <div id="errorModal" class="modal">
        <div class="modal-content">
          <div class="modal-icon error">✗</div>
          <h2>Error!</h2>
          <p id="errorMessage">Something went wrong. Please try again.</p>
          <button class="modal-btn" onclick="closeModal('errorModal')">OK</button>
        </div>
      </div>

      <script>
        const logId = '${logId}';

        function showModal(modalId) {
          document.getElementById(modalId).style.display = 'block';
          document.body.style.overflow = 'hidden';
        }

        function closeModal(modalId) {
          document.getElementById(modalId).style.display = 'none';
          document.body.style.overflow = 'auto';
        }

        function closeWindow() {
          window.close();
        }

        function setButtonLoading(buttonId, isLoading) {
          const button = document.getElementById(buttonId);
          const isApprove = buttonId === 'approveBtn';
          
          if (isLoading) {
            button.disabled = true;
            button.innerHTML = \`
              <span class="btn-text">
                <span class="loading"></span>
                <span>Processing...</span>
              </span>
            \`;
          } else {
            button.disabled = false;
            button.innerHTML = \`
              <span class="btn-text">
                <span>\${isApprove ? '✓' : '✗'}</span>
                <span>\${isApprove ? 'Approve Log' : 'Reject Log'}</span>
              </span>
            \`;
          }
        }

        async function handleApprove() {
          setButtonLoading('approveBtn', true);
          
          try {
            const response = await fetch(\`/addlog/addlog-approve/\${logId}\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              document.getElementById('successMessage').textContent = 'Flight log has been approved successfully!';
              showModal('successModal');
            } else {
              throw new Error('Failed to approve log');
            }
          } catch (error) {
            console.error('Error approving log:', error);
            document.getElementById('errorMessage').textContent = 'Failed to approve the flight log. Please try again.';
            showModal('errorModal');
            setButtonLoading('approveBtn', false);
          }
        }

        async function handleReject() {
          setButtonLoading('rejectBtn', true);
          
          try {
            const response = await fetch(\`/addlog/addlog-reject/\${logId}\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              document.getElementById('successMessage').textContent = 'Flight log has been rejected successfully!';
              showModal('successModal');
            } else {
              throw new Error('Failed to reject log');
            }
          } catch (error) {
            console.error('Error rejecting log:', error);
            document.getElementById('errorMessage').textContent = 'Failed to reject the flight log. Please try again.';
            showModal('errorModal');
            setButtonLoading('rejectBtn', false);
          }
        }

        // Close modal when clicking outside of it
        window.onclick = function(event) {
          const successModal = document.getElementById('successModal');
          const errorModal = document.getElementById('errorModal');
          
          if (event.target === successModal) {
            closeWindow();
          }
          if (event.target === errorModal) {
            closeModal('errorModal');
          }
        }

        // Prevent body scroll when modal is open
        document.addEventListener('keydown', function(event) {
          if (event.key === 'Escape') {
            closeModal('errorModal');
          }
        });
      </script>
    </body>
    </html>`;

    res.send(html);
  } catch (error) {
    console.error("Error generating review page:", error);
    res.status(500).send("An error occurred while generating the review page");
  }
};