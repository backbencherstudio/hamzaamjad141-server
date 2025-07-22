import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import path from "path";
import { getImageUrl } from "../../../utils/base_utl";
import fs from "fs";
import { deleteImageIfNeeded } from "../../../config/multer.config";

const prisma = new PrismaClient();

// export const createEbooks = async (req: Request, res: Response) => {
//   console.log(req.body);
//   try {
//     const { title, date } = req.body;

//     const missingField = ["title", "date"].find((field) => !req.body[field]);

//     if (missingField) {
//       res.status(400).json({
//         success: false,
//         message: `${missingField} is required!`,
//       });
//       return;
//     }

//     const missingFile = ["pdf", "cover"].find(
//       (fileType) => !req.files[fileType]
//     );

//     if (missingFile) {
//       res.status(400).json({
//         success: false,
//         message: `${missingFile} file is required!`,
//       });
//       return;
//     }

//     const files = req.files as { [fieldname: string]: Express.Multer.File[] };

//     const pdfFile = files["pdf"][0];
//     const coverFile = files["cover"][0];

//     if (pdfFile.mimetype !== "application/pdf") {
//       res.status(400).json({
//         success: false,
//         message: "The first file must be a PDF file",
//       });
//       return;
//     }

//     if (!coverFile.mimetype.startsWith("image/")) {
//       res.status(400).json({
//         success: false,
//         message: "The second file must be an image file",
//       });
//       return;
//     }

//     const portcusts = await prisma.ebook.create({
//       data: {
//         title,
//         date: new Date(date),
//         pdf: pdfFile.filename,
//         cover: coverFile.filename,
//       },
//     });

//     const responseData = {
//       ...portcusts,
//       pdf: getImageUrl(`/${pdfFile.filename}`),
//       cover: getImageUrl(`/${coverFile.filename}`),
//     };

//     res.status(201).json({
//       success: true,
//       message: "Portcusts created successfully",
//       data: responseData,
//     });
//   } catch (error) {
//     console.error("Error creating Portcusts:", error);
//     if (req.files) {
//       const files = req.files as { [fieldname: string]: Express.Multer.File[] };
//       Object.values(files).forEach((fileArray) => {
//         fileArray.forEach((file) => {
//           const filePath = path.join(
//             __dirname,
//             "../../../uploads",
//             file.filename
//           );
//           if (fs.existsSync(filePath)) {
//             fs.unlinkSync(filePath);
//           }
//         });
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: "Failed to create Portcusts",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// };



export const createEbooks = async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const cleanupFiles = async () => {
    const tasks = [];
    if (files?.pdf) tasks.push(deleteImageIfNeeded(files.pdf[0]));
    if (files?.cover) tasks.push(deleteImageIfNeeded(files.cover[0]));
    await Promise.all(tasks);
  };

  try {
    const { title, date } = req.body;

    // Validate required fields
    if (!title || !date) {
      await cleanupFiles();
      return res.status(400).json({
        success: false,
        message: `${!title ? "title" : "date"} is required!`,
      });
    }

    // Validate uploaded files
    const pdfFile = files?.pdf?.[0];
    const coverFile = files?.cover?.[0];

    if (!pdfFile || !coverFile) {
      await cleanupFiles();
      return res.status(400).json({
        success: false,
        message: `${!pdfFile ? "pdf" : "cover"} file is required!`,
      });
    }

    if (pdfFile.mimetype !== "application/pdf") {
      await cleanupFiles();
      return res.status(400).json({
        success: false,
        message: "The first file must be a PDF file",
      });
    }

    if (!coverFile.mimetype.startsWith("image/")) {
      await cleanupFiles();
      return res.status(400).json({
        success: false,
        message: "The second file must be an image file",
      });
    }

    // Create ebook entry in DB
    const ebook = await prisma.ebook.create({
      data: {
        title,
        date: new Date(date),
        pdf: pdfFile.filename,
        cover: coverFile.filename,
      },
    });

    res.status(201).json({
      success: true,
      message: "Ebook created successfully",
      data: {
        ...ebook,
        pdf: getImageUrl(`/${pdfFile.filename}`),
        cover: getImageUrl(`/${coverFile.filename}`),
      },
    });
  } catch (error) {
    await cleanupFiles();
    res.status(500).json({
      success: false,
      message: "Failed to create ebook",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};



export const getAllebook = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string)?.trim();

    const searchFilter: Prisma.EbookWhereInput = search
      ? {
          title: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {};

    const [ebooks, totalEbooks] = await Promise.all([
      prisma.ebook.findMany({
        where: searchFilter,
        skip,
        take: limit,
        orderBy: {
          date: "desc",
        },
      }),
      prisma.ebook.count({ where: searchFilter }),
    ]);

    const totalPages = Math.ceil(totalEbooks / limit);

    const ebooksWithUrls = ebooks.map((ebook) => ({
      ...ebook,
      pdf: getImageUrl(`/${ebook.pdf}`),
      cover: getImageUrl(`/${ebook.cover}`),
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


export const searchEbooks = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const searchQuery = req.query.search as string || '';
    const skip = (page - 1) * limit;

    // Properly typed where clause
    const whereClause: Prisma.EbookWhereInput = searchQuery 
      ? {
          title: {
            contains: searchQuery,
            mode: 'insensitive' as const // Cast to Prisma's QueryMode type
          }
        } 
      : {};

    const [ebooks, totalEbooks] = await Promise.all([
      prisma.ebook.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.ebook.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalEbooks / limit);

    const ebooksWithUrls = ebooks.map(ebook => ({
      ...ebook,
      pdf: getImageUrl(`/${ebook.pdf}`),
      cover: getImageUrl(`/${ebook.cover}`)
    }));

    res.status(200).json({
      success: true,
      message: searchQuery 
        ? `Found ${ebooks.length} ebooks matching "${searchQuery}"`
        : 'Fetched all ebooks',
      data: {
        ebooks: ebooksWithUrls,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalEbooks,
          itemsPerPage: limit
        },
        searchQuery: searchQuery || null
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search ebooks',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


export const updateEbook = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, date } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const cleanupFiles = async () => {
    const tasks = [];
    if (files?.pdf) tasks.push(deleteImageIfNeeded(files.pdf[0]));
    if (files?.cover) tasks.push(deleteImageIfNeeded(files.cover[0]));
    await Promise.all(tasks);
  };

  try {
    const ebook = await prisma.ebook.findUnique({ where: { id } });

    if (!ebook) {
      await cleanupFiles();
      return res.status(404).json({
        success: false,
        message: "Ebook not found",
      });
    }

    const updateData: any = {
      ...(title && { title }),
      ...(date && { date: new Date(date) }),
    };

    const pdfFile = files?.pdf?.[0];
    const coverFile = files?.cover?.[0];

    // Validate PDF
    if (pdfFile) {
      if (pdfFile.mimetype !== "application/pdf") {
        await cleanupFiles();
        return res.status(400).json({
          success: false,
          message: "The file must be a PDF file",
        });
      }
      await deleteImageIfNeeded({ filename: ebook.pdf });
      updateData.pdf = pdfFile.filename;
    }

    // Validate Cover
    if (coverFile) {
      if (!coverFile.mimetype.startsWith("image/")) {
        await cleanupFiles();
        return res.status(400).json({
          success: false,
          message: "The file must be an image",
        });
      }
      await deleteImageIfNeeded({ filename: ebook.cover });
      updateData.cover = coverFile.filename;
    }

    const updatedEbook = await prisma.ebook.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Ebook updated successfully",
      data: {
        ...updatedEbook,
        pdf: getImageUrl(`/${updatedEbook.pdf}`),
        cover: getImageUrl(`/${updatedEbook.cover}`),
      },
    });
  } catch (error) {
    await cleanupFiles();
    res.status(500).json({
      success: false,
      message: "Failed to update ebook",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteEbook = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const ebook = await prisma.ebook.findUnique({
      where: { id },
    });

    if (!ebook) {
      res.status(404).json({
        success: false,
        message: "Ebook not found",
      });
      return;
    }

    // Delete files from cloud storage
    await deleteImageIfNeeded({ filename: ebook.pdf });
    await deleteImageIfNeeded({ filename: ebook.cover });

    // Delete ebook from database
    await prisma.ebook.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Ebook deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Ebook:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete Ebook",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};