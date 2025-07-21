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
      mp3: getImageUrl(`/uploads/${podcast.mp3}`),
      cover: getImageUrl(`/uploads/${podcast.cover}`),
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
      res.status(404).json({
        success: false,
        message: "Portcust not found",
      });
      return;
    }

    let mp3FileUrl = portcust.mp3;
    let coverFileUrl = portcust.cover;

    const updateData: any = {};

    if (title) {
      updateData.title = title;
    }

    if (hostName) {
      updateData.hostName = hostName;
    }

    if (date) {
      updateData.date = new Date(date);
    }

    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const mp3File = files["mp3"] ? files["mp3"][0] : undefined;
      const coverFile = files["cover"] ? files["cover"][0] : undefined;

      if (mp3File && !mp3File.mimetype.startsWith("audio/")) {
        res.status(400).json({
          success: false,
          message: "The file must be an MP3 audio file",
        });
        return;
      }

      if (coverFile && !coverFile.mimetype.startsWith("image/")) {
        res.status(400).json({
          success: false,
          message: "The file must be an image",
        });
        return;
      }

      if (mp3File) {
        const oldMp3FilePath = path.join(
          __dirname,
          "../../../uploads",
          portcust.mp3
        );
        if (fs.existsSync(oldMp3FilePath)) {
          fs.unlinkSync(oldMp3FilePath);
        }
        mp3FileUrl = mp3File.filename;
        updateData.mp3 = mp3FileUrl;
      }

      if (coverFile) {
        const oldCoverFilePath = path.join(
          __dirname,
          "../../../uploads",
          portcust.cover
        );
        if (fs.existsSync(oldCoverFilePath)) {
          fs.unlinkSync(oldCoverFilePath);
        }
        coverFileUrl = coverFile.filename;
        updateData.cover = coverFileUrl;
      }
    }

    const updatedPortcusts = await prisma.portcusts.update({
      where: { id },
      data: updateData,
    });

    const responseData = {
      ...updatedPortcusts,
      mp3: getImageUrl(`/uploads/${updatedPortcusts.mp3}`),
      cover: getImageUrl(`/uploads/${updatedPortcusts.cover}`),
    };

    res.status(200).json({
      success: true,
      message: "success...",
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
      res.status(404).json({
        success: false,
        message: "Portcust not found",
      });
      return;
    }

    const mp3FilePath = path.join(__dirname, "../../../uploads", portcust.mp3);
    const coverFilePath = path.join(
      __dirname,
      "../../../uploads",
      portcust.cover
    );

    if (fs.existsSync(mp3FilePath)) {
      fs.unlinkSync(mp3FilePath);
    }

    if (fs.existsSync(coverFilePath)) {
      fs.unlinkSync(coverFilePath);
    }

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
