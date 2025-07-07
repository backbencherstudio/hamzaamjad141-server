import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { baseUrl, getImageUrl } from "../../../utils/base_utl";
import {
  generateOTP,
  sendForgotPasswordOTP,
} from "../../../utils/emailService.utils";
import { v4 as uuidv4 } from "uuid";
import { create } from "domain";

const prisma = new PrismaClient();

const tempUserStore = new Map<string, any>();

export const createUser = async (req: Request, res: Response) => {
  console.log("Create User request body:", req.body);
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

    // const existingUser = await prisma.ucode.findUnique({ where: { email } });

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

    sendForgotPasswordOTP(email, otp);

    res.status(200).json({
      success: true,
      message: "Verification OTP sent to your email",
      userId: UcodeUpsert.email,
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
      { userId: verifiedUser.id, email: verifiedUser.email },
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
  console.log("Verify OTP request body:", req.body);
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
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "100d" }
    );

    console.log("Token expires at:", token);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ? getImageUrl(`/uploads/${user.image}`) : null,
        role: user.role,
        license: user.license,
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
    console.log("User found for password change:", user);

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

export const sendOtp = async (req: Request, res: Response) => {
  console.log("Send OTP request body:", req.body);
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
      return;
    }
    const existingUser = await prisma.ucode.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }
    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.ucode.create({
      data: {
        name,
        email,
        password: hashedPassword,
        otp: otp,
        expiration: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    sendForgotPasswordOTP(email, otp);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "100d" }
    );

    res.status(201).json({
      success: true,
      message: "OTP sent successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error in sendOtp:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  console.log("Verify OTP request body:", req.body);
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
      { userId: newUser.id, email: newUser.email },
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
    
    console.log(user)
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

    sendForgotPasswordOTP(email, otp);

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

const downloadAndSaveImage = async (imageUrl: string): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to download image");

    const buffer = await response.arrayBuffer();
    const filename = `${uuidv4()}.jpg`;
    const uploadDir = path.join(__dirname, "../../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, Buffer.from(buffer));

    return filename;
  } catch (error) {
    console.error("Error saving image:", error);
    return imageUrl;
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  console.log("Google Auth route hit");
  try {
    const { name, email, image } = req.body;
    console.log("Google Auth request body:", req.body);

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
      res.status(400).json({
        success: false,
        message: "lab nai! shakin vai durbol",
      });
      return;
    }

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
      { userId: user.id, email: user.email, role: user.role },
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
        image: user.image ? getImageUrl(`/uploads/${user.image}`) : null,
        role: user.role,
        license: user.license,
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
  console.log("Facebook Auth route hit", req.body);
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
      { userId: user.id, email: user.email, role: user.role },
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
        image: user.image ? getImageUrl(`/uploads/${user.image}`) : null,
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

export const updateImage = async (req: any, res: Response) => {
  console.log("iamge", req.body);
  try {
    const id = req.user?.userId;
    const newImage = req.file;

    if (!newImage) {
      res.status(400).json({ message: "No image uploaded" });
      return;
    }
    const existingUser = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!existingUser) {
      fs.unlinkSync(path.join(__dirname, "../../uploads", newImage.filename));
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (existingUser.image) {
      const oldImagePath = path.join(
        __dirname,
        "../../uploads",
        existingUser.image
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    const user = await prisma.user.update({
      where: { id: id },
      data: {
        image: newImage.filename,
      },
    });

    const imageUrl = `http://localhost:3000/uploads/${user.image}`;

    res.status(200).json({
      success: true,
      message: "Image updated successfully",
      data: { ...user, imageUrl },
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, "../../uploads", req.file.filename));
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
export const updateAdmin = async (req: any, res: Response) => {
  console.log(req.body);
  try {
    const id = req.user?.userId;
    const { name, oldPassword, newPassword, confirmPassword } = req.body;
    const existingUser = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!existingUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      existingUser.password
    );
    if (!isOldPasswordValid) {
      res.status(400).json({ message: "Old password is incorrect" });
      return;
    }
    if (newPassword !== confirmPassword) {
      res
        .status(400)
        .json({ message: "New password and confirm password do not match" });
      return;
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { id: id },
      data: {
        name: name || existingUser.name,
        password: hashedPassword,
      },
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateUser = async (req: any, res: Response) => {
  try {
    const id = req.user?.userId;
    const { name, email, license, password } = req.body;
    const newImage = req.file;

    const existingUser = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!existingUser) {
      if (newImage) {
        fs.unlinkSync(path.join(__dirname, "../../uploads", newImage.filename));
      }
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isEmailChanging = email && email !== existingUser.email;
    const isPasswordChanging =
      password && !(await bcrypt.compare(password, existingUser.password));

    if (isEmailChanging || isPasswordChanging) {
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
      let hashedPassword = existingUser.password;

      if (isPasswordChanging) {
        hashedPassword = await bcrypt.hash(password, 8);
      }

      await prisma.ucode.upsert({
        where: { email: isEmailChanging ? email : existingUser.email },
        update: {
          otp,
          expiration: otpExpiry,
          name: name || existingUser.name,
          password: hashedPassword,
          license: license || existingUser.license,
        },
        create: {
          email: isEmailChanging ? email : existingUser.email,
          otp,
          expiration: otpExpiry,
          name: name || existingUser.name,
          password: hashedPassword,
          license: license || existingUser.license,
        },
      });

      sendForgotPasswordOTP(isEmailChanging ? email : existingUser.email, otp);

      if (newImage) {
        const tempImagePath = path.join(
          __dirname,
          "../../uploads",
          newImage.filename
        );
        if (fs.existsSync(tempImagePath)) {
          fs.unlinkSync(tempImagePath);
        }
      }

      res.status(200).json({
        success: true,
        message: "Verification OTP sent to your email",
        requiresEmailVerification: true,
      });
      return;
    } else {
      // Normal update (no email or password change)
      if (newImage && existingUser.image) {
        const oldImagePath = path.join(
          __dirname,
          "../../uploads",
          existingUser.image
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      const user = await prisma.user.update({
        where: { id: id },
        data: {
          name: name || existingUser.name,
          image: newImage ? newImage.filename : existingUser.image,
          email: existingUser.email,
          license: license || existingUser.license,
        },
      });

      const imageUrl = user.image
        ? getImageUrl(`/uploads/${user.image}`)
        : null;

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: imageUrl,
        },
      });
    }
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, "../../uploads", req.file.filename));
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const verifyEmailUpdate = async (req: any, res: Response) => {
  try {
    const { email, otp } = req.body;

    const ucodeRecord = await prisma.ucode.findUnique({
      where: { email },
    });
    console.log(ucodeRecord);

    if (!ucodeRecord) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired verification request",
      });
      return;
    }

    if (new Date() > new Date(ucodeRecord.expiration)) {
      res.status(400).json({
        success: false,
        message: "OTP expired",
      });
      return;
    }

    if (ucodeRecord.otp !== otp) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: ucodeRecord.email },
    });

    console.log("Update User route hit");
    console.log("Update User request body:", req.body);

    // Update the user with new email and other info from ucode
    const user = await prisma.user.update({
      where: {
        id: existingUser.id, // Use userId from the request object
      },
      data: {
        email: ucodeRecord.email || existingUser.email,
        name: ucodeRecord.name || existingUser.name,
        password: ucodeRecord.password || existingUser.password,
        license: ucodeRecord.license || existingUser.license,
      },
    });

    await prisma.ucode.delete({
      where: { email },
    });

    res.status(200).json({
      success: true,
      message: "Email updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        license: user.license,
      },
    });
  } catch (error) {
    console.error("verifyEmailUpdate error:", error);
    res.status(500).json({
      success: false,
      message: "Email verification failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const userInfo = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
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
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const imageUrl = user.image ? getImageUrl(`/uploads/${user.image}`) : null;
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
      const imagePath = path.join(__dirname, "../../uploads", user.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
