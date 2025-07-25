import nodemailer from "nodemailer";

import dotenv from "dotenv";
import {
  emailForgotPasswordOTP,
  instructorConformationsTamplate,
  otpVerificationEmailTamplate,
  recentOtpVerificationEmail,
} from "./email_message";

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
    from: `"LEFT SEAT LESSONS" <nasir@gmail.com>`,
    to,
    subject,
    html: htmlContent,
  };

  await mailTransporter.sendMail(mailOptions);
};

//register 
export const otpVerificationEmail = async (
  email: string,
  otp: string
): Promise<void> => {

  const htmlContent = otpVerificationEmailTamplate(otp);
  await sendEmail(email, "OTP Verification Email", htmlContent);
};

//foirgot password
export const sendForgotPasswordOTP = async (
  email: string,
  otp: string
): Promise<void> => {
  const htmlContent = emailForgotPasswordOTP(otp);
  await sendEmail(email, "OTP for forgot Password", htmlContent);
};



//recent otp
export const recentOtp = async (
  email: string,
  otp: string
): Promise<void> => {
  const htmlContent = recentOtpVerificationEmail(otp);
  await sendEmail(email, "OTP for forgot Password", htmlContent);
};











export const verifyOTP = (email: string, userOTP: string) => {
  const htmlContent = emailForgotPasswordOTP(userOTP);
  sendEmail(email, "OTP Code for Password Reset", htmlContent);
};




export const instructorConformations = async (
  instructorEmail: string,
  studentName: string,
  logDetails: any
): Promise<void> => {
  try {    
    console.log(`Sending flight log notification to instructor: ${instructorEmail}`);
    const htmlContent = instructorConformationsTamplate(
      instructorEmail,
      studentName,
      logDetails,
    );
    
    await sendEmail(
      instructorEmail,
      `New Flight Log Submission from ${studentName}`,
      htmlContent
    );
    
    console.log(`Email notification successfully sent to ${instructorEmail}`);
  } catch (error) {
    console.error(`Failed to send instructor confirmation email to ${instructorEmail}:`, error);
    throw new Error(`Failed to send instructor confirmation: ${error.message}`);
  }
};

 
