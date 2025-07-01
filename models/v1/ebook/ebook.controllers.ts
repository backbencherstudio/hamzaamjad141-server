import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { getImageUrl } from "../../../utils/base_utl";
import fs from "fs";

const prisma = new PrismaClient();

export const createEbooks = async (req: Request, res: Response) => {
  try {
    const { title, date } = req.body;

    const missingField = ["title", "date"].find((field) => !req.body[field]);

    if (missingField) {
      res.status(400).json({
        success: false,
        message: `${missingField} is required!`,
      });
      return;
    }

    const missingFile = ["pdf", "cover"].find(
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

    const pdfFile = files["pdf"][0];
    const coverFile = files["cover"][0];

    if (pdfFile.mimetype !== "application/pdf") {
      res.status(400).json({
        success: false,
        message: "The first file must be a PDF file",
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

    const portcusts = await prisma.ebook.create({
      data: {
        title,
        date: new Date(date),
        pdf: pdfFile.filename,
        cover: coverFile.filename,
      },
    });

    const responseData = {
      ...portcusts,
      pdf: getImageUrl(`/uploads/${pdfFile.filename}`),
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

export const getAllebook = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const ebooks = await prisma.ebook.findMany({
      skip: skip,
      take: limit,
    });

    const totalEbooks = await prisma.ebook.count();

    const totalPages = Math.ceil(totalEbooks / limit);

    const ebooksWithUrls = ebooks.map((ebook) => ({
      ...ebook,
      pdf: getImageUrl(`/uploads/${ebook.pdf}`),
      cover: getImageUrl(`/uploads/${ebook.cover}`),
    }));

    res.status(200).json({
      success: true,
      message: "Fetched ebooks successfully",
      data: {
        ebooks: ebooksWithUrls,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalEbooks,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch ebooks",
    });
  }
};

export const updateEbook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, date } = req.body;

    const ebook = await prisma.ebook.findUnique({
      where: { id: id },
    });

    if (!ebook) {
      res.status(404).json({
        success: false,
        message: "Ebook not found",
      });
      return;
    }

    if (!title || !date) {
      res.status(400).json({
        success: false,
        message: "Title and date are required to update the ebook",
      });
      return;
    }

    const updateData: any = {
      title,
      date: new Date(date),
    };

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (files["pdf"]) {
      const pdfFile = files["pdf"][0];
      if (pdfFile.mimetype !== "application/pdf") {
        res.status(400).json({
          success: false,
          message: "The PDF file must be a PDF file",
        });
        return;
      }

      const oldPdfFilePath = path.join(
        __dirname,
        "../../../uploads",
        ebook.pdf
      );
      if (fs.existsSync(oldPdfFilePath)) {
        fs.unlinkSync(oldPdfFilePath);
      }

      updateData.pdf = pdfFile.filename;
    }

    if (files["cover"]) {
      const coverFile = files["cover"][0];
      if (!coverFile.mimetype.startsWith("image/")) {
        res.status(400).json({
          success: false,
          message: "The cover file must be an image",
        });
        return;
      }

      const oldCoverFilePath = path.join(
        __dirname,
        "../../../uploads",
        ebook.cover
      );
      if (fs.existsSync(oldCoverFilePath)) {
        fs.unlinkSync(oldCoverFilePath);
      }

      updateData.cover = coverFile.filename;
    }

    const updatedEbook = await prisma.ebook.update({
      where: { id: ebook.id },
      data: updateData,
    });

    const responseData = {
      ...updatedEbook,
      pdf: getImageUrl(`/uploads/${updatedEbook.pdf}`),
      cover: getImageUrl(`/uploads/${updatedEbook.cover}`),
    };

    res.status(200).json({
      success: true,
      message: "Ebook updated successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error updating Ebook:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update Ebook",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
