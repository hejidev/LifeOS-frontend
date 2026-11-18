"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleUpload = singleUpload;
const multer_1 = __importDefault(require("multer"));
const errors_1 = require("./errors");
function singleUpload(field, options) {
    const upload = (0, multer_1.default)({
        storage: multer_1.default.memoryStorage(),
        limits: { fileSize: options.maxBytes, files: 1 },
        fileFilter: (_req, file, cb) => {
            if (!options.allow || options.allow(file))
                return cb(null, true);
            cb(new errors_1.AppError(options.rejectMessage ?? "That file type isn't allowed", 415));
        },
    }).single(field);
    return (req, res, next) => {
        upload(req, res, (err) => {
            if (!err)
                return next();
            if (err instanceof multer_1.default.MulterError) {
                const tooLarge = err.code === "LIMIT_FILE_SIZE";
                return next(new errors_1.AppError(tooLarge ? `That file is larger than ${Math.round(options.maxBytes / 1048576)} MB.` : "The upload failed. Please try again.", tooLarge ? 413 : 400));
            }
            next(err);
        });
    };
}
