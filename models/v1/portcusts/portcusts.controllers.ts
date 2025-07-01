import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { getImageUrl } from "../../../utils/base_utl";
import fs from "fs";

const prisma = new PrismaClient();

export const createPortcusts = async (req: Request, res: Response) => {
  try {
    const { title, hostName, date } = req.body;

    const missingField = ["title", "hostName", "date"].find(
      (field) => !req.body[field]
    );

    if (missingField) {
      res.status(400).json({
        success: false,
        message: `${missingField} is required!`,
      });
      return;
    }

    const missingFile = ["mp3", "cover"].find(
      (fileType) => !req.files[fileType]
    );

    if (missingFile) {
      res.status(400).json({
        success: false,
        message: `${missingFile} file is required!`,
      });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const mp3File = files["mp3"][0];
    const coverFile = files["cover"][0];

    if (!mp3File.mimetype.startsWith("audio/")) {
      res.status(400).json({
        success: false,
        message: "The first file must be an audio file (MP3)",
      });
      return;
    }

    if (!coverFile.mimetype.startsWith("image/")) {
      res.status(400).json({
        success: false,
        message: "The second file must be an image file",
      });
      return;
    }

    const portcusts = await prisma.portcusts.create({
      data: {
        title,
        hostName,
        date: new Date(date),
        mp3: mp3File.filename,
        cover: coverFile.filename,
      },
    });

    const responseData = {
      ...portcusts,
      mp3: getImageUrl(`/uploads/${mp3File.filename}`),
      cover: getImageUrl(`/uploads/${coverFile.filename}`),
    };

    res.status(201).json({
      success: true,
      message: "Portcusts created successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error creating Portcusts:", error);
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      Object.values(files).forEach((fileArray) => {
        fileArray.forEach((file) => {
          const filePath = path.join(
            __dirname,
            "../../../uploads",
            file.filename
          );
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      });
    }

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
    const skip = (page - 1) * limit;

    const portcusts = await prisma.portcusts.findMany({
      skip: skip,
      take: limit,
    });

    const totalPortcusts = await prisma.portcusts.count();

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
