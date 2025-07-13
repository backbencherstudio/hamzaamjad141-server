"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.instructorConformations = exports.verifyOTP = exports.sendForgotPasswordOTP = exports.sendEmail = exports.generateOTP = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
const email_message_1 = require("./email_message");
dotenv_1.default.config();
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};
exports.generateOTP = generateOTP;
const sendEmail = async (to, subject, htmlContent) => {
    const mailTransporter = nodemailer_1.default.createTransport({
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
exports.sendEmail = sendEmail;
const sendForgotPasswordOTP = async (email, otp) => {
    const htmlContent = (0, email_message_1.emailForgotPasswordOTP)(email, otp);
    await (0, exports.sendEmail)(email, "OTP Code for Password Reset", htmlContent);
};
exports.sendForgotPasswordOTP = sendForgotPasswordOTP;
const verifyOTP = (email, userOTP) => {
    const htmlContent = (0, email_message_1.emailForgotPasswordOTP)(email, userOTP);
    (0, exports.sendEmail)(email, "OTP Code for Password Reset", htmlContent);
};
exports.verifyOTP = verifyOTP;
const instructorConformations = async (instructorEmail, studentName, logDetails) => {
    console.log(instructorEmail);
    console.log(studentName);
    const htmlContent = (0, email_message_1.instructorConformationsTamplate)(instructorEmail, studentName, logDetails);
    console.log(instructorEmail);
    await (0, exports.sendEmail)(instructorEmail, `New Flight Log Submission from ${studentName}`, htmlContent);
};
exports.instructorConformations = instructorConformations;
//# sourceMappingURL=emailService.utils.js.map