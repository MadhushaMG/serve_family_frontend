import { config } from "dotenv";
import { z } from "zod";

// Load environment variables
config();

const Env = z.object({
  FORCE_SYNC: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  ALTER_SYNC: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEV_AUTH: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  PORT: z.coerce.number().default(3000),
  TRACKER_PORT: z.coerce.number().default(3001),
  // Timezone can be either an offset (e.g., "+05:30") or IANA timezone name (e.g., "Asia/Colombo")
  // Offset format is used for Sequelize, IANA names are preferred for date formatting
  TIMEZONE: z.string().default("+05:30"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGINS: z.string().default("*"),
  BCRYPT_ROUNDS: z.coerce.number().min(8).max(14).default(12),

// Google Login Configuration
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),

// Apple Login Configuration
  APPLE_CLIENT_ID: z.string().optional().default(""),
  APPLE_TEAM_ID: z.string().optional().default(""),
  APPLE_KEY_ID: z.string().optional().default(""),
  APPLE_PRIVATE_KEY_PATH: z.string().optional().default(""),  

// Email configuration (optional - if not provided, emails won't be sent)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true; // Optional, so empty is valid
        // Email regex pattern (simplified but robust)
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        // Match plain email: email@domain.com
        if (emailPattern.test(val.trim())) return true;
        // Match email with display name: "Name" <email@domain.com> or Name <email@domain.com>
        const withDisplayName = /^(.+?)\s*<([^>]+)>$/;
        const match = val.match(withDisplayName);
        if (match && emailPattern.test(match[2].trim())) return true;
        return false;
      },
      { message: "SMTP_FROM must be a valid email address or in format 'Name <email@domain.com>'" }
    ),
  APP_URL: z.string().url().optional().default("http://localhost:3000"),
  // SMS configuration (optional - if not provided, SMS won't be sent)
  SMSLENZ_USER_ID: z.string().optional(),
  SMSLENZ_API_KEY: z.string().optional(),
  SMSLENZ_SENDER_ID: z.string().optional().default("SMSlenzDEMO"),
  // Trust proxy setting for Express (needed when behind reverse proxy/load balancer)
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined; // Let app.ts decide based on NODE_ENV
    }),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().optional().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX: z.coerce.number().optional().default(100), // 100 requests per window
  ROUTING_API_URL: z.string().url().optional().default("https://test.servefamily.com"),
});

export const env = Env.parse(process.env);
export const corsOrigins: ReadonlyArray<string> = env.CORS_ORIGINS.split(",").map((s) => s.trim());
