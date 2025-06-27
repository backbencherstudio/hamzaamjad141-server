import { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createInstructor = async (req: Request, res: Response) => {
    console.log("Request body:", req.body);
  try {
    const { name, email, phone } = req.body;
    const userId = 1; // Assuming userId is available in the request
    if (!name || !email) {
       res.status(400).json({
        success: false,
        message: "Name, email",
      });
    }
    const UserData = await prisma.instructor.findUnique({
      where: { email: email },
    });
    if (!UserData) {
        const InstructorCreate = await prisma.instructor.create({
        data: {
            name: name,
            email: email,
            phone: phone,
            userId: userId,
        },
        });
        console.log("InstructorCreate:", InstructorCreate);
    }

    await prisma.instructor.update({
      where: { email },
      data: {
        name,
        email,
        phone,
      },
    });    
     res.status(200).json({
      success: true,
      message: "Data created successfully",
    });
  } catch (error) {
    console.error("Error in createUser:", error);
     res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
export const userInstructor = async (req: Request, res: Response) => {
    console.log("Request query:", req.query); 
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
    const instructors = await prisma.instructor.findMany({
      where: filter,
      include: {
        user: true,
      },
    });
    //const userId=instructors.map((instructor) => instructor.userId);  
    console.log("Instructors found:", instructors);

    if (instructors.length === 0) {
       res.status(404).json({
        success: false,
        message: "No instructors found matching the criteria",
      });
    }
    const userData= await prisma.user.findUnique({
      where: { id: instructors[0].userId }, 
      include: {
        userInstructor: true,
      },  
    });
    if (!userData) {
      const userInstructor=await prisma.userInstructor.create({
      data: { 
        name: instructors[0].name, 
        email: instructors[0].email,  
        userId: instructors[0].user.id, 
        insturctorId: instructors[0].id, 
        username: instructors[0].user.name,
        action: "active",
      },
    });
    }
    await prisma.userInstructor.update({
      where: { userId: instructors[0].userId }, 
      data: {
        name: instructors[0].name,
        email: instructors[0].email,
        phone: instructors[0].phone,
        insturctorId: instructors[0].id,
        username: instructors[0].user.name,
      },    
    });
    console.log("User data updated:", userData);

    res.status(200).json({
      success: true,
      data: userInstructor,
      message: "Instructors fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching instructor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch instructors",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

