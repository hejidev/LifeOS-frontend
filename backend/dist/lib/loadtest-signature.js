"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTestHeader = loadTestHeader;
exports.isLoadTestRequest = isLoadTestRequest;
const crypto_1 = __importDefault(require("crypto"));
const sign = (runId, secret) => crypto_1.default.createHmac("sha256", secret).update(runId).digest("hex").slice(0, 24);
function loadTestHeader(runId) {
    const secret = process.env.LOADTEST_SECRET;
    return secret ? `${runId}.${sign(runId, secret)}` : undefined;
}
function isLoadTestRequest(req) {
    const secret = process.env.LOADTEST_SECRET;
    const header = req.get("x-loadtest");
    if (!secret || !header)
        return false;
    const [runId, signature] = header.split(".");
    if (!runId || !signature)
        return false;
    const expected = sign(runId, secret);
    return signature.length === expected.length && crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
