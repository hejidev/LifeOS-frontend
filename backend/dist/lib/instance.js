"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSTANCE_ID = exports.BOOTED_AT = void 0;
const crypto_1 = __importDefault(require("crypto"));
const os_1 = __importDefault(require("os"));
exports.BOOTED_AT = new Date();
const base = process.env.RENDER_INSTANCE_ID || `${os_1.default.hostname()}-${process.pid}`;
exports.INSTANCE_ID = crypto_1.default.createHash("sha1").update(`${base}:${exports.BOOTED_AT.getTime()}`).digest("hex").slice(0, 8);
