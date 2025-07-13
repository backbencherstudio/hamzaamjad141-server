"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllInstructors = exports.toDeActiveInstructor = exports.toActiveInstructor = exports.userInstructor = exports.deleteInstructor = exports.updateInstructor = exports.findInstructor = exports.myInstructor = exports.createInstructorByUser = exports.createInstructor = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createInstructor = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const missingField = ["name", "email", "phone"].find((field) => !req.body[field]);
        if (missingField) {
            res.status(400).json({
                message: `${missingField} is required!`,
            });
            return;
        }
        const existingInstructor = await prisma.instructor.findMany({
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
    }
    catch (error) {
        console.error("Error in createInstructor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create instructor",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.createInstructor = createInstructor;
const createInstructorByUser = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const missingField = ["name", "email", "phone"].find((field) => !req.body[field]);
        if (missingField) {
            res.status(400).json({
                message: `${missingField} is required!`,
            });
            return;
        }
        // const existingInstructor = await prisma.instructor.findUnique({
        //   where: { email: email },
        // });
        // if (existingInstructor) {
        //   res.status(400).json({
        //     success: false,
        //     message: "Instructor already exists.",
        //   });
        //   return;
        // }
        const newInstructor = await prisma.instructor.create({
            data: {
                name,
                email,
                phone,
                verify: false,
            },
        });
        res.status(201).json({
            success: true,
            message: "Instructor created successfully",
            data: newInstructor,
        });
    }
    catch (error) {
        console.error("Error in createInstructor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create instructor",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.createInstructorByUser = createInstructorByUser;
const myInstructor = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(400).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                instructor: true,
            },
        });
        if (!user || !user.instructor) {
            res.status(404).json({
                success: false,
                message: "Instructor not found for this user",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: user.instructor,
        });
    }
    catch (error) {
        console.error("Error in myInstructor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve instructor",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.myInstructor = myInstructor;
const findInstructor = async (req, res) => {
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
        const searchTerm = search;
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
    }
    catch (error) {
        console.error("Error in findInstructor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve instructors",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.findInstructor = findInstructor;
const updateInstructor = async (req, res) => {
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
            const emailExists = await prisma.instructor.findMany({
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
    }
    catch (error) {
        console.error("Error in updateInstructor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update instructor",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.updateInstructor = updateInstructor;
const deleteInstructor = async (req, res) => {
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
    }
    catch (error) {
        console.error("Error in deleteInstructor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete instructor",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.deleteInstructor = deleteInstructor;
const userInstructor = async (req, res) => {
    const { id } = req.params;
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(400).json({
                success: false,
                message: "User ID not found!",
            });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            res.status(400).json({
                success: false,
                message: "User not found!",
            });
            return;
        }
        const instructor = await prisma.instructor.findUnique({
            where: { id: id },
        });
        if (!instructor) {
            res.status(404).json({
                success: false,
                message: "Instructor not found!",
            });
            return;
        }
        await prisma.user.update({
            where: { id: userId },
            data: {
                instructorId: instructor.id,
            },
        });
        res.status(200).json({
            success: true,
            data: {
                id: instructor.id,
                name: instructor.name,
                email: instructor.email,
                phone: instructor.phone,
                createdAt: instructor.createdAt,
                updatedAt: instructor.updatedAt,
            },
        });
    }
    catch (error) {
        console.error("Error in userInstructor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update instructor data",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.userInstructor = userInstructor;
const toActiveInstructor = async (req, res) => {
    const { id } = req.params;
    try {
        const instructor = await prisma.instructor.findUnique({
            where: { id },
        });
        if (!instructor) {
            res.status(404).json({
                success: false,
                message: "Instructor not found!",
            });
            return;
        }
        if (instructor.status === "ACTIVE") {
            res.status(400).json({
                success: false,
                message: "Instructor is already active!",
            });
            return;
        }
        const updatedInstructor = await prisma.instructor.update({
            where: { id },
            data: { status: "ACTIVE" },
        });
        res.status(200).json({
            success: true,
            message: "Instructor activated successfully!",
            data: updatedInstructor,
        });
    }
    catch (error) {
        console.error("Error in toActiveInstructor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to activate instructor",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.toActiveInstructor = toActiveInstructor;
const toDeActiveInstructor = async (req, res) => {
    const { id } = req.params;
    try {
        const instructor = await prisma.instructor.findUnique({
            where: { id },
        });
        if (!instructor) {
            res.status(404).json({
                success: false,
                message: "Instructor not found!",
            });
            return;
        }
        if (instructor.status === "DEACTIVE") {
            res.status(400).json({
                success: false,
                message: "Instructor is already deactivated!",
            });
            return;
        }
        const updatedInstructor = await prisma.instructor.update({
            where: { id },
            data: { status: "DEACTIVE" },
        });
        res.status(200).json({
            success: true,
            message: "Instructor deactivated successfully!",
            data: updatedInstructor,
        });
    }
    catch (error) {
        console.error("Error in toDeActiveInstructor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to deactivate instructor",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.toDeActiveInstructor = toDeActiveInstructor;
const getAllInstructors = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", type = "ALL" } = req.query;
        const pageNumber = parseInt(page, 10);
        const pageLimit = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageLimit;
        const validInstructorTypes = ["ACTIVE", "DEACTIVE", "ALL"];
        if (!validInstructorTypes.includes(type)) {
            res.status(400).json({
                success: false,
                message: `"${type}" is not a valid instructor type. Please use "ACTIVE", "DEACTIVE", or "ALL".`,
            });
            return;
        }
        const instructors = await prisma.instructor.findMany({
            skip: skip,
            take: pageLimit,
            orderBy: {
                createdAt: "desc",
            },
            where: {
                AND: [
                    {
                        OR: [
                            {
                                name: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                            {
                                email: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        ],
                    },
                    ...(type !== "ALL" ? [{ status: type }] : []),
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
                createdAt: true,
                users: {
                    select: {
                        name: true,
                        email: true,
                        license: true,
                    },
                },
            },
        });
        const totalInstructors = instructors.length;
        res.status(200).json({
            success: true,
            data: instructors,
            total: totalInstructors,
            page: pageNumber,
            totalPages: Math.ceil(totalInstructors / pageLimit),
        });
    }
    catch (error) {
        console.error("Error fetching instructors:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch instructors",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getAllInstructors = getAllInstructors;
//# sourceMappingURL=instructors.controllers.js.map