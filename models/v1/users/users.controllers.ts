import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


import { getImageUrl } from "../../../utils/base_utl";
import {
  generateOTP,
  otpVerificationEmail,
  recentOtp,
  sendForgotPasswordOTP,
} from "../../../utils/emailService.utils";

import {
  deleteImageIfNeeded,
  downloadAndSaveImage,
} from "../../../config/multer.config";

const prisma = new PrismaClient();

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, license } = req.body;

    const missingField = ["name", "email", "password", "license"].find(
      (field) => !req.body[field]
    );

    if (missingField) {
      res.status(400).json({
        message: `${missingField} is required!`,
      });
      return;
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const hashedPassword = await bcrypt.hash(password, 8);

    const UcodeUpsert = await prisma.ucode.upsert({
      where: { email },
      update: {
        name,
        license,
        password: hashedPassword,
        otp,
        expiration: otpExpiry,
      },
      create: {
        name,
        email,
        license,
        password: hashedPassword,
        otp,
        expiration: otpExpiry,
      },
    });

    otpVerificationEmail(email, otp);

    res.status(200).json({
      success: true,
      message: "Verification OTP sent to your email",
      email: UcodeUpsert.email,
    });
  } catch (error) {
    console.error("Error in createUser:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const verifyOtpAndCreateUser = async (req: Request, res: Response) => {
  try {
    const { otp, email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Ucode ID is required",
      });
      return;
    }

    const unverifiedUser = await prisma.ucode.findUnique({
      where: { email },
    });

    if (!unverifiedUser) {
      res.status(400).json({
        success: false,
        message: "Invalid registration request",
      });
      return;
    }

    if (new Date() > unverifiedUser.expiration!) {
      res.status(400).json({
        success: false,
        message: "OTP expired. New OTP sent",
        shouldResendOtp: true,
        ucodeId: unverifiedUser.id,
      });
      return;
    }

    if (unverifiedUser.otp !== otp) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
      return;
    }

    // Check if email already exists in users table
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email already registered",
      });
      return;
    }

    const [verifiedUser] = await prisma.$transaction([
      prisma.user.create({
        data: {
          name: unverifiedUser.name,
          email: unverifiedUser.email,
          password: unverifiedUser.password,
          license: unverifiedUser.license,
        },
      }),

      prisma.ucode.delete({
        where: { email },
      }),
    ]);

    const token = jwt.sign(
      {
        userId: verifiedUser.id,
        email: verifiedUser.email,
        createdAt: verifiedUser.createdAt,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "100d" }
    );

    const response = {
      success: true,
      message: "User verified successfully",
      token,
      user: {
        id: verifiedUser.id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        license: verifiedUser.license,
        premium: verifiedUser.premium,
        role: verifiedUser.role,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const resendCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email  are required",
      });
    }
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const uCode = await prisma.ucode.findUnique({
      where: { email },
    });

    const newUcode = await prisma.ucode.update({
      where: { email },
      data: {
        email: uCode.email,
        name: uCode.name,
        password: uCode.password,
        license: uCode.license,
        otp: otp,
        expiration: otpExpiry,
      },
    });
    sendForgotPasswordOTP(email, otp);

    res.status(200).json({
      success: true,
      message: "OTP send successfully",
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  console.log(req.body);
  try {
    const { email, password } = req.body;
    const missingField = ["email", "password"].find(
      (field) => !req.body[field]
    );

    if (missingField) {
      res.status(400).json({
        message: `${missingField} is required!`,
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    console.log(user);
    if (!user) {
      res.status(404).json({
        message: "User not found",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid password" });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "100d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ? getImageUrl(`/${user.image}`) : null,
        role: user.role,
        license: user.license,
        premium: user.premium,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const { userId } = req.user;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res
        .status(400)
        .json({ message: "Both old and new passwords are required!" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ message: "password not found" });
      return;
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      res.status(401).json({ message: "Old password is incorrect" });
      return;
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 8);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, userEnteredOtp } = req.body;

    if (!email || !userEnteredOtp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }
    const userCode = await prisma.ucode.findUnique({
      where: { email },
    });

    if (!userCode) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (!userCode.otp || !userCode.expiration) {
      res.status(400).json({
        success: false,
        message: "No OTP found for this user",
      });
    }

    if (new Date() > new Date(userCode.expiration)) {
      res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (userCode.otp !== userEnteredOtp) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }
    const newUser = await prisma.user.create({
      data: {
        email: userCode.email,
        name: userCode.name || null,
        password: userCode.password,
      },
    });

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, newUser },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    await prisma.ucode.delete({
      where: { email },
    });

    res.status(200).json({
      success: true,
      message: "OTP verified and user created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      token,
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const user = await prisma.ucode.upsert({
      where: { email },
      update: {
        otp,
        expiration: otpExpiry,
      },
      create: {
        email,
        otp,
        expiration: otpExpiry,
        name: "",
        password: "",
      },
    });

    sendForgotPasswordOTP(email, otp);

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully",
      otpExpiry: otpExpiry.toISOString(),
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const verifyOtpAndResetPassword = async (
  req: Request,
  res: Response
) => {
  const { email, otp } = req.body;

  try {
    const user = await prisma.ucode.findUnique({ where: { email } });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.otp !== otp) {
      res.status(400).json({ message: "Invalid OTP" });
      return;
    }

    if (new Date() > user.expiration) {
      res.status(400).json({ message: "OTP has expired" });
      return;
    }

    await prisma.ucode.update({
      where: { email },
      data: {
        permissionToChangePassword: true,
      },
    });

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

export const resentOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    const user = await prisma.ucode.findUnique({ where: { email } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found. Please start the process again.",
      });
      return;
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.ucode.update({
      where: { email },
      data: {
        otp,
        expiration: otpExpiry,
      },
    });

    recentOtp(email, otp);

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      otpExpiry: otpExpiry.toISOString(),
    });
  } catch (error) {
    console.error("Error in resentOtp:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;

  try {
    const user = await prisma.ucode.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.permissionToChangePassword) {
      res
        .status(403)
        .json({ message: "You do not have permission to change the password" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });

    // await prisma.ucode.update({
    //   where: { email },
    //   data: {
    //     password: hashedPassword,
    //     permissionToChangePassword: false,
    //   },
    // });

    await prisma.ucode.delete({
      where: { email },
    });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error changing password" });
  }
};

// const downloadAndSaveImage = async (imageUrl: string): Promise<string> => {
//   try {
//     // Clean up malformed URLs (remove storage.googleapis.com prefix if present)
//     const cleanUrl = imageUrl.includes('storage.googleapis.com/') 
//       ? imageUrl.split('storage.googleapis.com/')[1]
//       : imageUrl;

//     const response = await fetch(cleanUrl);
//     if (!response.ok) throw new Error("Failed to download image");

//     const buffer = await response.arrayBuffer();
//     const filename = `${uuidv4()}.jpg`;
    
//     // Initialize Google Cloud Storage with absolute path to credentials
//     const storage = new Storage({
//       keyFilename: path.resolve(__dirname, "../../../config/gcs-key.json"),
//       projectId: process.env.GCLOUD_PROJECT
//     });
    
//     const bucket = storage.bucket(process.env.GCS_BUCKET);
//     const file = bucket.file(filename);
    
//     // Upload buffer to Google Cloud Storage
//     await file.save(Buffer.from(buffer), {
//       metadata: {
//         contentType: 'image/jpeg'
//       }
//     });

//     return filename;
//   } catch (error) {
//     console.error("Error saving image to Google Cloud Storage:", error);
//     throw new Error("Failed to save image to cloud storage");
//   }
// };

export const googleLogin = async (req: Request, res: Response) => {
  console.log("Google Auth route hit");
  try {
    const { name, email, image } = req.body;

    if (!name || !email || !image) {
      res.status(400).json({
        success: false,
        message: "Something went wrong! Please try again",
      });
      return;
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    // if (!user) {
    //   res.status(400).json({
    //     success: false,
    //     message: "lab nai! shakin vai durbol",
    //   });
    //   return;
    // }

    if (!user) {
      const savedImagePath = await downloadAndSaveImage(image);

      user = await prisma.user.create({
        data: {
          name,
          email,
          image: savedImagePath,
        },
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      process.env.JWT_SECRET,
      { expiresIn: "360d" }
    );

    res.status(200).json({
      success: true,
      message: "User authenticated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ? getImageUrl(`/${user.image}`) : null,
        role: user.role,
        license: user.license,
        premium: user.premium,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const facebookLogin = async (req: Request, res: Response) => {
  try {
    const { name, email, image } = req.body;

    if (!name || !email || !image) {
      res.status(400).json({
        success: false,
        message: "Something went wrong! Please try again",
      });
      return;
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const savedImagePath = await downloadAndSaveImage(image);
      user = await prisma.user.create({
        data: {
          name,
          email,
          image: savedImagePath,
        },
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      process.env.JWT_SECRET,
      { expiresIn: "360d" }
    );

    res.status(200).json({
      success: true,
      message: "User authenticated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ? getImageUrl(`/${user.image}`) : null,
        premium: user.premium,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

// const deleteImageIfNeeded = (
//   newImage: Express.Multer.File | { filename: string } | undefined
// ) => {
//   if (newImage && newImage.filename) {
//     const imagePath = path.join(
//       __dirname,
//       "../../../uploads",
//       newImage.filename
//     );
//     if (fs.existsSync(imagePath)) {
//       fs.unlinkSync(imagePath);
//     }
//   }
// };

export const updateUser = async (req: any, res: Response) => {
  console.log(req.body)
  const userId = req.user?.userId;
  const { name, license, oldPassword, newPassword } = req.body;
  const newImage = req.file;

  if (!userId) {
    deleteImageIfNeeded(newImage);
    res.status(400).json({
      success: false,
      message: "User authentication required",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      deleteImageIfNeeded(newImage);
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Handle password change if requested
    let passwordUpdated = false;
    if (oldPassword || newPassword) {
      if (!oldPassword || !newPassword) {
        deleteImageIfNeeded(newImage);
        res.status(400).json({
          success: false,
          message: "Both old and new passwords are required",
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        deleteImageIfNeeded(newImage);
        res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
        return;
      }

      passwordUpdated = true;
    }

    // Handle profile updates
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (license !== undefined) updateData.license = license;

    if (newImage) {
      if (user.image) {
        deleteImageIfNeeded({ filename: user.image });
      }
      updateData.image = newImage.filename;
    }

    // If password is being updated, add it to updateData
    if (passwordUpdated) {
      updateData.password = await bcrypt.hash(newPassword, 8);
    }

    if (Object.keys(updateData).length === 0) {
      deleteImageIfNeeded(newImage);
      res.status(400).json({
        success: false,
        message: "No update data provided",
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image ? getImageUrl(`/${updatedUser.image}`) : null,
        premium: updatedUser.premium,
        license: updatedUser.license,
      },
    });
  } catch (error) {
    console.error("Update error:", error);
    deleteImageIfNeeded(newImage);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const userInfo = async (req: any, res: Response) => {
 
  try {
    const userId = req.user?.userId;
    console.log(userId)
    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        license: true,
        premium: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const imageUrl = user.image ? getImageUrl(`/${user.image}`) : null;
    res.status(200).json({
      success: true,
      message: "User information retrieved successfully",
      user: {
        ...user,
        image: imageUrl,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteUser = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.image) {
      await deleteImageIfNeeded({ filename: user.image });
    }

    await prisma.user.delete({
      where: { id: userId },
    });
    res.status(200).json({
      success: true,
      message: "successfully deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const sendChangeEmailOtp = async (req: any, res: Response) => {
  const { email } = req.body;
  const { userId } = req.user;

  if (!email) {
    res.status(400).json({ message: "new email are required." });
    return;
  }

  try {
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const uCode = await prisma.ucode.upsert({
      where: { email: email },
      update: {
        otp,
        expiration: otpExpiry,
      },
      create: {
        email: email,
        name: "",
        password: "",
        otp,
        expiration: otpExpiry,
      },
    });

    // Send OTP to the new email
    sendForgotPasswordOTP(email, otp);

    res.status(200).json({
      success: true,
      message: "OTP sent to new email for verification.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

export const verifyChangeEmail = async (req: any, res: Response) => {
  const { otp, email } = req.body;
  const { userId } = req.user;

  if (!otp || !email) {
    res
      .status(400)
      .json({ message: "User ID, OTP, and new email are required." });
    return;
  }

  try {
    const uCode = await prisma.ucode.findUnique({
      where: { email: email },
    });

    if (!uCode) {
      res
        .status(404)
        .json({ message: "No verification record found for this email." });
      return;
    }

    if (new Date() > uCode.expiration!) {
      res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP.",
      });
      return;
    }

    if (uCode.otp !== otp) {
      res.status(400).json({ success: false, message: "Invalid OTP." });
      return;
    }
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { email: email },
    });

    await prisma.ucode.delete({ where: { email: email } });

    res.status(200).json({
      success: true,
      message: "Email updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image
          ? getImageUrl(`/${updatedUser.image}`)
          : updatedUser.image,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
};



export const getalluser = async (req: any, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
};