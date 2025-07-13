"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const index_1 = __importDefault(require("./models/v1/index"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        "http://192.168.30.102:3000",
        "http://192.168.30.102:*",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:16439/a.html",
        "http://127.0.0.1:16439",
        "http://localhost:5173",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://192.168.4.30:3001",
        "http://192.168.4.30:3002",
        "https://hamzaamjad-dashboard.vercel.app"
    ]
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)("dev"));
// app.use("/", async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     // Use raw SQL to drop the Weather table
//     await prisma.$executeRaw`DROP TABLE IF EXISTS "subscription" CASCADE`; // Adjust if your table name has different casing
//     console.log("Weather table deleted successfully!");
//     res.status(200).json({ message: "Weather table deleted successfully!" });
//   } catch (error) {
//     console.error("Error deleting Weather table:", error);
//     res.status(500).json({ error: "Failed to delete Weather table" });
//   } finally {
//     await prisma.$disconnect();
//   }
// });
app.use((req, res, next) => {
    if (req.originalUrl === '/subscription/webhook') {
        next();
    }
    else {
        express_1.default.json()(req, res, next);
    }
});
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "uploads")));
app.use("/", index_1.default);
app.use((req, res, next) => {
    res.status(404).json({
        message: `404 route not found`,
    });
});
app.use((err, req, res, next) => {
    res.status(500).json({
        message: `500 Something broken!`,
        error: err.message,
    });
});
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
exports.default = app;
//# sourceMappingURL=app.js.map