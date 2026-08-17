import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  ACCESS_TOKEN_SECRET: z.string().min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
  COOKIE_SECRET: z.string().min(32),

  ENCRYPTION_KEY: z.string().length(64, "ENCRYPTION_KEY must be a 64-character hex string"),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),

  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().email("RESEND_FROM_EMAIL must be a valid email"),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  CLOUDCONVERT_API_KEY: z.string().min(1, "CLOUDCONVERT_API_KEY is required"),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_STARTER_MONTHLY: z.string().min(1),
  STRIPE_PRICE_STARTER_YEARLY: z.string().min(1),
  
  STRIPE_PRICE_PRO_MONTHLY: z.string().min(1),
  STRIPE_PRICE_PRO_YEARLY: z.string().min(1),

  STRIPE_PRICE_PREMIUM_MONTHLY: z.string().min(1),
  STRIPE_PRICE_PREMIUM_YEARLY: z.string().min(1),

  STRIPE_PRICE_MERCHANT_STARTER_MONTHLY: z.string().min(1),
  STRIPE_PRICE_MERCHANT_STARTER_YEARLY: z.string().min(1),

  STRIPE_PRICE_MERCHANT_GROWTH_MONTHLY: z.string().min(1),
  STRIPE_PRICE_MERCHANT_GROWTH_YEARLY: z.string().min(1),

  STRIPE_PRICE_MERCHANT_PRO_MONTHLY: z.string().min(1),
  STRIPE_PRICE_MERCHANT_PRO_YEARLY: z.string().min(1),

  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  SUPER_ADMIN_EMAIL: z.string().email(),
  SUPER_ADMIN_PASSWORD: z.string().min(12),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;