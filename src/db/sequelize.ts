import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import { env } from "../config/env";
import { Sequelize } from "sequelize";

const isSsl =
  env.NODE_ENV === "production" ||
  env.DATABASE_URL.includes("sslmode=require") ||
  env.DATABASE_URL.includes("neon.tech") ||
  env.DATABASE_URL.includes("supabase") ||
  env.DATABASE_URL.includes("render.com");

export const sequelize = new Sequelize(env.DATABASE_URL, {
  logging: false,
  timezone: env.TIMEZONE,
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 20,
    min: 0,
    acquire: 60000,
    idle: 30000,
    evict: 1000,
  },
  dialectOptions: {
    keepAlive: true,
    ...(isSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
            checkServerIdentity: () => undefined,
          },
        }
      : {}),
  },
});
