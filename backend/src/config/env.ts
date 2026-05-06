import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_API_TOKEN: z.string().trim().min(1, "ADMIN_API_TOKEN cannot be empty").optional(),
  AUTH_JWT_SECRET: z.string().trim().min(32, "AUTH_JWT_SECRET must be at least 32 characters").default("dev-only-change-this-auth-jwt-secret-min-32"),
  AUTH_COOKIE_NAME: z.string().trim().min(1).default("gh_auth"),
  AUTH_JWT_EXPIRES_IN: z.string().trim().min(2).default("7d"),
});

export const env = envSchema.parse(process.env);
