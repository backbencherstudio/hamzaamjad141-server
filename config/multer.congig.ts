
// import multer from 'multer';
// import path from 'path';
// import { v4 as uuidv4 } from 'uuid';
// import MulterGoogleCloudStorage from 'multer-cloud-storage';

// // Configure Google Cloud Storage
// const uploadHandler = multer({
//   storage: new MulterGoogleCloudStorage({
//     bucket: process.env.GCS_BUCKET,
//     projectId: process.env.GCLOUD_PROJECT,
//     keyFilename: process.env.GCS_KEYFILE,
//     filename: (req, file, cb) => {
//       const uniqueSuffix = uuidv4();
//       const ext = path.extname(file.originalname);
//       cb(null, `${uniqueSuffix}${ext}`);
//     }
//   })
// });

// export default uploadHandler;






import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage: storage });
export default upload