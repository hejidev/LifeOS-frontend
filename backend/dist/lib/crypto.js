"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.hashSecret = hashSecret;
exports.reuseFingerprint = reuseFingerprint;
exports.scorePasswordStrength = scorePasswordStrength;
exports.strengthLabel = strengthLabel;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const errors_1 = require("./errors");
const ALGORITHM = "aes-256-gcm";
let cachedKey = null;
function getKey() {
    if (!cachedKey) {
        const key = Buffer.from(env_1.env.ENCRYPTION_KEY ?? "", "hex");
        if (key.length !== 32)
            throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
        cachedKey = key;
    }
    return cachedKey;
}
function encryptSecret(plaintext) {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}
function decryptSecret(payload) {
    try {
        const [ivB64, tagB64, dataB64] = payload.split(".");
        if (!ivB64 || !tagB64 || dataB64 === undefined)
            throw new Error("malformed payload");
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
        decipher.setAuthTag(Buffer.from(tagB64, "base64"));
        return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
    }
    catch (err) {
        console.error("[crypto] decrypt failed:", err.message);
        throw new errors_1.AppError("This secret couldn't be decrypted. Edit the item and save it again.", 500);
    }
}
function hashSecret(plaintext) {
    return crypto_1.default.createHash("sha256").update(plaintext).digest("hex");
}
function reuseFingerprint(userId, password) {
    const key = crypto_1.default.createHmac("sha256", getKey()).update("lifeos:vault:reuse").digest();
    return crypto_1.default.createHmac("sha256", key).update(`${userId}\u0000${password}`).digest("hex");
}
const COMMON = [
    "password", "passw0rd", "123456", "qwerty", "letmein", "welcome", "admin", "iloveyou",
    "abc123", "monkey", "dragon", "football", "secret", "naija", "lifeos",
];
const SEQUENCES = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
function hasSequence(lower) {
    for (const sequence of SEQUENCES) {
        for (let index = 0; index <= sequence.length - 4; index += 1) {
            const part = sequence.slice(index, index + 4);
            if (lower.includes(part) || lower.includes([...part].reverse().join("")))
                return true;
        }
    }
    return false;
}
function scorePasswordStrength(password) {
    if (!password)
        return 0;
    const lower = password.toLowerCase();
    let pool = 0;
    if (/[a-z]/.test(password))
        pool += 26;
    if (/[A-Z]/.test(password))
        pool += 26;
    if (/\d/.test(password))
        pool += 10;
    if (/[^A-Za-z0-9]/.test(password))
        pool += 33;
    const unique = new Set(password).size;
    const effective = Math.min(password.length, unique * 2);
    let bits = effective * Math.log2(Math.max(pool, 2));
    if (COMMON.some((word) => lower.includes(word)))
        bits = Math.min(bits * 0.5, 30);
    if (hasSequence(lower))
        bits *= 0.75;
    if (/(.{2,})\1+/.test(password))
        bits *= 0.8;
    return Math.max(0, Math.min(100, Math.round((bits / 80) * 100)));
}
function strengthLabel(score) {
    if (score >= 70)
        return "strong";
    if (score >= 40)
        return "medium";
    return "weak";
}
