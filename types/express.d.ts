
import { Multer } from 'multer';

declare global {
  namespace Express {
    export interface Request {
      file?: Multer.File;
    }
  }
}


import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any; 
    }
  }
}


declare global {
  namespace Express {
    export interface Request {
      file?: Multer.File;
      files?: Multer.File[];
    }
  }
}


import { User } from "@prisma/client"; // or your user type

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        // add other properties if needed
      };
    }
  }
}