import nodemailer from "nodemailer";

import dotenv from "dotenv";
import { emailForgotPasswordOTP } from "./email_message";
import crypto from 'crypto';

dotenv.config();

export const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  const mailTransporter = nodemailer.createTransport({
    service: "gmail",
    port: 587,
    auth: {
      user: process.env.NODE_MAILER_USER,
      pass: process.env.NODE_MAILER_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Nasir" <nasir@gmail.com>`,
    to,
    subject,
    html: htmlContent,
  };

  await mailTransporter.sendMail(mailOptions);
};
console.log(sendEmail)

export const sendForgotPasswordOTP = async (email: string, otp: string): Promise<void> => {
  //console.log(1111111111111, email, otp)
  const htmlContent = emailForgotPasswordOTP(email, otp);
  
  await sendEmail(email, "OTP Code for Password Reset", htmlContent);
}

const otpStorage = new Map<string, { otp: string, expiresAt: Date }>();

export const sendOTP = (email: string): boolean => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  otpStorage.set(email, { otp, expiresAt });
  console.log(`OTP for ${email}: ${otp}`); 
  return true;
};

export const verifyOTP = (email: string, userOTP: string): boolean => {
  console.log("Verifying OTP for email:", email, "with userOTP:", userOTP);
  const storedData = otpStorage.get(email);
  
  if (!storedData) return false;
  
  // Check if OTP expired
  if (new Date() > storedData.expiresAt) {
    otpStorage.delete(email);
    return false;
  }
  
  // Verify OTP
  if (storedData.otp !== userOTP) return false;
  
  // OTP is valid - remove it from storage
  otpStorage.delete(email);
  const htmlContent = emailForgotPasswordOTP(email, userOTP);
  
   sendEmail(email, "OTP Code for Password Reset", htmlContent);
};

