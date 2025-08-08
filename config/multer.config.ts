import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import MulterGoogleCloudStorage from "multer-cloud-storage";
import { Storage } from "@google-cloud/storage";
import { getGCSAuth, validateGCSConfig } from "../utils/gcsAuth.utils";

// Validate GCS configuration on startup
if (!validateGCSConfig()) {
  console.error("❌ Invalid GCS configuration. Please check your environment variables.");
}

// Configure Google Cloud Storage
const uploadHandler = multer({
  storage: new MulterGoogleCloudStorage({
    bucket: process.env.GCS_BUCKET,
    ...getGCSAuth(),
    filename: (req, file, cb) => {
      const uniqueSuffix = uuidv4();
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
});

export default uploadHandler;

export const deleteImageIfNeeded = async (
  newImage: Express.Multer.File | { filename: string } | undefined
) => {
  if (newImage && newImage.filename) {
    try {
      const storage = new Storage(getGCSAuth());

      const bucket = storage.bucket(process.env.GCS_BUCKET!);
      const file = bucket.file(newImage.filename);

      const exists = await file.exists();
      if (exists[0]) {
        await file.delete();
      }
    } catch (error) {
      console.error("Error deleting file from Google Cloud Storage:", error);
    }
  }
};

export const downloadAndSaveImage = async (imageUrl: string): Promise<string> => {
  try {
    // Clean up malformed URLs (remove storage.googleapis.com prefix if present)
    // const cleanUrl = imageUrl.includes('storage.googleapis.com/') 
    //   ? imageUrl.split('storage.googleapis.com/')[1]
    //   : imageUrl;

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to download image");

    const buffer = await response.arrayBuffer();
    const filename = `${uuidv4()}.jpg`;
    
    // Initialize Google Cloud Storage with dynamic auth configuration
    const storage = new Storage(getGCSAuth());
    
    const bucket = storage.bucket(process.env.GCS_BUCKET!);
    const file = bucket.file(filename);
    
    // Upload buffer to Google Cloud Storage
    await file.save(Buffer.from(buffer), {
      metadata: {
        contentType: 'image/jpeg'
      }
    });

    return filename;
  } catch (error) {
    console.error("Error saving image to Google Cloud Storage:", error);
    throw new Error("Failed to save image to cloud storage");
  }
};







// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';
// import { v4 as uuidv4 } from 'uuid';

// const uploadsDir = path.join(__dirname, '../uploads');

// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadsDir);
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = uuidv4();
//     const ext = path.extname(file.originalname);
//     cb(null, `${uniqueSuffix}${ext}`);
//   }
// });

// const upload = multer({ storage: storage });
// export default upload


