import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();



export const getAllPilotUser = async (req: Request, res: Response) => {
  const { status, page = 1, limit = 10, favorite, search } = req.query;

  try {
    const currentPage = Number(page);
    const itemsPerPage = Number(limit);

    let userStatus: "ACTIVE" | "DEACTIVE" | undefined = undefined;

    if (status === "ACTIVE" || status === "DEACTIVE") {
      userStatus = status.toUpperCase() as "ACTIVE" | "DEACTIVE";
    }

    const favoriteLocations = favorite
      ? Array.isArray(favorite)
        ? favorite
        : [favorite]
      : undefined;

    const weatherWhere: any = {
      OR: [{ status: "HOMEBASE" }, { status: "FAVURATE" }],
    };

    if (favoriteLocations) {
      weatherWhere.AND = [
        { status: "FAVURATE" },
        { location: { in: favoriteLocations as string[] } },
      ];
    }

    const searchWhere = search
      ? {
          OR: [
            {
              name: {
                contains: search as string,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              email: {
                contains: search as string,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where: {
        status: userStatus,
        role: "USER",
        Weather: favoriteLocations
          ? {
              some: {
                status: "FAVURATE",
                location: { in: favoriteLocations as string[] },
              },
            }
          : undefined,
        ...searchWhere,
      },
      select: {
        id: true,
        name: true,
        email: true,
        license: true,
        premium: true,
        status: true,
        createdAt: true,
        Weather: {
          select: {
            location: true,
            status: true,
          },
          where: weatherWhere,
        },
      },
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: {
        createdAt: "desc",
      },
    });

    const transformedUsers = users.map((user) => {
      const homeBase = user.Weather.find(
        (w) => w.status === "HOMEBASE"
      )?.location;
      const favorites = user.Weather.filter((w) => w.status === "FAVURATE").map(
        (w) => w.location
      );

      const { Weather, ...userData } = user;

      return {
        ...userData,
        homeBase: homeBase || null,
        favorites: favorites.length > 0 ? favorites : null,
      };
    });

    const totalUsers = await prisma.user.count({
      where: {
        status: userStatus,
        role: "USER",
        Weather: favoriteLocations
          ? {
              some: {
                status: "FAVURATE",
                location: { in: favoriteLocations as string[] },
              },
            }
          : undefined,
        ...searchWhere, // Apply search filter here too
      },
    });

    res.status(200).json({
      success: true,
      users: transformedUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / itemsPerPage),
      currentPage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};



export const membership = async (req: Request, res: Response) => {
  try {
    const { status = "", search = "", page = 1, limit = 10 } = req.query;

    const whereConditions: any = {};

    if (search) {
      whereConditions.OR = [
        { name: { contains: search.toString(), mode: "insensitive" } },
        { email: { contains: search.toString(), mode: "insensitive" } },
      ];
    }

    if (status === "ACTIVE" || status === "DEACTIVE") {
      whereConditions.subscription = {
        some: {
          status: status
        }
      };
    }

    const users = await prisma.user.findMany({
      where: whereConditions,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        name: true,
        email: true,
        premium: true,
        status: true,
        subscription: {
          where: status === "ACTIVE" || status === "DEACTIVE" 
            ? { status: status } 
            : undefined,
          select: {
            startDate: true,
            status: true,
          },
          orderBy: {
            startDate: 'desc'
          }
        },
      },
    });


    const filteredUsers = users.filter(user => 
      status === "ACTIVE" || status === "DEACTIVE" 
        ? user.subscription.length > 0 
        : true
    );

    const totalUsers = await prisma.user.count({
      where: whereConditions,
    });

    res.status(200).json({
      success: true,
      data: filteredUsers,
      totalUsers,
      totalPages: Math.ceil(totalUsers / Number(limit)),
      currentPage: Number(page),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const overview = async (req: Request, res: Response) => {
  try {
    const { limit = 3 } = req.query;
    const limitNumber = Math.max(Number(limit), 1);

    const totalUsers = await prisma.user.count({
      where: {
        role: "USER"
      }
    });

    const totalInstructors = await prisma.instructor.count();

    const totalSubscribers = await prisma.subscription.count({
      where: {
        status: "ACTIVE",
        user: {
          role: "USER"
        }
      },
    });


    const newMemberships = await prisma.subscription.findMany({
      where: {
        user: {
          role: "USER"
        }
      },
      orderBy: {
        startDate: "desc",
      },
      take: limitNumber,
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            premium: true,
          },
        },
        startDate: true,
        status: true,
      },
    });


    const newPilotUsers = await prisma.user.findMany({
      where: {
        role: "USER"
      },
      take: limitNumber,
      select: {
        id: true,
        name: true,
        email: true,
        license: true,
        status: true,
        Weather: {
          select: {
            location: true,
            status: true,
          },
          where: {
            status: {
              in: ["HOMEBASE", "FAVURATE"],
            },
          },
        },
      },
    });

    const newInstructors = await prisma.instructor.findMany({
      take: limitNumber,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        users: {
          where: {
            role: "USER"
          },
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Overview fetched successfully",
      data: {
        totalUsers,
        totalInstructors,
        totalSubscribers,
        newMemberships,
        newPilotUsers,
        newInstructors,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const toActiveUser = async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found!",
      });
      return;
    }

    if (user.status === "ACTIVE") {
      res.status(400).json({
        success: false,
        message: "User is already active!",
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    res.status(200).json({
      success: true,
      message: "User activated successfully!",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error in toActiveUser:", error);
    res.status(500).json({
      success: false,
      message: "Failed to activate user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};


export const toDeActiveUser = async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found!",
      });
      return;
    }

    if (user.status === "DEACTIVE") {
      res.status(400).json({
        success: false,
        message: "User is already deactivated!",
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: "DEACTIVE" },
    });

    res.status(200).json({
      success: true,
      message: "User deactivated successfully!",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error in toDeActiveUser:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};