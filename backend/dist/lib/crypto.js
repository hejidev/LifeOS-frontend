"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.hashSecret = hashSecret;
exports.scorePasswordStrength = scorePasswordStrength;
exports.strengthLabel = strengthLabel;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const ALGORITHM = "aes-256-gcm";
function getKey() {
    return Buffer.from(env_1.env.ENCRYPTION_KEY, "hex");
}
function encryptSecret(plaintext) {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}
function decryptSecret(payload) {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
}
function hashSecret(plaintext) {
    return crypto_1.default.createHash("sha256").update(plaintext).digest("hex");
}
function scorePasswordStrength(password) {
    if (!password)
        return 0;
    let score = Math.min(password.length * 4, 40);
    if (/[a-z]/.test(password))
        score += 10;
    if (/[A-Z]/.test(password))
        score += 10;
    if (/[0-9]/.test(password))
        score += 10;
    if (/[^a-zA-Z0-9]/.test(password))
        score += 15;
    score += Math.min(new Set(password).size * 2, 15);
    if (/^(.)\1+$/.test(password))
        score = Math.min(score, 10);
    return Math.max(0, Math.min(100, score));
}
function strengthLabel(score) {
    if (score >= 70)
        return "strong";
    if (score >= 40)
        return "medium";
    return "weak";
}
