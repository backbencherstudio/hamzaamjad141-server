import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import path from "path";
import { getImageUrl } from "../../../utils/base_utl";
import fs from "fs";

const prisma = new PrismaClient();

export const createEbooks = async (req: Request, res: Response) => {
  console.log(req.body);
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
      pdf: getImageUrl(`/uploads/${ebook.pdf}`),
      cover: getImageUrl(`/uploads/${ebook.cover}`)
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


// export const updateEbook = async (req: Request, res: Response) => {
//   console.log(req.body);
//   try {
//     const { id } = req.params;
//     const { title, date } = req.body;

//     const ebook = await prisma.ebook.findUnique({
//       where: { id },
//     });

//     if (!ebook) {
//       res.status(404).json({
//         success: false,
//         message: "Portcust not found",
//       });
//       return;
//     }

//     let pdfFileUrl = ebook.pdf;
//     let coverFileUrl = ebook.cover;

//     const updateData: any = {};

//     if (title) {
//       updateData.title = title;
//     }

//     if (date) {
//       updateData.date = new Date(date);
//     }

//     if (req.files) {
//       const files = req.files as { [fieldname: string]: Express.Multer.File[] };
//       const pdfFile = files["mp3"] ? files["pdf"][0] : undefined;
//       const coverFile = files["cover"] ? files["cover"][0] : undefined;

//       if (pdfFile && !pdfFile.mimetype.startsWith("audio/")) {
//         res.status(400).json({
//           success: false,
//           message: "The file must be an MP3 audio file",
//         });
//         return;
//       }

//       if (coverFile && !coverFile.mimetype.startsWith("image/")) {
//         res.status(400).json({
//           success: false,
//           message: "The file must be an image",
//         });
//         return;
//       }

//       if (pdfFile) {
//         const oldPdfFilePath = path.join(
//           __dirname,
//           "../../../uploads",
//           ebook.pdf
//         );
//         if (fs.existsSync(oldPdfFilePath)) {
//           fs.unlinkSync(oldPdfFilePath);
//         }
//         pdfFileUrl = pdfFile.filename;
//         updateData.mp3 = pdfFileUrl;
//       }

//       if (coverFile) {
//         const oldCoverFilePath = path.join(
//           __dirname,
//           "../../../uploads",
//           ebook.cover
//         );
//         if (fs.existsSync(oldCoverFilePath)) {
//           fs.unlinkSync(oldCoverFilePath);
//         }
//         coverFileUrl = coverFile.filename;
//         updateData.cover = coverFileUrl;
//       }
//     }

//     const updatedPortcusts = await prisma.portcusts.update({
//       where: { id },
//       data: updateData,
//     });

//     const responseData = {
//       ...updatedPortcusts,
//       mp3: getImageUrl(`/uploads/${updatedPortcusts.mp3}`),
//       cover: getImageUrl(`/uploads/${updatedPortcusts.cover}`),
//     };

//     res.status(200).json({
//       success: true,
//       message: "success...",
//       data: responseData,
//     });
//   } catch (error) {
//     console.error("Error updating Portcusts:", error);
//     res.status(500).json({
//       success: false,
//       message:
//         error instanceof Error ? error.message : "Failed to update Portcusts",
//     });
//   }
// };

export const updateEbook = async (req: Request, res: Response) => {
  console.log(req.body); // Log body for debugging (be careful in production)
  const { id } = req.params;
  const { title, date } = req.body;

  try {
    const ebook = await prisma.ebook.findUnique({
      where: { id },
    });

    if (!ebook) {
       res.status(404).json({
        success: false,
        message: "Ebook not found",
      });
      return
    }

    let pdfFileUrl = ebook.pdf;
    let coverFileUrl = ebook.cover;

    const updateData: any = {};

    if (title) {
      updateData.title = title;
    }

    if (date) {
      updateData.date = new Date(date);
    }

    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const pdfFile = files["pdf"] ? files["pdf"][0] : undefined;
      const coverFile = files["cover"] ? files["cover"][0] : undefined;

      if (pdfFile && !pdfFile.mimetype.startsWith("application/pdf")) {
         res.status(400).json({
          success: false,
          message: "The file must be a PDF file",
        });
        return
      }

      if (coverFile && !coverFile.mimetype.startsWith("image/")) {
         res.status(400).json({
          success: false,
          message: "The file must be an image",
        });
        return
      }

      if (pdfFile) {
        const oldPdfFilePath = path.join(__dirname, "../../../uploads", ebook.pdf);
        if (fs.existsSync(oldPdfFilePath)) {
          fs.unlinkSync(oldPdfFilePath); // Delete old PDF file
        }
        pdfFileUrl = pdfFile.filename;
        updateData.pdf = pdfFileUrl; // Use the correct field name
      }

      if (coverFile) {
        const oldCoverFilePath = path.join(__dirname, "../../../uploads", ebook.cover);
        if (fs.existsSync(oldCoverFilePath)) {
          fs.unlinkSync(oldCoverFilePath); // Delete old cover image
        }
        coverFileUrl = coverFile.filename;
        updateData.cover = coverFileUrl; // Use the correct field name
      }
    }

    const updatedEbook = await prisma.ebook.update({
      where: { id },
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

// deleteEbook
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
    const pdfFilePath = path.join(__dirname, "../../../uploads", ebook.pdf);
    const coverFilePath = path.join(__dirname, "../../../uploads", ebook.cover);

    // Delete PDF file if exists
    if (fs.existsSync(pdfFilePath)) {
      fs.unlinkSync(pdfFilePath);
    }
    // Delete cover image if exists
    if (fs.existsSync(coverFilePath)) {
      fs.unlinkSync(coverFilePath);
    }

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