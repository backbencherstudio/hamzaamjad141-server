import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { baseUrl, getImageUrl } from "../../utils/base_utl";
import {
  generateOTP,
  sendForgotPasswordOTP,
  sendOTP,
} from "../../utils/emailService.utils";
import { v4 as uuidv4 } from "uuid"; // Make sure this import is present

import cookieParser from "cookie-parser";

const prisma = new PrismaClient();

const tempUserStore = new Map<string, any>();

export const createUser = async (req: Request, res: Response) => {
  console.log("Create user request body:", req.body);

  try {
    const { name, email, license, password, confirmPassword } = req.body;
    const image = req.file;

    // ... (keep all your existing validation code)

    // Generate OTP and session ID
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const sessionId = uuidv4(); // Generate unique session ID

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store temporary user data with session ID
    const tempUser = {
      name,
      email,
      license,
      password: hashedPassword,
      image: image ? image.filename : null,
      otp,
      otpExpiry,
    };

    tempUserStore.set(sessionId, tempUser);

    // Send OTP to user's email
    await sendForgotPasswordOTP(email, otp);

    // Set session ID in cookie or return it in response
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      sameSite: 'lax', // Adjust based on your needs
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000 // 15 minutes (matches OTP expiry)
    });

    res.status(200).json({
      success: true,
      message: "Verification OTP sent to your email",
      nextStep: "verify-otp",
      sessionId
      // Optionally include sessionId if not using cookies
      // sessionId: sessionId 
    });
  } catch (error) {
    // ... (keep your existing error handling)
  }
};
export const verifyOtpAndCreateUser = async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;

    // Get the session ID from cookies or headers
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    console.log("Session ID from request:", sessionId);
    
    if (!sessionId) {
       res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // Retrieve temporary user data using session ID
    const tempUser = tempUserStore.get(sessionId);
    console.log("Session ID:", sessionId);
    console.log("Temporary user data:", tempUser);

    if (!tempUser) {
       res.status(400).json({
        success: false,
        message: "Session expired or invalid",
      });
    }

    // Check if OTP is expired
    if (new Date(tempUser.otpExpiry) < new Date()) {
      // Generate new OTP
      const newOtp = generateOTP();
      const newOtpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

      // Update temp user with new OTP
      tempUserStore.set(sessionId, {
        ...tempUser,
        otp: newOtp,
        otpExpiry: newOtpExpiry,
      });

      // Send new OTP to user's email
      sendForgotPasswordOTP(tempUser.email, newOtp);

       res.status(400).json({
        success: false,
        message: "OTP expired. A new OTP has been sent to your email",
        shouldResendOtp: true,
      });
    }

    // Check if OTP matches
    if (tempUser.otp !== otp) {
       res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Create the user in database
    const user = await prisma.user.create({
      data: {
        name: tempUser.name,
        email: tempUser.email, // Email comes from session storage
        license: tempUser.license,
        password: tempUser.password,
        image: tempUser.image,
        isVerified: true,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "100d" }
    );

    // Get image URL if exists
    const imageUrl = user.image ? getImageUrl(`/uploads/${user.image}`) : null;

    // Clean up temporary data
    tempUserStore.delete(sessionId);

    // Clear session cookie if using cookies
    res.clearCookie('sessionId');

    res.status(201).json({
      success: true,
      message: "User created and verified successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        license: user.license,
        image: imageUrl,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Something went wrong during verification",
      error: error.message || error.stack,
    });
  }
};
export const loginUser = async (req: Request, res: Response) => {
  console.log("Login request body:", req.body);
  try {
    const { email, password } = req.body;
    const missingField = ["email", "password"].find(
      (field) => !req.body[field]
    );

    if (missingField) {
      res.status(400).json({
        message: `${missingField} is required!`,
      });
      return; // This stops further execution
    }
    //console.log("Email:", email);
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    console.log("User found:", user);
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
      { id: user.id, email: user.email, role: user.role },
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
        image: user.image ? `${baseUrl}/uploads/${user.image}` : null,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

// export const updateAdmin = async (req: any, res: Response) => {
//   try {
//     const { id } = req.user;
//     const { name,email } = req.body;
//     const newImage = req.file;

//     // Retrieve the existing user from the database
//     const existingUser = await prisma.user.findUnique({
//       where: { id: parseInt(id, 10) }, // Use `id` from the authenticated user
//     });

//     // If the user doesn't exist, handle the error and delete any uploaded file
//     if (!existingUser) {
//       if (newImage) {
//         fs.unlinkSync(path.join(__dirname, "../../uploads", newImage.filename));
//       }
//       res.status(404).json({
//         message: "User not found",
//       });
//       return;
//     }

//     // Handle file replacement: delete old image if a new one is uploaded
//     if (newImage && existingUser.image) {
//       const oldImagePath = path.join(
//         __dirname,
//         "../../uploads",
//         existingUser.image
//       );
//       if (fs.existsSync(oldImagePath)) {
//         fs.unlinkSync(oldImagePath);
//       }
//     }

//     const user = await prisma.user.update({
//       where: { id: parseInt(id, 10) },
//       data: {
//         name: name || existingUser.name,
//         image: newImage ? newImage.filename : existingUser.image,
//         email: email|| existingUser.email, // Keep the existing email
//       },
//     });

//     const imageUrl = user.image ? getImageUrl(`/uploads/${user.image}`) : null;

//     res.status(200).json({
//       success: true,
//       message: "User updated successfully",
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         image: imageUrl,
//       },
//     });
//   } catch (error) {
//     if (req.file) {
//       fs.unlinkSync(path.join(__dirname, "../../uploads", req.file.filename));
//     }

//     res.status(500).json({
//       success: false,
//       message: "Something went wrong",
//       error,
//     });
//   }
// };


export const changePassword = async (req: any, res: Response) => {
  console.log("Change password request body:", req.body);
  try {
    const { id } = req.user;
    const { oldPassword, newPassword } = req.body;
    console.log("User ID:", id);

    if (!oldPassword || !newPassword) {
      res
        .status(400)
        .json({ message: "Both old and new passwords are required!" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
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

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: parseInt(id, 10) },
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

    // Validate request body
    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.ucode.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Generate OTP and hash password
    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with OTP
    const user = await prisma.ucode.create({
      data: {
        name,
        email,
        password: hashedPassword,
        otp: otp,
        expiration: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
      },
    });

    // Send OTP email (make sure this is async/await)
    sendForgotPasswordOTP(email, otp);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
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

interface VerifyOtpRequest {
  email: string;
  userEnteredOtp: string;
}

export const verifyOtp = async (req: Request, res: Response) => {
  console.log("Verify OTP request body:", req.body);
  try {
    const { email, userEnteredOtp }: VerifyOtpRequest = req.body;

    // Validate input
    if (!email || !userEnteredOtp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Find user by email
    const userCode = await prisma.ucode.findUnique({
      where: { email },
    });

    if (!userCode) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if OTP exists and hasn't expired
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

    // Verify OTP match (case-sensitive comparison)
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
        password: userCode.password, // Copy password from ucode
        isVerified: true,
      },
    });

    // Generate JWT token for the new user
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    // Delete the record from ucode table
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
  console.log("Forgot Password request body:", req.body);
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check for existing OTP record
    const existingRecord = await prisma.ucode.findUnique({
      where: { email },
    });

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Case 1: No existing record - create new
    if (!existingRecord) {
      const newRecord = await prisma.ucode.create({
        data: {
          email,
          otp,
          expiration: otpExpiry,
          name: "", // Default values
          password: "",
        },
      });

      await sendForgotPasswordOTP(email, otp);

      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        otpExpiry: otpExpiry.toISOString(),
      });
    }

    // Case 2: Existing OTP not expired - don't resend
    if (
      existingRecord.expiration &&
      new Date(existingRecord.expiration) > new Date()
    ) {
      res.status(400).json({
        success: false,
        message: "OTP already sent. Please wait before requesting a new one.",
        otpExpiry: existingRecord.expiration.toISOString(),
      });
    }

    // Case 3: Existing OTP expired - update and resend
    await prisma.ucode.update({
      where: { email },
      data: {
        otp,
        expiration: otpExpiry,
      },
    });

    await sendForgotPasswordOTP(email, otp);

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
  // console.log("Verify OTP and reset password request body:", req.body);
  const { email, otp, newPassword, confirmPassword } = req.body;

  try {
    // 1. Validate passwords match
    if (newPassword !== confirmPassword) {
      res.status(400).json({ message: "Passwords do not match" });
    }

    // 2. Find user
    const user = await prisma.ucode.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
    }
    console.log("User found for password reset:", user);

    // 3. Check OTP exists and is valid
    if (!user.otp || !user.expiration) {
      res.status(400).json({ message: "No OTP requested" });
    }

    // 4. Check OTP not expired
    if (new Date() > user.expiration) {
      res.status(400).json({ message: "OTP expired" });
    }

    // 5. Verify OTP matches
    if (user.otp !== otp) {
      res.status(400).json({ message: "Invalid OTP" });
    }

    // 6. Hash new password (using bcrypt)
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    console.log("User found for password reset:", existingUser);

    // 7. Update password and clear OTP
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password" });
  }
};

const downloadAndSaveImage = async (imageUrl: string): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to download image");

    const buffer = await response.arrayBuffer();
    const filename = `${uuidv4()}.jpg`;
    const uploadDir = path.join(__dirname, "../../uploads");

    // Ensure uploads directory exists
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

    // const userData = transformUserResponse(user);

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

export const facebookLogin = async (req: Request, res: Response) => {
  console.log("Facebook Auth route hit",req.body);
  try {
    const { name, email, image,authProvider  } = req.body;

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
          authProvider ,
          image: savedImagePath,
          isVerified: true, // Assuming new users are verified
        },
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "360d" }
    );

    // const userData = transformUserResponse(user);

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

export const updateAdmin = async (req: any, res: Response) => {
  console.log("Update Admin route hit",req.body);
  try {
    console.log("Update Admin request body:", req.body); 
    const { id } = req.user;
    const { name, email } = req.body;
    const newImage = req.file;

    // Retrieve the existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!existingUser) {
      if (newImage) {
        fs.unlinkSync(path.join(__dirname, "../../uploads", newImage.filename));
      }
       res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed
    const isEmailChanging = email && email !== existingUser.email;

    if (isEmailChanging) {
      // Generate verification token and OTP
      const verificationToken = uuidv4();
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

      // Store verification data temporarily
      tempUserStore.set(verificationToken, {
        userId: existingUser.id,
        newEmail: email,
        otp,
        otpExpiry,
        currentData: {
          name: name || existingUser.name,
          image: newImage ? newImage.filename : existingUser.image
        }
      });

      // Send verification email
      await sendForgotPasswordOTP(email, otp);

      // Handle image if uploaded during this attempt
      if (newImage) {
        const tempImagePath = path.join(__dirname, "../../uploads", newImage.filename);
        if (fs.existsSync(tempImagePath)) {
          fs.unlinkSync(tempImagePath);
        }
      }

       res.status(200).json({
        success: true,
        message: "Verification OTP sent to your new email",
        verificationToken,
        requiresEmailVerification: true
      });
    }
    else{
      // Proceed with normal update if email isn't changing
    if (newImage && existingUser.image) {
      const oldImagePath = path.join(__dirname, "../../uploads", existingUser.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id, 10) },
      data: {
        name: name || existingUser.name,
        image: newImage ? newImage.filename : existingUser.image,
        email: existingUser.email, // Email remains unchanged
      },
    });

    const imageUrl = user.image ? getImageUrl(`/uploads/${user.image}`) : null;

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

export const verifyEmailUpdate = async (req: Request, res: Response) => {
  try {
    const { verificationToken, otp } = req.body;

    // Retrieve temporary data
    const verificationData = tempUserStore.get(verificationToken);
    if (!verificationData) {
       res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    // Check OTP expiry
    if (new Date(verificationData.otpExpiry) < new Date()) {
       res.status(400).json({
        success: false,
        message: "OTP expired"
      });
    }

    // Verify OTP
    if (verificationData.otp !== otp) {
       res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // Update user with new email
    const user = await prisma.user.update({
      where: { id: verificationData.userId },
      data: {
        email: verificationData.newEmail,
        name: verificationData.currentData.name,
        image: verificationData.currentData.image,
        isVerified: true
      },
    });

    // Clean up
    tempUserStore.delete(verificationToken);

    const imageUrl = user.image ? getImageUrl(`/uploads/${user.image}`) : null;

     res.status(200).json({
      success: true,
      message: "Email updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: imageUrl,
      },
    });

  } catch (error) {
     res.status(500).json({
      success: false,
      message: "Email verification failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
