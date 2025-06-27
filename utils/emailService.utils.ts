import nodemailer from "nodemailer";

import dotenv from "dotenv";
import { emailForgotPasswordOTP } from "./email_message";

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


export const sendForgotPasswordOTP = async (email: string, otp: string): Promise<void> => {
  const htmlContent = emailForgotPasswordOTP(email, otp);
  await sendEmail(email, "OTP Code for Password Reset", htmlContent);
}


export const verifyOTP = (email: string, userOTP: string) => {
  const htmlContent = emailForgotPasswordOTP(email, userOTP);
   sendEmail(email, "OTP Code for Password Reset", htmlContent);
};

