"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(5000),
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: zod_1.z.string().min(1, "REDIS_URL is required"),
    ACCESS_TOKEN_SECRET: zod_1.z.string().min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
    COOKIE_SECRET: zod_1.z.string().min(32),
    ENCRYPTION_KEY: zod_1.z.string().length(64, "ENCRYPTION_KEY must be a 64-character hex string"),
    GOOGLE_CLIENT_ID: zod_1.z.string().min(1),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().min(1),
    GOOGLE_REDIRECT_URI: zod_1.z.string().url(),
    RESEND_API_KEY: zod_1.z.string().min(1, "RESEND_API_KEY is required"),
    RESEND_FROM_EMAIL: zod_1.z.string().email("RESEND_FROM_EMAIL must be a valid email"),
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().min(1),
    CLOUDINARY_API_KEY: zod_1.z.string().min(1),
    CLOUDINARY_API_SECRET: zod_1.z.string().min(1),
    ANTHROPIC_API_KEY: zod_1.z.string().min(1, "ANTHROPIC_API_KEY is required"),
    CLOUDCONVERT_API_KEY: zod_1.z.string().min(1, "CLOUDCONVERT_API_KEY is required"),
    STRIPE_SECRET_KEY: zod_1.z.string().min(1),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().min(1),
    STRIPE_PRICE_STARTER_MONTHLY: zod_1.z.string().min(1),
    STRIPE_PRICE_STARTER_YEARLY: zod_1.z.string().min(1),
    STRIPE_PRICE_PRO_MONTHLY: zod_1.z.string().min(1),
    STRIPE_PRICE_PRO_YEARLY: zod_1.z.string().min(1),
    STRIPE_PRICE_PREMIUM_MONTHLY: zod_1.z.string().min(1),
    STRIPE_PRICE_PREMIUM_YEARLY: zod_1.z.string().min(1),
    STRIPE_PRICE_MERCHANT_STARTER_MONTHLY: zod_1.z.string().min(1),
    STRIPE_PRICE_MERCHANT_STARTER_YEARLY: zod_1.z.string().min(1),
    STRIPE_PRICE_MERCHANT_GROWTH_MONTHLY: zod_1.z.string().min(1),
    STRIPE_PRICE_MERCHANT_GROWTH_YEARLY: zod_1.z.string().min(1),
    STRIPE_PRICE_MERCHANT_PRO_MONTHLY: zod_1.z.string().min(1),
    STRIPE_PRICE_MERCHANT_PRO_YEARLY: zod_1.z.string().min(1),
    FRONTEND_URL: zod_1.z.string().url().default("http://localhost:3000"),
    SUPER_ADMIN_EMAIL: zod_1.z.string().email(),
    SUPER_ADMIN_PASSWORD: zod_1.z.string().min(12),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
