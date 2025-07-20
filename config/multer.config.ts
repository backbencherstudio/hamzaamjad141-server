import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import MulterGoogleCloudStorage from "multer-cloud-storage";
import { Storage } from "@google-cloud/storage";

// Configure Google Cloud Storage
const uploadHandler = multer({
  storage: new MulterGoogleCloudStorage({
    bucket: process.env.GCS_BUCKET,
    projectId: process.env.GCLOUD_PROJECT,
    keyFilename: path.join(__dirname, "gcs-key.json"),
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
      const storage = new Storage({
        keyFilename: path.join(__dirname, "gcs-key.json"),
        projectId: process.env.GCLOUD_PROJECT,
      });

      const bucket = storage.bucket(process.env.GCS_BUCKET);
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
    
    // Initialize Google Cloud Storage with absolute path to credentials
    const storage = new Storage({
      keyFilename: path.resolve(__dirname, "gcs-key.json"),
      projectId: process.env.GCLOUD_PROJECT
    });
    
    const bucket = storage.bucket(process.env.GCS_BUCKET);
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




// {
//   "type": "service_account",
//   "project_id": "gen-lang-client-0475403800",
//   "private_key_id": "9c7c0debaa854a7d06f3110556a32bcbcf78ca67",
//   "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCdG9gF4EkDewxF\nT5h6WBa98XxH3YUkg1JI/zOukDSoiOCp3PMQkDfiwdfIwML65MCjA9A9JepgMVP7\neZztEtAWOWB6R/2CLaUI8qiQ1NP2eTkknJHuiseGcy2P+BRhjr2twhfyWONO3kGk\ndNF0oamgL5h06zWKAgtlT3p4wcuYriezkA2fHd7LN98uEx4AX9VG6pOWVqjF4TPZ\n7CZP4P4JaGPBc3iY35oYc2N7bUSjllPaPLSH9X9rxwvz0lFWV3ojTPAhJK9HB+6k\nz+t5PetpkjDPOMdnjtKUwAS9P81dubvjMFCw+ZnCaAPW3SxzN+KLR7GuuO5WAniL\n2ayFmePPAgMBAAECggEACiIYndBohSvzj6jhmcqCtP+VV4FHLCK4NPMY30J30wL5\nEpuopcHXiO2dwFoGeW41qo39aWQ/qLKlywt9/qB/AV/0BA8On83X3irgim7fuP76\nm4zpsKwM0HQvVSDYF67ANyvUpZHsH1Mggr3yIIaozSckuy3Mhzk4iPFGYfGF8zP2\nhn78Nrh0SUr8PQijDUNa+Z/2pV5jIWXUjhgxgMdldPpI154rBKyvwrkCxYeeGX58\nlU+AuJYTyaFpm63K+O4olphNDKANDDLWU1B3SzKGoGJ3ZtPw+Ps3dc81Yd0VoK2Q\nNBy5W18LTO0rZgbuLGF68f5fnt34ZoX/8e3PtsXr0QKBgQDKW5Gp5mgZb3R7S/rv\nCmq1qYZOuL9NlFPJPFWQKmXBqOvT5DMRrlsCAcOsy87uuZ4jbVlG7jxoNSIuxhBX\noKBHjoT20wHoExMPuLB6HsBPdwEmFJu/LjGvbvTdfeQlueiFsESkA2wvRwyvyLfo\n7Odasjo2Oaubi/OgQ79QYay2aQKBgQDGwZWxkBej8WXoweHp7MmvdAfk2mEfP8l/\ndC2nthyuwgI8Sw0/j0RudP8z9U2RI0mFSVUp4ra0wXE/85fIuyiKSpkendSr7zl0\n/QhU2UKSJEiAFRLmX7/UDPuXlmtfGYpMr/zYlJN9/CVY0+yvjOBZIANkPzx8Xb88\nlBBT/U8xdwKBgQCq8yKiepB09HBd/Pk3WgB+CYH6HR8X5ffGaF8MVJT0PsVDk2QF\nStt9XYo1/1OI32yWFzm1r2t+yWxgQVjq/jqJWQBBGE9jBEI1JNyJvlLOjwV8ayqM\nHvVAdKcOOt0zddPWpOvH91A8vHQeSJ39e62TND/zMVMlK90cBj+oI2vqCQKBgG1x\nNTNT66CLkRkMgZBkoV3qX1pl4WrqndJ/r5AU2FBmZgK7NO1Vv1GvPMNohLCxpI8v\nJSTuQLrhdbHIOUD/xb/4eb4BHJUcIiBIIGlQRLbiIcXdVM3j1WY3S+ZZnn/8OUom\n8ex0S47o48u4zjCQOwz4csWliHHW0THTOfZ1mkDbAoGAPfhOwahm+TqWT1Klw3/N\n3q5sf2/feBRi+E++JF8ByuU4D8rmA05UPyKN+A5jubpE8J659G2X9MQN8i1wOE+P\nm73IgyshfNWxmHQsj9JLWtevAdwAxNj034kgXaTFNMoHdxBqXiOukXUixLK5kRP2\nl/TlktLQiHMMFNX8NrekCPs=\n-----END PRIVATE KEY-----\n",
//   "client_email": "mygcs-891@gen-lang-client-0475403800.iam.gserviceaccount.com",
//   "client_id": "110360959940102717094",
//   "auth_uri": "https://accounts.google.com/o/oauth2/auth",
//   "token_uri": "https://oauth2.googleapis.com/token",
//   "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
//   "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/mygcs-891%40gen-lang-client-0475403800.iam.gserviceaccount.com",
//   "universe_domain": "googleapis.com"
// }