"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSubmissionStatusSchema = exports.createContactSubmissionSchema = void 0;
const zod_1 = require("zod");
exports.createContactSubmissionSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1).max(100),
        email: zod_1.z.string().trim().toLowerCase().email(),
        subject: zod_1.z.string().trim().max(150).optional(),
        message: zod_1.z.string().trim().min(1).max(2000),
    }),
});
exports.updateSubmissionStatusSchema = zod_1.z.object({
    body: zod_1.z.object({ status: zod_1.z.enum(["NEW", "READ", "RESOLVED"]) }),
});
