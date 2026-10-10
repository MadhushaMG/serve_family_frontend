import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthRequest extends Request {
  user?: { 
    userId: string;
    vehicleId?: string;
    role?: string;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Missing or invalid Authorization header" });
  }

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET as string) as any;
    // token should contain userId or sub
    const userId = payload.userId ?? payload.sub;
    if (!userId) return res.status(401).json({ success: false, message: "Invalid token payload" });
    req.user = { userId };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return next();
  }

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET as string) as any;
    const userId = payload.userId ?? payload.sub;
    if (userId) {
      req.user = { userId };
    }
  } catch (err) {
    // Gracefully proceed as guest when token is invalid or expired
  }
  return next();
}

/**
 * Middleware that checks if the authenticated user has admin role.
 * Must be used AFTER requireAuth middleware.
 * Checks user.metadata.role === "admin" from the database.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  // Dynamically import db to avoid circular dependency
  import("../db").then(({ db }) => {
    db.User.findByPk(userId, { attributes: ["id", "email", "metadata"] })
      .then((user: any) => {
        if (!user) {
          return res.status(401).json({ success: false, message: "User not found" });
        }
        const isAdmin = user.email === "admin@servefamily.com" ||
                        user.metadata?.role === "admin" ||
                        user.metadata?.role === "superadmin";
        if (!isAdmin) {
          return res.status(403).json({ success: false, message: "Admin access required" });
        }
        req.user!.role = "admin";
        return next();
      })
      .catch(() => {
        return res.status(500).json({ success: false, message: "Authorization check failed" });
      });
  }).catch(() => {
    return res.status(500).json({ success: false, message: "Authorization check failed" });
  });
}

/**
 * Middleware that checks if the authenticated user has admin or agent role.
 * Must be used AFTER requireAuth middleware.
 * Checks user.metadata.role, admin email, or db.Agent record.
 */
export function requireAdminOrAgent(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  import("../db").then(async ({ db }) => {
    try {
      const user: any = await db.User.findByPk(userId, { attributes: ["id", "email", "metadata"] });
      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }
      const isAdmin = user.email === "admin@servefamily.com" ||
                      user.metadata?.role === "admin" ||
                      user.metadata?.role === "superadmin";
      if (isAdmin) {
        req.user!.role = "admin";
        return next();
      }
      const isAgent = user.metadata?.role === "agent" ||
                      user.email?.toLowerCase().includes("agent");
      if (isAgent) {
        req.user!.role = "agent";
        return next();
      }
      const agentRecord = await db.Agent.findOne({ where: { email: user.email } });
      if (agentRecord) {
        req.user!.role = "agent";
        return next();
      }
      return res.status(403).json({ success: false, message: "Admin or Agent access required" });
    } catch {
      return res.status(500).json({ success: false, message: "Authorization check failed" });
    }
  }).catch(() => {
    return res.status(500).json({ success: false, message: "Authorization check failed" });
  });
}
