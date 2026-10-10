import { Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { env } from "../config/env";
import { Request } from "express";
import crypto from "crypto";
import { RefreshToken } from "../db/models/RefreshToken";
import bcrypt from "bcrypt";
import { AuthRequest } from "../middleware/auth";
import { sendEmailVerificationCode, sendPasswordResetEmail } from "../services/emailService";
import { sendOTPSMS, sendPasswordResetOTP } from "../services/smsService";
import { getCurrentDate, addMinutesToNow, addDaysToNow } from "../utils/timezone";

import nodemailer from "nodemailer";
import { sendVerificationEmail } from "../utils/mail";

import { updateFirebaseToken } from "../services/notificationService";
import { getUserRoleAndCoverage } from "../services/coverageService";

import appleSignin from 'apple-signin-auth';

async function buildUserAuthResponse(user: any) {
  const { role: resolvedRole, coverageStatus, isCovered, coveredArea } = await getUserRoleAndCoverage(user.id, user);
  let role = resolvedRole;
  let agentProfile = null;

  if (user.email) {
    const agentRecord = await db.Agent.findOne({ where: { email: user.email } });
    if (agentRecord) {
      role = 'agent';
      agentProfile = {
        id: agentRecord.id,
        name: agentRecord.name,
        locationName: agentRecord.locationName,
        province: agentRecord.province,
        district: agentRecord.district
      };
    }
  }

  const existingMeta = (user.metadata && typeof user.metadata === "object") ? { ...user.metadata } : {};
  existingMeta.role = role;
  existingMeta.coverageStatus = coverageStatus;
  existingMeta.status = coverageStatus;
  existingMeta.coverage = coverageStatus;
  existingMeta.covering = coverageStatus;
  existingMeta.isCovered = isCovered;
  existingMeta.covered = isCovered;
  existingMeta.iscovered = isCovered;
  if (coveredArea) {
    existingMeta.coveredArea = coveredArea;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    phoneNumber: user.phoneNumber,
    phoneVerified: user.phoneVerified,
    avatar: user.avatar,
    role,
    agentProfile,
    metadata: existingMeta,
    iscovered: isCovered,
    covering: coverageStatus,
    isCovered,
    coverageStatus,
    coveredArea,
  };
}



// const transporter = nodemailer.createTransport({
//  host: "mail.servefamily.com",
//  port: 465,
//  secure: true,
//  auth: {
//    user: "info@servefamily.com",
//    pass: "38FGl93a,rLVSfN#",
//  },
// });

const getTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

async function sendOTP(email: string, code: string) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`⚠️ SMTP is not configured. Skipping email to ${email}. Verification OTP: ${code}`);
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || `Serve Family <noreply@api.servefamily.com>`,
    to: email,
    subject: `🔐 ${code} is your Serve Family verification code`,
    text: `Your verification code is ${code}. It expires in 30 minutes.`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; color: #333;">
        <div style="background-color: #4CAF50; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 1px;">Serve Family</h1>
        </div>
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 22px;">Verify Your Email</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Thank you for joining Serve Family! To complete your registration, please use the following one-time password (OTP):
          </p>
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0; border: 1px dashed #4CAF50;">
            <span style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #4CAF50;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #888; text-align: center;">
            This code is valid for <b>30 minutes</b>. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
        <div style="background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 5px 0;">&copy; 2026 Serve Family Inc. All rights reserved.</p>
          <p style="margin: 5px 0;"><a href="https://api.servefamily.com" style="color:#4CAF50;text-decoration:none;">api.servefamily.com</a></p>
          <p style="margin: 5px 0;">Protecting what matters most.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("❌ Failed to send OTP email:", err);
    console.log(`🔐 Verification OTP Code for ${email}: ${code}`);
  }
}

interface DevLoginBody {
  name?: string;
  email?: string;
  isAdmin?: boolean;
}

export async function devLogin(req: Request, res: Response) {
  if (env.NODE_ENV === "production" || env.DEV_AUTH !== true) {
    return res.status(403).json({ success: false, message: "Dev login disabled" });
  }

  const body = req.body as DevLoginBody;
  if (!body?.email) return res.status(400).json({ success: false, message: "email is required" });

  try {
    const { email, name } = body;

    const displayName = (name ?? email.split("@")[0]) as string;
    

   const [user, created] = await db.User.findOrCreate({
      where: { email },
      defaults: { name: displayName, email },
    });
    
    if (created) await assignDefaultFreePlan(user.id);
    await db.OAuthAccount.findOrCreate({
      where: { provider: "google", providerId: `dev:${email}` },
      defaults: { userId: user.id, provider: "google", providerId: `dev:${email}` },
    });

    const token = jwt.sign(
      { userId: user.id },
      env.JWT_SECRET as string,
      {
        expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as string,
      } as jwt.SignOptions
    );

    const refreshPlain = crypto.randomBytes(64).toString("hex");
    const hash = crypto.createHash("sha256").update(refreshPlain).digest("hex");
    const refreshTtlMs = parseDuration(env.REFRESH_TOKEN_EXPIRES_IN as string);
    const expiresAt = new Date(Date.now() + refreshTtlMs);

    await RefreshToken.create({ userId: user.id, tokenHash: hash, expiresAt });

    const userPlan = await db.UserPlan.findOne({
      where: { userId: user.id },
      include: [
        {
          model: db.Plan,
          attributes: ["id", "name", "metadata"],
        },
      ],
    });

    const userAuthObj = await buildUserAuthResponse(user);

    // Auto-mark approved taxi online when driver logs in
    db.Vehicle.update(
      { isActive: true, updatedAt: new Date() },
      { where: { userId: user.id, approvalStatus: "approved" } }
    ).catch(() => {});

    return res.json({ 
      success: true, 
      token, 
      refreshToken: refreshPlain,
      user: userAuthObj,
      plan: userPlan ? {
        id: userPlan.Plan?.id,
        name: userPlan.Plan?.name,
        metadata: userPlan.Plan?.metadata,
      } : null,
    });
  } catch (err) {
    console.error("devLogin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function googleLogin(req: Request, res: Response) {
  try {
    const idToken = req.body?.idToken;
    if (!idToken) return res.status(400).json({ success: false, message: "idToken is required" });

    // Note: Node 18+ has native fetch. If TS complains, verify tsconfig lib includes 'dom' or 'es2015'.
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Google tokeninfo failed:", resp.status, text);
      return res.status(400).json({ success: false, message: "Invalid Google ID token" });
    }
    const info = await resp.json();
    const email = info.email as string | undefined;
    const providerId = info.sub as string | undefined;
    const name = info.name as string | undefined;

    if (!email || !providerId) {
      return res
        .status(400)
        .json({ success: false, message: "Google token missing email or subject" });
    }

    const displayName = (name ?? email.split("@")[0]) as string;
    
  const [user, created] = await db.User.findOrCreate({
      where: { email },
      defaults: { name: displayName, email },
    });
    
if (created) await assignDefaultFreePlan(user.id);    

await db.OAuthAccount.findOrCreate({
      where: { provider: "google", providerId },
      defaults: { userId: user.id, provider: "google", providerId, metadata: info },
    });

    const token = jwt.sign(
      { userId: user.id },
      env.JWT_SECRET as string,
      { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as string } as jwt.SignOptions
    );

    const refreshPlain = crypto.randomBytes(64).toString("hex");
    const hash = crypto.createHash("sha256").update(refreshPlain).digest("hex");
    const refreshTtlMs = parseDuration(env.REFRESH_TOKEN_EXPIRES_IN as string);
    const expiresAt = new Date(Date.now() + refreshTtlMs);
    await RefreshToken.create({ userId: user.id, tokenHash: hash, expiresAt });

    const userPlan = await db.UserPlan.findOne({
      where: { userId: user.id },
      include: [
        {
          model: db.Plan,
          attributes: ["id", "name", "metadata"],
        },
      ],
    });

    const userAuthObj = await buildUserAuthResponse(user);

    // Auto-mark approved taxi online when driver logs in
    db.Vehicle.update(
      { isActive: true, updatedAt: new Date() },
      { where: { userId: user.id, approvalStatus: "approved" } }
    ).catch(() => {});

    return res.json({ 
      success: true, 
      token, 
      refreshToken: refreshPlain,
      user: userAuthObj,
      plan: userPlan ? {
        id: userPlan.Plan?.id,
        name: userPlan.Plan?.name,
        metadata: userPlan.Plan?.metadata,
      } : null,
    });
  } catch (err) {
    console.error("googleLogin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

function parseDuration(v: string) {
  const m = /^([0-9]+)(s|m|h|d)$/.exec(v);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2];
  switch (unit) {
    case "s":
      return n * 1000;
    case "m":
      return n * 60 * 1000;
    case "h":
      return n * 60 * 60 * 1000;
    case "d":
      return n * 24 * 60 * 60 * 1000;
    default:
      return n;
  }
}

async function generateTokens(userId: string) {
  const token = jwt.sign({ userId }, env.JWT_SECRET as string, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as string,
  } as jwt.SignOptions);

  const refreshPlain = crypto.randomBytes(64).toString("hex");
  const hash = crypto.createHash("sha256").update(refreshPlain).digest("hex");
  const refreshTtlMs = parseDuration(env.REFRESH_TOKEN_EXPIRES_IN as string);
  const expiresAt = new Date(Date.now() + refreshTtlMs);

  await RefreshToken.create({ userId, tokenHash: hash, expiresAt });

  return { token, refreshToken: refreshPlain };
}

interface RegisterBody {
  email: string;
  password: string;
  name: string;
}



export async function register(req: Request, res: Response) {
  try {
    const { email: rawEmail, password, name, referralCode } = req.body;

    if (!rawEmail || !password || !name) {
      return res.status(400).json({ success: false, message: "Email, password, and name are required" });
    }

    const email = rawEmail.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User with this email already exists" });
    }

    let referredBy = null;
    if (referralCode) {
      referredBy = await db.User.findOne({ where: { referralCode } });
    }

    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const user = await db.User.create({
      email,
      password: hashedPassword,
      name,
      emailVerified: false,
      phoneNumber: null,
      phoneVerified: false,
      referredById: referredBy ? referredBy.id : null,
      referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),   
    });

    try {
      const freePlan = await db.Plan.findOne({ where: { name: 'Free' } });
      if (freePlan) {
        await db.UserPlan.create({
          userId: user.id,
          planId: freePlan.id,
          status: 'active'
        });
        console.log(`✅ Default Free Plan assigned to user: ${user.email}`);
      }
    } catch (planErr) {
      console.error("❌ Failed to assign default plan during registration:", planErr);
    }

    // 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = addMinutesToNow(30);

    await db.EmailVerification.create({
      email,
      code,
      expiresAt,
      verified: false,
    });

    await sendOTP(email, code);

    if (referralCode) {
      await db.Referral.update(
        { referredUserId: user.id, status: 'completed' },
        { where: { referralCode: referralCode, referredUserId: null } }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for the verification code.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
    });
  } catch (err: any) {
    if (err?.name === "SequelizeUniqueConstraintError" || err?.name === "SequelizeValidationError") {
      return res.status(409).json({ success: false, message: "User with this email already exists" });
    }
    console.error("❌ Register error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

interface LoginBody {
  email: string;
  password: string;
}

export async function login(req: Request, res: Response) {
  console.log("Login Request Body:", req.body);
  try {
    const body = (req.body || {}) as LoginBody;

    if (!body.email || !body.password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const email = body.email.trim().toLowerCase();

    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "This account doesn't have a password. Please use Google sign-in or reset your password.",
      });
    }

    // Password check
    const isPasswordValid = await bcrypt.compare(body.password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isAdminOrAgentUser = user.email === "admin@servefamily.com" || 
                               user.metadata?.role === "admin" || 
                               user.metadata?.role === "superadmin" || 
                               user.metadata?.role === "agent" ||
                               env.NODE_ENV === "development" ||
                               process.env.NODE_ENV === "development";

    if (!user.emailVerified && !isAdminOrAgentUser) {
      return res.status(403).json({
        success: false,
        message: "Email verification required. Please verify your email address before logging in.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          phoneNumber: user.phoneNumber,
          phoneVerified: user.phoneVerified,
        },
      });
    }

    if (isAdminOrAgentUser && !user.emailVerified) {
      await user.update({ emailVerified: true });
    }

    const { token, refreshToken } = await generateTokens(user.id);
    

const fcmToken = req.body.fcmToken || req.body.fcm_token;
const deviceId = req.body.deviceId || req.body.device_id || 'mobile_app';

if (fcmToken) {
    console.log(`📱 [LOGIN] Saving FCM Token for User: ${user.id}`);
    await updateFirebaseToken(user.id, fcmToken, deviceId);
} else {
    console.log(`⚠️ [LOGIN] No FCM Token provided in login request for User: ${user.id}`);
}
    const userPlan = await db.UserPlan.findOne({
      where: { userId: user.id },
      include: [
        {
          model: db.Plan,
          attributes: ["id", "name", "metadata"],
        },
      ],
    });

    const userAuthObj = await buildUserAuthResponse(user);

    // Auto-mark approved taxi online when driver logs in
    db.Vehicle.update(
      { isActive: true, updatedAt: new Date() },
      { where: { userId: user.id, approvalStatus: "approved" } }
    ).catch(() => {});

    return res.json({
      success: true,
      token,
      refreshToken,
      user: userAuthObj,
      plan: userPlan ? {
        id: userPlan.Plan?.id,
        name: userPlan.Plan?.name,
        metadata: userPlan.Plan?.metadata,
      } : null,
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

interface VerifyEmailBody {
  email: string;
  code: string;
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const body = req.body as VerifyEmailBody;

    if (!body.email || !body.code) {
      return res.status(400).json({
        success: false,
        message: "email and code are required",
      });
    }

    const verification = await db.EmailVerification.findOne({
      where: {
        email: body.email,
        code: body.code.toUpperCase(),
        verified: false,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    if (verification.expiresAt < getCurrentDate()) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new one.",
      });
    }

    const user = await db.User.findOne({ where: { email: body.email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    verification.verified = true;
    await verification.save();

    user.emailVerified = true;
    await user.save();

    return res.json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (err) {
    console.error("verifyEmail error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

interface ResendEmailVerificationBody {
  email: string;
}

export async function resendEmailVerification(req: Request, res: Response) {
  try {
    const body = req.body as ResendEmailVerificationBody;

    if (!body.email) {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    const user = await db.User.findOne({ where: { email: body.email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.EmailVerification.findOne({
        where: { code, verified: false },
      });
      if (!existing || existing.expiresAt < new Date()) {
        break;
      }
      code = generateCode();
      attempts++;
    }

      const expiresAt = addMinutesToNow(30);

      await db.EmailVerification.create({
        email: body.email,
        code: code.toUpperCase(),
        expiresAt,
        verified: false,
      });

      await sendEmailVerificationCode(body.email, user.name, code.toUpperCase(), expiresAt);

    return res.json({
      success: true,
      message: "Verification code sent successfully. Please check your email.",
    });
  } catch (err) {
    console.error("resendEmailVerification error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

function generateOTP(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

interface SendPhoneOTPBody {
  phoneNumber: string;
  name?: string;
}

export async function sendPhoneOTP(req: Request, res: Response) {
  try {
    const body = req.body as SendPhoneOTPBody;

    if (!body.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "phoneNumber is required",
      });
    }

    let code = generateOTP();
    let attempts = 0;

    while (attempts < 10) {
      const existing = await db.PhoneVerification.findOne({
        where: {
          phoneNumber: body.phoneNumber,
          code,
          verified: false,
        },
      });
      if (!existing || existing.expiresAt < new Date()) {
        break;
      }
      code = generateOTP();
      attempts++;
    }

    if (attempts >= 10) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate unique OTP. Please try again.",
      });
    }

      const expiresAt = addMinutesToNow(10);

    await db.PhoneVerification.create({
      phoneNumber: body.phoneNumber,
      code,
      expiresAt,
      verified: false,
    });

    try {
      await sendOTPSMS(body.phoneNumber, code);
    } catch (error) {
      console.error("Failed to send OTP SMS:", error);
      if (env.NODE_ENV !== "production") {
        console.log(`OTP for ${body.phoneNumber}: ${code} (expires in 10 minutes) - SMS sending failed`);
      }
    }

    return res.json({
      success: true,
      message: "OTP sent successfully to your phone number",
      ...(env.NODE_ENV !== "production" && { otp: code, expiresAt }),
    });
  } catch (err) {
    console.error("sendPhoneOTP error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

interface VerifyPhoneOTPBody {
  phoneNumber: string;
  code: string;
  name?: string;
}

export async function verifyPhoneOTP(req: Request, res: Response) {
  try {
    const body = req.body as VerifyPhoneOTPBody;

    if (!body.phoneNumber || !body.code) {
      return res.status(400).json({
        success: false,
        message: "phoneNumber and code are required",
      });
    }

    const verification = await db.PhoneVerification.findOne({
      where: {
        phoneNumber: body.phoneNumber,
        code: body.code,
        verified: false,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP code",
      });
    }

    if (verification.expiresAt < getCurrentDate()) {
      return res.status(400).json({
        success: false,
        message: "OTP code has expired. Please request a new one.",
      });
    }

    verification.verified = true;
    await verification.save();

    let user = await db.User.findOne({ where: { phoneNumber: body.phoneNumber } });

    if (!user) {
      if (!body.name) {
        return res.status(400).json({
          success: false,
          message: "name is required for registration",
        });
      }

      user = await db.User.create({
        phoneNumber: body.phoneNumber,
        name: body.name,
        phoneVerified: true,
        emailVerified: false,
      });
    } else {
      if (!user.phoneVerified) {
        user.phoneVerified = true;
        await user.save();
      }
    }

    const { token, refreshToken } = await generateTokens(user.id);

    const userPlan = await db.UserPlan.findOne({
      where: { userId: user.id },
      include: [
        {
          model: db.Plan,
          attributes: ["id", "name", "metadata"],
        },
      ],
    });

    // Auto-mark approved taxi online when driver logs in via phone OTP
    db.Vehicle.update(
      { isActive: true, updatedAt: new Date() },
      { where: { userId: user.id, approvalStatus: "approved" } }
    ).catch(() => {});

    return res.json({
      success: true,
      message: user.phoneVerified ? "Login successful" : "Registration successful",
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
      },
      plan: userPlan ? {
        id: userPlan.Plan?.id,
        name: userPlan.Plan?.name,
        metadata: userPlan.Plan?.metadata,
      } : null,
    });
  } catch (err: any) {
    console.error("verifyPhoneOTP error:", err);
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Phone number already in use",
      });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

interface ResendPhoneOTPBody {
  phoneNumber: string;
}

export async function resendPhoneOTP(req: Request, res: Response) {
  try {
    const body = req.body as ResendPhoneOTPBody;

    if (!body.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "phoneNumber is required",
      });
    }

    let code = generateOTP();
    let attempts = 0;

    while (attempts < 10) {
      const existing = await db.PhoneVerification.findOne({
        where: {
          phoneNumber: body.phoneNumber,
          code,
          verified: false,
        },
      });
      if (!existing || existing.expiresAt < new Date()) {
        break;
      }
      code = generateOTP();
      attempts++;
    }

    if (attempts >= 10) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate unique OTP. Please try again.",
      });
    }

      const expiresAt = addMinutesToNow(10);

    await db.PhoneVerification.create({
      phoneNumber: body.phoneNumber,
      code,
      expiresAt,
      verified: false,
    });

    try {
      await sendOTPSMS(body.phoneNumber, code);
    } catch (error) {
      console.error("Failed to send OTP SMS:", error);
      if (env.NODE_ENV !== "production") {
        console.log(`Resent OTP for ${body.phoneNumber}: ${code} (expires in 10 minutes) - SMS sending failed`);
      }
    }

    return res.json({
      success: true,
      message: "OTP resent successfully to your phone number",
      ...(env.NODE_ENV !== "production" && { otp: code, expiresAt }),
    });
  } catch (err) {
    console.error("resendPhoneOTP error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}


export async function refreshToken(req: Request, res: Response) {
  try {
    const incoming = req.body?.refreshToken ?? req.body?.refresh_token;
    if (!incoming)
      return res.status(401).json({
        success: false,
        message: "Missing refresh token in request body (refreshToken or refresh_token)",
      });

    const hash = crypto.createHash("sha256").update(incoming).digest("hex");
    const existing = await RefreshToken.findOne({ where: { tokenHash: hash } });
    if (!existing || existing.revoked) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }
    if (existing.expiresAt < getCurrentDate()) {
      return res.status(401).json({ success: false, message: "Refresh token expired" });
    }

    existing.revoked = true;
    await existing.save();

    const newPlain = crypto.randomBytes(64).toString("hex");
    const newHash = crypto.createHash("sha256").update(newPlain).digest("hex");
    const refreshTtlMs = parseDuration(env.REFRESH_TOKEN_EXPIRES_IN as string);
    const expiresAt = new Date(Date.now() + refreshTtlMs);
    await RefreshToken.create({ userId: existing.userId, tokenHash: newHash, expiresAt });

    const accessToken = jwt.sign(
      { userId: existing.userId },
      env.JWT_SECRET as string,
      {
        expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as string,
      } as jwt.SignOptions
    );

    // Keep approved taxi active when refreshing token
    db.Vehicle.update(
      { isActive: true, updatedAt: new Date() },
      { where: { userId: existing.userId, approvalStatus: "approved" } }
    ).catch(() => {});

    return res.json({ success: true, token: accessToken, refreshToken: newPlain });
  } catch (err) {
    console.error("refreshToken error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const incoming = req.body?.refreshToken ?? req.body?.refresh_token;
    if (!incoming) {
      return res.status(400).json({
        success: false,
        message: "Missing refresh token in request body (refreshToken or refresh_token)",
      });
    }
    const hash = crypto.createHash("sha256").update(incoming).digest("hex");
    const existing = await RefreshToken.findOne({ where: { tokenHash: hash } });
    if (!existing) {
      return res.json({ success: true, message: "Refresh token not found or already revoked" });
    }
    
    const deletedCount = await db.FirebaseToken.destroy({
      where: { userId: existing.userId },
    });
    
    existing.revoked = true;
    await existing.save();

    // Mark driver taxi offline upon logout
    db.Vehicle.update(
      { isActive: false, updatedAt: new Date() },
      { where: { userId: existing.userId } }
    ).catch(() => {});
    
    return res.json({ 
      success: true, 
      message: "Refresh token revoked and Firebase tokens cleaned",
      firebaseTokensDeleted: deletedCount 
    });
  } catch (err) {
    console.error("logout error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

interface RequestPasswordResetBody {
  email?: string;
  phoneNumber?: string;
}

export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const body = req.body as RequestPasswordResetBody;

    if (!body.email && !body.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Either email or phoneNumber is required",
      });
    }

    let user;
    if (body.email) {
      user = await db.User.findOne({ where: { email: body.email } });
      if (!user) {
        return res.json({
          success: true,
          message: "If an account with that email exists, a password reset code has been sent.",
        });
      }
    } else if (body.phoneNumber) {
      user = await db.User.findOne({ where: { phoneNumber: body.phoneNumber } });
      if (!user) {
        return res.json({
          success: true,
          message: "If an account with that phone number exists, a password reset code has been sent.",
        });
      }
    }

    if (!user) {
      return res.json({
        success: true,
        message: "If an account exists, a password reset code has been sent.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "This account doesn't have a password. Please use Google sign-in.",
      });
    }

    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.PasswordReset.findOne({
        where: { code, verified: false },
      });
      if (!existing || existing.expiresAt < new Date()) {
        break;
      }
      code = generateCode();
      attempts++;
    }

    if (attempts >= 10) {
      console.warn("Failed to generate unique password reset code after 10 attempts");
    }

      const expiresAt = addMinutesToNow(15);

    await db.PasswordReset.create({
      userId: user.id,
      email: body.email || null,
      phoneNumber: body.phoneNumber || null,
      code: code.toUpperCase(),
      expiresAt,
      verified: false,
    });

    if (body.email) {
      try {
        await sendPasswordResetEmail(body.email, user.name, code.toUpperCase(), expiresAt);
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    } else if (body.phoneNumber) {
      try {
        await sendPasswordResetOTP(body.phoneNumber, code);
      } catch (error) {
        console.error("Failed to send password reset SMS:", error);
        if (env.NODE_ENV !== "production") {
          console.log(`Password reset OTP for ${body.phoneNumber}: ${code} (expires in 15 minutes) - SMS sending failed`);
        }
      }
    }

    return res.json({
      success: true,
      message: "If an account exists, a password reset code has been sent.",
      ...(env.NODE_ENV !== "production" && { resetCode: code.toUpperCase(), expiresAt }),
    });
  } catch (err) {
    console.error("requestPasswordReset error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

interface VerifyPasswordResetCodeBody {
  email?: string;
  phoneNumber?: string;
  code: string;
}

export async function verifyPasswordResetCode(req: Request, res: Response) {
  try {
    const body = req.body as VerifyPasswordResetCodeBody;

    if (!body.code) {
      return res.status(400).json({
        success: false,
        message: "code is required",
      });
    }

    if (!body.email && !body.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Either email or phoneNumber is required",
      });
    }

    const whereClause: any = {
      code: body.code.toUpperCase(),
      verified: false,
    };

    if (body.email) {
      whereClause.email = body.email;
    } else if (body.phoneNumber) {
      whereClause.phoneNumber = body.phoneNumber;
    }

    const reset = await db.PasswordReset.findOne({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    if (!reset) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code",
      });
    }

    if (reset.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reset code has expired. Please request a new one.",
      });
    }

    reset.verified = true;
    await reset.save();

    return res.json({
      success: true,
      message: "Reset code verified successfully",
      resetId: reset.id,
    });
  } catch (err) {
    console.error("verifyPasswordResetCode error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

interface ResetPasswordBody {
  resetId: string;
  newPassword: string;
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const body = req.body as ResetPasswordBody;

    if (!body.resetId || !body.newPassword) {
      return res.status(400).json({
        success: false,
        message: "resetId and newPassword are required",
      });
    }

    if (body.newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const reset = await db.PasswordReset.findOne({
      where: {
        id: body.resetId,
        verified: true,
      },
    });

    if (!reset) {
      return res.status(400).json({
        success: false,
        message: "Invalid or unverified reset code. Please request a new password reset.",
      });
    }

    if (reset.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reset code has expired. Please request a new password reset.",
      });
    }

    const user = await db.User.findByPk(reset.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, env.BCRYPT_ROUNDS);

    user.password = hashedPassword;
    await user.save();

    await RefreshToken.update(
      { revoked: true },
      { where: { userId: user.id, revoked: false } }
    );

    return res.json({
      success: true,
      message: "Password reset successfully. Please login with your new password.",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}



export async function appleLogin(req: Request, res: Response) {
  try {
    const { identityToken, user: appleUserInfo } = req.body;

    if (!identityToken) {
      return res.status(400).json({ success: false, message: "identityToken is required" });
    }

    // 1. Verify Apple Token
    const appleInfo = await appleSignin.verifyIdToken(identityToken, {
      audience: env.APPLE_CLIENT_ID, 
      ignoreExpiration: false,
    });

    const email = appleInfo.email as string;
    const providerId = appleInfo.sub as string; 

    if (!email || !providerId) {
      return res.status(400).json({ success: false, message: "Apple token missing email or subject" });
    }

   
    const displayName = appleUserInfo 
      ? `${appleUserInfo.name.firstName} ${appleUserInfo.name.lastName}`
      : (email.split("@")[0]);

const [user, created] = await db.User.findOrCreate({
      where: { email },
      defaults: { 
        name: displayName, 
        email, 
        emailVerified: true 
      },
    });

  if (created) await assignDefaultFreePlan(user.id);

    await db.OAuthAccount.findOrCreate({
      where: { provider: "apple", providerId },
      defaults: { userId: user.id, provider: "apple", providerId, metadata: appleInfo },
    });

  
    const { token, refreshToken: refreshPlain } = await generateTokens(user.id);


    const fcmToken = req.body.fcmToken || req.body.fcm_token;
    const deviceId = req.body.deviceId || req.body.device_id || 'mobile_app';
    if (fcmToken) {
        await updateFirebaseToken(user.id, fcmToken, deviceId);
    }


    const userPlan = await db.UserPlan.findOne({
      where: { userId: user.id },
      include: [{ model: db.Plan, attributes: ["id", "name", "metadata"] }],
    });

    const userAuthObj = await buildUserAuthResponse(user);

    return res.json({
      success: true,
      token,
      refreshToken: refreshPlain,
      user: userAuthObj,
      plan: userPlan ? {
        id: userPlan.Plan?.id,
        name: userPlan.Plan?.name,
        metadata: userPlan.Plan?.metadata,
      } : null,
    });

  } catch (err) {
    console.error("❌ appleLogin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}


async function assignDefaultFreePlan(userId: string) {
  try {
    const freePlan = await db.Plan.findOne({ where: { name: 'Free' } });
    if (freePlan) {
      const existing = await db.UserPlan.findOne({ where: { userId } });
      if (!existing) {
        await db.UserPlan.create({
          userId: userId,
          planId: freePlan.id,
          status: 'active'
        });
        console.log(`✅ Default Free Plan assigned to user ID: ${userId}`);
      }
    }
  } catch (err) {
    console.error("❌ Failed to assign default plan:", err);
  }
}




export async function requestAccountDeletion(req: AuthRequest, res: Response) {
  try {
  
    const userId = req.user!.userId;
    const user = await db.User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.email) {
      return res.status(400).json({ success: false, message: "No email associated with this account." });
    }

   
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); 

    await db.EmailVerification.create({
      email: user.email,
      code: code,
      expiresAt: expiresAt,
      verified: false,
    });


    const transporter = getTransporter();
    if (transporter) {
      const mailOptions = {
        from: process.env.SMTP_FROM || `Serve Family <noreply@api.servefamily.com>`,
        to: user.email,
        subject: "Account Deletion OTP",
        text: `Your OTP for account deletion is: ${code}. This code expires in 10 minutes.`,
      };

      transporter.sendMail(mailOptions).catch(err => {
        console.error("Failed to send deletion OTP email:", err);
      });
    } else {
      console.warn(`⚠️ SMTP is not configured. Account deletion OTP for ${user.email}: ${code}`);
    }

 
   return res.json({ 
      success: true, 
      message: "OTP has been generated. Please check your email." 
    });

  } catch (err) {
    console.error("REQUEST DELETE ACCOUNT ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}





export async function confirmAccountDeletion(req: AuthRequest, res: Response) {
  const transaction = await db.sequelize.transaction(); 

  try {
    const userId = req.user!.userId;
    const { code } = req.body; 
    
    const user = await db.User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // OTP Check
const validOtp = await db.EmailVerification.findOne({
  where: { email: user.email as string, code: code, verified: false },
  order: [['createdAt', 'DESC']]
});

    if (!validOtp) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Invalid OTP code" });
    }

    if (validOtp.expiresAt < getCurrentDate()) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "OTP code has expired" });
    }

    // 1. Vehicles related data
    if (db.Vehicle) {
        const vehicle = await db.Vehicle.findOne({ where: { userId }, transaction });
        if (vehicle) {
          if (db.VehicleImage) await db.VehicleImage.destroy({ where: { vehicleId: vehicle.id }, transaction });
          if (db.VehicleBooking) await db.VehicleBooking.destroy({ where: { vehicleId: vehicle.id }, transaction });
          await db.Vehicle.destroy({ where: { id: vehicle.id }, transaction });
        }
    }
    
    // 2. Other relations
    if (db.DriverDocument) await db.DriverDocument.destroy({ where: { userId }, transaction });
    if (db.VehicleBooking) await db.VehicleBooking.destroy({ where: { userId }, transaction });
    
if (db.UserLocation) {
   await db.UserLocation.destroy({ where: { userId: userId as any }, transaction });
}

    // 4. Verification/Auth records
    await db.EmailVerification.destroy({ where: { id: validOtp.id }, transaction });
    if (db.PhoneVerification && user.phoneNumber) {
        await db.PhoneVerification.destroy({ where: { phoneNumber: user.phoneNumber }, transaction });
    }
    if (db.OAuthAccount) await db.OAuthAccount.destroy({ where: { userId }, transaction });
    if (db.RefreshToken) await db.RefreshToken.destroy({ where: { userId }, transaction });
    if (db.UserPlan) await db.UserPlan.destroy({ where: { userId }, transaction });
    if (db.FirebaseToken) await db.FirebaseToken.destroy({ where: { userId }, transaction });
    if (db.PasswordReset) await db.PasswordReset.destroy({ where: { userId }, transaction });

    // 5. Final User delete
    await db.User.destroy({ where: { id: userId }, transaction });
    
    await transaction.commit();

    return res.json({ 
      success: true, 
      message: "Your account and all personal data have been permanently deleted." 
    });

  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("CONFIRM DELETE ACCOUNT ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error during deletion." });
  }
}
