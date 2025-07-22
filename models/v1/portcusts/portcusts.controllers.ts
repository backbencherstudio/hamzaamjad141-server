import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { getImageUrl } from "../../../utils/base_utl";
import fs from "fs";
import { deleteImageIfNeeded } from "../../../config/multer.config";

const prisma = new PrismaClient();

export const createPortcusts = async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const cleanupFiles = async () => {
    const tasks = [];
    if (files?.mp3) tasks.push(deleteImageIfNeeded(files.mp3[0]));
    if (files?.cover) tasks.push(deleteImageIfNeeded(files.cover[0]));
    await Promise.all(tasks);
  };

  try {
    const { title, hostName, date } = req.body;

    // Validate required fields
    const missingField = ["title", "hostName", "date"].find(
      (field) => !req.body[field]
    );

    if (missingField) {
      await cleanupFiles();
      return res.status(400).json({
        success: false,
        message: `${missingField} is required!`,
      });
    }

    // Validate uploaded files
    const missingFile = ["mp3", "cover"].find(
      (fileType) => !files[fileType]
    );

    if (missingFile) {
      await cleanupFiles();
      return res.status(400).json({
        success: false,
        message: `${missingFile} file is required!`,
      });
    }

    const mp3File = files["mp3"][0];
    const coverFile = files["cover"][0];

    // Validate file types
    if (!mp3File.mimetype.startsWith("audio/")) {
      await cleanupFiles();
      return res.status(400).json({
        success: false,
        message: "The first file must be an audio file (MP3)",
      });
    }

    if (!coverFile.mimetype.startsWith("image/")) {
      await cleanupFiles();
      return res.status(400).json({
        success: false,
        message: "The second file must be an image file",
      });
    }

    // Create record in database
    const portcusts = await prisma.portcusts.create({
      data: {
        title,
        hostName,
        date: new Date(date),
        mp3: mp3File.filename, // This is the GCS filename
        cover: coverFile.filename, // This is the GCS filename
      },
    });

    // Generate public URLs for the files
    const responseData = {
      ...portcusts,
      mp3: getImageUrl(`/${mp3File.filename}`),
      cover: getImageUrl(`/${coverFile.filename}`),
    };

    res.status(201).json({
      success: true,
      message: "Portcusts created successfully",
      data: responseData,
    });
  } catch (error) {
    await cleanupFiles();
    console.error("Error creating Portcusts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create Portcusts",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getAllPortcusts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || ""; 
    const skip = (page - 1) * limit;

    const totalPortcusts = await prisma.portcusts.count({
      where: {
        OR: [
          {
            title: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            hostName: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    const portcusts = await prisma.portcusts.findMany({
      skip: skip,
      take: limit,
      where: {
        OR: [
          {
            title: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            hostName: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    const totalPages = Math.ceil(totalPortcusts / limit);

 
    const portcustsWithUrls = portcusts.map((podcast) => ({
      ...podcast,
      mp3: getImageUrl(`/${podcast.mp3}`),
      cover: getImageUrl(`/${podcast.cover}`),
    }));

    res.status(200).json({
      success: true,
      message: "success...",
      data: {
        portcusts: portcustsWithUrls,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalPortcusts,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch podcasts",
    });
  }
};


export const updatePortcusts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, hostName, date } = req.body;

    const portcust = await prisma.portcusts.findUnique({
      where: { id },
    });

    if (!portcust) {
      return res.status(404).json({
        success: false,
        message: "Portcust not found",
      });
    }

    const updateData: any = {};

    if (title) updateData.title = title;
    if (hostName) updateData.hostName = hostName;
    if (date) updateData.date = new Date(date);

    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const mp3File = files["mp3"]?.[0];
      const coverFile = files["cover"]?.[0];

      if (mp3File) {
        if (!mp3File.mimetype.startsWith("audio/")) {
          return res.status(400).json({
            success: false,
            message: "The file must be an MP3 audio file",
          });
        }

        // Delete old file from GCS
        await deleteImageIfNeeded({ filename: portcust.mp3 });

        updateData.mp3 = mp3File.filename;
      }

      if (coverFile) {
        if (!coverFile.mimetype.startsWith("image/")) {
          return res.status(400).json({
            success: false,
            message: "The file must be an image",
          });
        }

        // Delete old file from GCS
        await deleteImageIfNeeded({ filename: portcust.cover });

        updateData.cover = coverFile.filename;
      }
    }

    const updatedPortcusts = await prisma.portcusts.update({
      where: { id },
      data: updateData,
    });

    const responseData = {
      ...updatedPortcusts,
      mp3: getImageUrl(`/${updatedPortcusts.mp3}`),
      cover: getImageUrl(`/${updatedPortcusts.cover}`),
    };

    res.status(200).json({
      success: true,
      message: "Portcust updated successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error updating Portcusts:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update Portcusts",
    });
  }
};


export const deletePortcusts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const portcust = await prisma.portcusts.findUnique({
      where: { id },
    });

    if (!portcust) {
      return res.status(404).json({
        success: false,
        message: "Portcust not found",
      });
    }

    // Delete files from GCS
    await Promise.all([
      deleteImageIfNeeded({ filename: portcust.mp3 }),
      deleteImageIfNeeded({ filename: portcust.cover }),
    ]);

    await prisma.portcusts.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Portcust deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Portcusts:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete Portcusts",
    });
  }
};
