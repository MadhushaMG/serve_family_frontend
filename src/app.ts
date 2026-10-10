import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import path from "path";
import fs from "fs";
import { sequelize } from "./db/sequelize";
import "./db";
import { openApiSpec } from "./docs/openapi";
import profileRouter from "./routes/profile";
import authRouter from "./routes/auth";
import circleRouter from "./routes/circle";
import logRouter from "./routes/log";
import subscriptionRouter from "./routes/subscription";
import trackerRouter from "./routes/tracker";
import notificationRouter from "./routes/notification";
import { logRequest } from "./middleware/logging";
import { startTrackerServer, stopTrackerServer } from "./services/trackerService";
import { initHooks } from "./db/hooks/index";
import "./config/firebase";
import notificationSettingsRoutes from "./routes/notificationSettings";
import referralRoutes from "./routes/referralRoutes";
import taxiRoutes from "./modules/taxi/routes/taxiRoutes";
import adminTaxiRoutes from "./modules/taxi/routes/adminTaxiRoutes";
import { initSocket } from "./socket";


const app = express();
app.use(express.json({ limit: "10mb" }));

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

const server = initSocket(app);


app.set("trust proxy", 1);

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

const adminDir = path.join(process.cwd(), "life360-admin");
app.use("/admin", express.static(adminDir));
app.get("/admin", (req, res) => {
  res.sendFile(path.join(adminDir, "index.html"));
});

const agentDir = path.join(process.cwd(), "life360-agent");
app.get("/agent", (req, res, next) => {
  if (req.originalUrl.split("?")[0] === "/agent") {
    const query = req.originalUrl.includes("?") ? req.originalUrl.substring(req.originalUrl.indexOf("?")) : "";
    return res.redirect(301, "/agent/" + query);
  }
  return res.sendFile(path.join(agentDir, "index.html"));
});
app.use("/agent", express.static(agentDir));

app.use("/api", logRequest);

const isHttps = process.env.FORCE_HTTPS === "true" || env.NODE_ENV === "production";

app.use((req, res, next) => {
  if (req.path.startsWith("/api/docs") || req.path.startsWith("/admin") || req.path.startsWith("/agent")) {
    return next();
  }

  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "http://*", "https://*"],
      },
    },
    hsts: isHttps
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    crossOriginOpenerPolicy: isHttps ? { policy: "same-origin" } : false,
    crossOriginEmbedderPolicy: isHttps,
  })(req, res, next);
});

app.use(compression());

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    errors: ["Rate limit exceeded"],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/docs")) {
    return next();
  }
  limiter(req, res, next);
});

app.use("/api/docs", (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.removeHeader("Content-Security-Policy");
  next();
});

try {
  const swaggerUi = require("swagger-ui-express");

  app.get("/api/docs/swagger-custom.js", (_req, res) => {
    const customJsPath = path.join(__dirname, "docs", "swagger-custom.js");
    if (fs.existsSync(customJsPath)) {
      res.type("application/javascript").send(fs.readFileSync(customJsPath, "utf8"));
    } else {
      res.type("application/javascript").send("");
    }
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const protocol = req.get("x-forwarded-proto") === "https" ? "https" : "http";
      const host = req.get("host") || "localhost:3000";
      const baseUrl = `${protocol}://${host}`;

      const modifiedSpec = {
        ...openApiSpec,
        servers: [
          { url: baseUrl, description: "Current Server" },
          { url: "https://api.servefamily.com", description: "Production Server" },
        ],
      };

      const swaggerOptions = {
        customJs: "/api/docs/swagger-custom.js",
        swaggerOptions: {
          persistAuthorization: true,
          supportedSubmitMethods: ["get", "post", "put", "delete", "patch"],
          deepLinking: true,
        },
        customCss: `.swagger-ui .topbar { display: none !important; }`,
        customSiteTitle: "Serve Family API Documentation",
      };

      swaggerUi.setup(modifiedSpec, swaggerOptions)(req, res, next);
    }
  );

} catch (err) {
  console.error("Swagger setup error:", err);
}

app.use("/api", authRouter);
app.use("/api/profile/referral", referralRoutes);
app.use("/api", profileRouter);
app.use("/api/circles", circleRouter);
app.use("/api", logRouter);
app.use("/api", subscriptionRouter);
app.use("/api", trackerRouter);
app.use("/api", notificationRouter);
app.use("/api/notifications/settings", notificationSettingsRoutes);
app.use("/api/taxi", taxiRoutes);
app.use("/api/admin/taxi", adminTaxiRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Life 360 API is running",
    version: require("../package.json").version,
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// debug-spec endpoint removed for security - use /api/docs instead

async function startServer() {
  try {
    try {
      await sequelize.authenticate();
      console.log("✅ Database connection established successfully.");
    } catch (authError) {
      console.warn("⚠️ Initial DB auth warning:", authError);
    }

    try {
      await sequelize.sync({
        force: env.NODE_ENV !== "production" && env.FORCE_SYNC === true,
        alter: env.ALTER_SYNC === true,
        logging: false,
      });
      console.log("✅ Database synced.");
    } catch (syncError) {
      console.warn("⚠️ DB Sync warning (server will continue):", syncError instanceof Error ? syncError.message : syncError);
    }

    try {
      await ensureWaitingColumns();
      await ensureTaxiProductionColumns();
      await ensureDefaultPlans();
      await ensureDefaultNotificationSettings();
      await ensureDefaultVehicleTypes();
      await ensureDefaultAdmins();
      await ensureDefaultAgents();
      initHooks();
    } catch (seedError) {
      console.warn("⚠️ Default seeding warning:", seedError instanceof Error ? seedError.message : seedError);
    }

    try {
      await startTrackerServer();
    } catch (error) {
      console.error("Failed to start tracker:", error);
    }

    server.listen(env.PORT, "0.0.0.0", () => {
      console.log(`🚀 Server started on port ${env.PORT} with Socket.io`);
    });
  } catch (error) {
    console.error("FATAL STARTUP ERROR:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  try {
    await stopTrackerServer();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  try {
    await stopTrackerServer();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
});

async function ensureWaitingColumns() {
  try {
    const { db } = await import("./db");
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicles 
      ADD COLUMN IF NOT EXISTS waiting_fare DOUBLE PRECISION DEFAULT 0;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicles 
      ADD COLUMN IF NOT EXISTS is_waiting BOOLEAN DEFAULT false;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicles 
      ADD COLUMN IF NOT EXISTS waiting_started_at TIMESTAMP WITH TIME ZONE;
    `);

    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS is_waiting BOOLEAN DEFAULT false;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS waiting_minutes DOUBLE PRECISION DEFAULT 0;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS waiting_fare DOUBLE PRECISION DEFAULT 0;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS waiting_started_at TIMESTAMP WITH TIME ZONE;
    `);
  } catch (error) {
    console.error("Error ensuring waiting columns:", error);
  }
}

async function ensureTaxiProductionColumns() {
  try {
    const { db } = await import("./db");
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS driver_earnings DOUBLE PRECISION DEFAULT 0;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS company_commission DOUBLE PRECISION DEFAULT 0;
    `);

    // High performance indexes
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_taxi_bookings_status ON taxi_vehicle_bookings(status);
    `);
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_taxi_bookings_vehicle_id ON taxi_vehicle_bookings(vehicle_id);
    `);
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_taxi_vehicles_active ON taxi_vehicles(is_active);
    `);
  } catch (error) {
    console.warn("⚠️ Warning ensuring taxi production columns/indexes:", error);
  }
}

async function ensureDefaultPlans() {
  try {
    const { db } = await import("./db");
    const defaultPlanConfigs: Record<string, any> = {
      Free: {
        maxGroups: 1,
        maxTracking: 1,
        maxDevices: 1,
        hasSms: false,
        hasPhoneAlert: false,
        metadata: {
          price: 0,
          mobileWeb: "Yes",
          health: "No",
          notifications: "Limited",
          phoneAlert: "No",
          sms: "No",
          btnText: "Get started free",
          isPopular: false
        }
      },
      Silver: {
        maxGroups: 3,
        maxTracking: 3,
        maxDevices: 3,
        hasSms: false,
        hasPhoneAlert: true,
        metadata: {
          price: 150,
          mobileWeb: "Yes",
          health: "Limited",
          notifications: "Unlimited",
          phoneAlert: "Yes",
          sms: "Limited",
          btnText: "Subscribe",
          isPopular: false
        }
      },
      Gold: {
        maxGroups: 6,
        maxTracking: 6,
        maxDevices: 6,
        hasSms: true,
        hasPhoneAlert: true,
        metadata: {
          price: 400,
          mobileWeb: "Yes",
          health: "Unlimited",
          notifications: "Unlimited",
          phoneAlert: "Yes",
          sms: "Yes",
          btnText: "Subscribe",
          isPopular: true,
          badgeText: "Most popular"
        }
      },
      Platinum: {
        maxGroups: 12,
        maxTracking: 12,
        maxDevices: 12,
        hasSms: true,
        hasPhoneAlert: true,
        metadata: {
          price: 750,
          mobileWeb: "Yes",
          health: "AI + Unlimited",
          notifications: "Unlimited",
          phoneAlert: "Yes",
          sms: "Unlimited",
          btnText: "Subscribe",
          isPopular: false
        }
      }
    };

    for (const [planName, conf] of Object.entries(defaultPlanConfigs)) {
      const [plan, created] = await db.Plan.findOrCreate({
        where: { name: planName },
        defaults: {
          name: planName,
          ...conf
        },
      });

      // If existing plan has null or empty metadata, seed baseline metadata
      if (!created && (!plan.metadata || Object.keys(plan.metadata).length === 0)) {
        await plan.update({
          metadata: conf.metadata,
          ...(plan.maxGroups === 1 && planName !== 'Free' ? { maxGroups: conf.maxGroups } : {}),
          ...(plan.maxTracking === 1 && planName !== 'Free' ? { maxTracking: conf.maxTracking } : {}),
          ...(plan.maxDevices === 1 && planName !== 'Free' ? { maxDevices: conf.maxDevices } : {})
        });
      }
    }
  } catch (error) {
    console.error("Error ensuring default plans:", error);
  }
}

async function ensureDefaultNotificationSettings() {
  try {
    const { db } = await import("./db");
    const { getDefaultNotificationSettings } = await import("./utils/notificationDefaults");
    const [results] = await db.sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='circles' AND column_name='notification_settings';
    `);
    if (!results || results.length === 0) return;
    const defaultSettings = getDefaultNotificationSettings();
    const circles = await db.Circle.findAll({ where: { notificationSettings: null } });
    for (const circle of circles) {
      await circle.update({ notificationSettings: defaultSettings });
    }
  } catch (error: any) {
    if (error?.parent?.code === "42703" || error?.message?.includes("does not exist")) return;
    console.error("Error ensuring default notification settings:", error);
  }
}

async function ensureDefaultVehicleTypes() {
  try {
    const { db } = await import("./db");
    const vehicleTypesData = [
      // Hire Category (Passenger / Taxi)
      { type: "Bike", category: "hire" as const, baseFare: 80, ratePerKm: 50, seats: 1 },
      { type: "Tuk", category: "hire" as const, baseFare: 100, ratePerKm: 80, seats: 3 },
      { type: "Car", category: "hire" as const, baseFare: 200, ratePerKm: 120, seats: 4 },
      { type: "Flex", category: "hire" as const, baseFare: 250, ratePerKm: 140, seats: 4 },
      { type: "Mini Van", category: "hire" as const, baseFare: 350, ratePerKm: 170, seats: 7 },
      { type: "Van", category: "hire" as const, baseFare: 450, ratePerKm: 200, seats: 10 },

      // Transport Category (Goods & Heavy Transport)
      { type: "Batta", category: "transport" as const, baseFare: 400, ratePerKm: 180, seats: 2 },
      { type: "Truck", category: "transport" as const, baseFare: 800, ratePerKm: 300, seats: 2 },
      { type: "Tipper", category: "transport" as const, baseFare: 1200, ratePerKm: 400, seats: 2 },
      { type: "10 wheel Tipper", category: "transport" as const, baseFare: 2000, ratePerKm: 600, seats: 2 },
      { type: "Large Tractor", category: "transport" as const, baseFare: 1000, ratePerKm: 350, seats: 1 },
      { type: "Farm Tractor", category: "transport" as const, baseFare: 900, ratePerKm: 300, seats: 1 },
    ];

    for (const item of vehicleTypesData) {
      const [vType, created] = await db.VehicleType.findOrCreate({
        where: { type: item.type },
        defaults: item,
      });
      if (!created && vType.category !== item.category) {
        await vType.update({ category: item.category });
      }
    }
  } catch (error) {
    console.error("Error ensuring default vehicle types:", error);
  }
}

async function ensureDefaultAdmins() {
  try {
    const { db } = await import("./db");
    const bcrypt = await import("bcrypt");
    const { env } = await import("./config/env");

    const adminEmail = "admin@servefamily.com";
    const hashedPassword = await bcrypt.hash("admin123", env.BCRYPT_ROUNDS);

    let admin = await db.User.findOne({ where: { email: adminEmail } });
    if (!admin) {
      await db.User.create({
        name: "Primary System Admin",
        email: adminEmail,
        password: hashedPassword,
        emailVerified: true,
        metadata: { role: "admin" }
      });
    } else {
      const meta = (typeof admin.metadata === "object" && admin.metadata !== null) ? admin.metadata : {};
      await admin.update({ password: hashedPassword, emailVerified: true, metadata: { ...meta, role: "admin" } });
    }
  } catch (err) {
    console.error("Error ensuring default admin:", err);
  }
}

async function ensureDefaultAgents() {
  try {
    const { db } = await import("./db");
    const bcrypt = await import("bcrypt");
    const { env } = await import("./config/env");

    const defaultAgents = [
      { name: "Kandy Regional Agent", email: "agent.kandy@servefamily.com", phone: "0771234567", locationName: "Kandy", district: "Kandy", province: "Central" },
      { name: "Colombo Regional Agent", email: "agent.colombo@servefamily.com", phone: "0777654321", locationName: "Colombo", district: "Colombo", province: "Western" },
      { name: "Galle Regional Agent", email: "agent.galle@servefamily.com", phone: "0775556667", locationName: "Galle", district: "Galle", province: "Southern" }
    ];

    const hashedPassword = await bcrypt.hash("agent123", env.BCRYPT_ROUNDS);

    for (const item of defaultAgents) {
      try {
        let user = await db.User.findOne({ where: { email: item.email } });
        if (!user) {
          user = await db.User.create({
            name: item.name,
            email: item.email,
            password: hashedPassword,
            phoneNumber: item.phone,
            emailVerified: true,
            metadata: { role: "agent" }
          });
        } else {
          const meta = (typeof user.metadata === "object" && user.metadata !== null) ? user.metadata : {};
          if (meta.role !== "agent") {
            await user.update({ metadata: { ...meta, role: "agent" }, emailVerified: true });
          }
        }

        await db.Agent.findOrCreate({
          where: { email: item.email },
          defaults: {
            name: item.name,
            email: item.email,
            phone: item.phone,
            locationName: item.locationName,
            district: item.district,
            province: item.province,
            status: "active"
          }
        });
      } catch (itemErr) {
        // Continue if single agent seeding error
      }
    }
  } catch (error) {
    console.error("Error ensuring default agents:", error);
  }
}

startServer().catch((error) => {
  process.exit(1);
});

export default app;
