"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../lib/errors");
const logger_1 = require("../lib/logger");
const env_1 = require("../config/env");
function errorHandler(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }
    logger_1.logger.error(err);
    return res.status(500).json({
        error: "Something went wrong",
        ...(env_1.env.NODE_ENV !== "production" && err instanceof Error
            ? { detail: err.message }
            : {}),
    });
}
