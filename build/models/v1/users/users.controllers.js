"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyChangeEmail = exports.sendChangeEmailOtp = exports.deleteUser = exports.userInfo = exports.updateUser = exports.facebookLogin = exports.googleLogin = exports.resetPassword = exports.resentOtp = exports.verifyOtpAndResetPassword = exports.forgotPassword = exports.verifyOtp = exports.changePassword = exports.loginUser = exports.resendCode = exports.verifyOtpAndCreateUser = exports.createUser = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const base_utl_1 = require("../../../utils/base_utl");
const emailService_utils_1 = require("../../../utils/emailService.utils");
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
const createUser = async (req, res) => {
    try {
        const { name, email, password, license } = req.body;
        const missingField = ["name", "email", "password", "license"].find((field) => !req.body[field]);
        if (missingField) {
            res.status(400).json({
                message: `${missingField} is required!`,
            });
            return;
        }
        const otp = (0, emailService_utils_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
        const hashedPassword = await bcrypt_1.default.hash(password, 8);
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
        (0, emailService_utils_1.sendForgotPasswordOTP)(email, otp);
        res.status(200).json({
            success: true,
            message: "Verification OTP sent to your email",
            userId: UcodeUpsert.email,
        });
    }
    catch (error) {
        console.error("Error in createUser:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create user",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.createUser = createUser;
const verifyOtpAndCreateUser = async (req, res) => {
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
        if (new Date() > unverifiedUser.expiration) {
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
        const token = jsonwebtoken_1.default.sign({
            userId: verifiedUser.id,
            email: verifiedUser.email,
            createdAt: verifiedUser.createdAt,
        }, process.env.JWT_SECRET, { expiresIn: "100d" });
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Verification failed",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.verifyOtpAndCreateUser = verifyOtpAndCreateUser;
const resendCode = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email  are required",
            });
        }
        const otp = (0, emailService_utils_1.generateOTP)();
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
        (0, emailService_utils_1.sendForgotPasswordOTP)(email, otp);
        res.status(200).json({
            success: true,
            message: "OTP send successfully",
        });
    }
    catch (error) {
        console.error("Error in verifyOtp:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.resendCode = resendCode;
const loginUser = async (req, res) => {
    console.log(req.body);
    try {
        const { email, password } = req.body;
        const missingField = ["email", "password"].find((field) => !req.body[field]);
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
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: "Invalid password" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        }, process.env.JWT_SECRET, { expiresIn: "100d" });
        res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image ? (0, base_utl_1.getImageUrl)(`/uploads/${user.image}`) : null,
                role: user.role,
                license: user.license,
                premium: user.premium,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            token,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.loginUser = loginUser;
const changePassword = async (req, res) => {
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
        const isOldPasswordValid = await bcrypt_1.default.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            res.status(401).json({ message: "Old password is incorrect" });
            return;
        }
        const hashedNewPassword = await bcrypt_1.default.hash(newPassword, 8);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });
        res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
            error,
        });
    }
};
exports.changePassword = changePassword;
const verifyOtp = async (req, res) => {
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
        const token = jsonwebtoken_1.default.sign({ userId: newUser.id, email: newUser.email, newUser }, process.env.JWT_SECRET, { expiresIn: "1d" });
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
    }
    catch (error) {
        console.error("Error in verifyOtp:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.verifyOtp = verifyOtp;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required",
            });
            return;
        }
        const otp = (0, emailService_utils_1.generateOTP)();
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
        (0, emailService_utils_1.sendForgotPasswordOTP)(email, otp);
        res.status(200).json({
            success: true,
            message: "New OTP sent successfully",
            otpExpiry: otpExpiry.toISOString(),
        });
    }
    catch (error) {
        console.error("Error in forgotPassword:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.forgotPassword = forgotPassword;
const verifyOtpAndResetPassword = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: "Error verifying OTP" });
    }
};
exports.verifyOtpAndResetPassword = verifyOtpAndResetPassword;
const resentOtp = async (req, res) => {
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
        const otp = (0, emailService_utils_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await prisma.ucode.update({
            where: { email },
            data: {
                otp,
                expiration: otpExpiry,
            },
        });
        (0, emailService_utils_1.sendForgotPasswordOTP)(email, otp);
        res.status(200).json({
            success: true,
            message: "OTP resent successfully",
            otpExpiry: otpExpiry.toISOString(),
        });
    }
    catch (error) {
        console.error("Error in resentOtp:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.resentOtp = resentOtp;
const resetPassword = async (req, res) => {
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
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
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
    }
    catch (error) {
        res.status(500).json({ message: "Error changing password" });
    }
};
exports.resetPassword = resetPassword;
const downloadAndSaveImage = async (imageUrl) => {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok)
            throw new Error("Failed to download image");
        const buffer = await response.arrayBuffer();
        const filename = `${(0, uuid_1.v4)()}.jpg`;
        const uploadDir = path_1.default.join(__dirname, "../../../uploads");
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        const filepath = path_1.default.join(uploadDir, filename);
        fs_1.default.writeFileSync(filepath, Buffer.from(buffer));
        return filename;
    }
    catch (error) {
        console.error("Error saving image:", error);
        return imageUrl;
    }
};
const googleLogin = async (req, res) => {
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
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        }, process.env.JWT_SECRET, { expiresIn: "360d" });
        res.status(200).json({
            success: true,
            message: "User authenticated successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image ? (0, base_utl_1.getImageUrl)(`/uploads/${user.image}`) : null,
                role: user.role,
                license: user.license,
                premium: user.premium,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            token,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Internal server error",
        });
    }
};
exports.googleLogin = googleLogin;
const facebookLogin = async (req, res) => {
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
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        }, process.env.JWT_SECRET, { expiresIn: "360d" });
        res.status(200).json({
            success: true,
            message: "User authenticated successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image ? (0, base_utl_1.getImageUrl)(`/uploads/${user.image}`) : null,
                premium: user.premium,
                role: user.role,
            },
            token,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Internal server error",
        });
    }
};
exports.facebookLogin = facebookLogin;
const deleteImageIfNeeded = (newImage) => {
    if (newImage && newImage.filename) {
        const imagePath = path_1.default.join(__dirname, "../../../uploads", newImage.filename);
        if (fs_1.default.existsSync(imagePath)) {
            fs_1.default.unlinkSync(imagePath);
        }
    }
};
const updateUser = async (req, res) => {
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
            const isPasswordValid = await bcrypt_1.default.compare(oldPassword, user.password);
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
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (license !== undefined)
            updateData.license = license;
        if (newImage) {
            if (user.image) {
                deleteImageIfNeeded({ filename: user.image });
            }
            updateData.image = newImage.filename;
        }
        // If password is being updated, add it to updateData
        if (passwordUpdated) {
            updateData.password = await bcrypt_1.default.hash(newPassword, 8);
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
                image: updatedUser.image
                    ? (0, base_utl_1.getImageUrl)(`/uploads/${updatedUser.image}`)
                    : null,
                premium: updatedUser.premium,
                license: updatedUser.license,
            },
        });
    }
    catch (error) {
        console.error("Update error:", error);
        deleteImageIfNeeded(newImage);
        res.status(500).json({
            success: false,
            message: "Failed to update user",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.updateUser = updateUser;
const userInfo = async (req, res) => {
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
                premium: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const imageUrl = user.image ? (0, base_utl_1.getImageUrl)(`/uploads/${user.image}`) : null;
        res.status(200).json({
            success: true,
            message: "User information retrieved successfully",
            user: {
                ...user,
                image: imageUrl,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.userInfo = userInfo;
const deleteUser = async (req, res) => {
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
            const imagePath = path_1.default.join(__dirname, "../../uploads", user.image);
            if (fs_1.default.existsSync(imagePath)) {
                fs_1.default.unlinkSync(imagePath);
            }
        }
        await prisma.user.delete({
            where: { id: userId },
        });
        res.status(200).json({
            success: true,
            message: "successfully deleted",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.deleteUser = deleteUser;
const sendChangeEmailOtp = async (req, res) => {
    const { email } = req.body;
    const { userId } = req.user;
    if (!email) {
        res.status(400).json({ message: "new email are required." });
        return;
    }
    try {
        const otp = (0, emailService_utils_1.generateOTP)();
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
        (0, emailService_utils_1.sendForgotPasswordOTP)(email, otp);
        res.status(200).json({
            success: true,
            message: "OTP sent to new email for verification.",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong." });
    }
};
exports.sendChangeEmailOtp = sendChangeEmailOtp;
const verifyChangeEmail = async (req, res) => {
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
        if (new Date() > uCode.expiration) {
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
                    ? (0, base_utl_1.getImageUrl)(`/uploads/${updatedUser.image}`)
                    : updatedUser.image,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong." });
    }
};
exports.verifyChangeEmail = verifyChangeEmail;
//# sourceMappingURL=users.controllers.js.map