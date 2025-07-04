import e, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createInstructor = async (req: any, res: Response) => {
  try {
    const { name, email, phone } = req.body;
    const missingField = ["name", "email", "phone"].find(
      (field) => !req.body[field]
    );

    if (missingField) {
      res.status(400).json({
        message: `${missingField} is required!`,
      });
      return;
    }

    const existingInstructor = await prisma.instructor.findUnique({
      where: { email: email },
    });

    if (existingInstructor) {
      res.status(400).json({
        success: false,
        message: "Instructor already exists.",
      });
      return;
    }

    const newInstructor = await prisma.instructor.create({
      data: {
        name,
        email,
        phone,
      },
    });

    res.status(201).json({
      success: true,
      message: "Instructor created successfully",
      data: newInstructor,
    });
  } catch (error) {
    console.error("Error in createInstructor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create instructor",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const findInstructor = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    if (!search) {
      // If no search term provided, return all instructors
      const instructors = await prisma.instructor.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
      res.status(200).json({
        success: true,
        data: instructors,
      });
      return;
    }

    const searchTerm = search as string;

    const instructors = await prisma.instructor.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: instructors,
    });
  } catch (error) {
    console.error("Error in findInstructor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve instructors",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateInstructor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Instructor ID is required",
      });
      return;
    }
    const existingInstructor = await prisma.instructor.findUnique({
      where: { id },
    });

    if (!existingInstructor) {
      res.status(404).json({
        success: false,
        message: "Instructor not found",
      });
      return;
    }
    if (email && email !== existingInstructor.email) {
      const emailExists = await prisma.instructor.findUnique({
        where: { email },
      });

      if (emailExists) {
        res.status(400).json({
          success: false,
          message: "Email already in use by another instructor",
        });
        return;
      }
    }

    const updatedInstructor = await prisma.instructor.update({
      where: { id },
      data: {
        name: name || existingInstructor.name,
        email: email || existingInstructor.email,
        phone: phone || existingInstructor.phone,
      },
    });

    res.status(200).json({
      success: true,
      message: "Instructor updated successfully",
      data: updatedInstructor,
    });
  } catch (error) {
    console.error("Error in updateInstructor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update instructor",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteInstructor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Instructor ID is required",
      });
      return;
    }

    const existingInstructor = await prisma.instructor.findUnique({
      where: { id },
    });

    if (!existingInstructor) {
      res.status(404).json({
        success: false,
        message: "Instructor not found",
      });
      return;
    }

    await prisma.instructor.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Instructor deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteInstructor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete instructor",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const userInstructor = async (req: any, res: Response) => {
  const {id} = req.params;
  
  try {
    const userId = req.user?.userId;
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId, 
      },
    });
    const Instructor = await prisma.instructor.findUnique({
      where: {
        id: id, 
      },
    });
    const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      name: existingUser.name,
      email: existingUser.email,
      instructorId: Instructor.id,
    },
  });
  res.status(200).json({
      success: true,
      data: updatedUser,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
