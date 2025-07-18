
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import MulterGoogleCloudStorage from 'multer-cloud-storage';
import { Storage } from '@google-cloud/storage';


// Configure Google Cloud Storage
const uploadHandler = multer({
  storage: new MulterGoogleCloudStorage({
    bucket: process.env.GCS_BUCKET,
    projectId: process.env.GCLOUD_PROJECT,
    keyFilename: path.join(__dirname, 'gcs-key.json'),
    filename: (req, file, cb) => {
      const uniqueSuffix = uuidv4();
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    }
  })
});

export default uploadHandler;




export const deleteImageIfNeeded = async (
  newImage: Express.Multer.File | { filename: string } | undefined
) => {
  if (newImage && newImage.filename) {
    try {
      const storage = new Storage({
        keyFilename: path.join(__dirname, 'gcs-key.json'),
        projectId: process.env.GCLOUD_PROJECT
      });
      
      const bucket = storage.bucket(process.env.GCS_BUCKET);
      const file = bucket.file(newImage.filename);
      
      const exists = await file.exists();
      if (exists[0]) {
        await file.delete();
      }
    } catch (error) {
      console.error('Error deleting file from Google Cloud Storage:', error);
    }
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