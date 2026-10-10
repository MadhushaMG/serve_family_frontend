import { Request, Response, NextFunction } from "express";
import { Log } from "../db/models/Log";
import { AuthRequest } from "./auth";
import { db } from "../db";

/**
 * Sanitizes request body to remove sensitive information
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== "object") {
    return body;
  }

  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "authorization",
    "refreshToken",
    "accessToken",
  ];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Derives a human-readable action description from method and path
 */
function deriveAction(method: string, path: string): string {
  const normalizedPath = path.toLowerCase();

  // Auth actions
  if (normalizedPath.includes("/auth/dev-login")) return "Dev Login";
  if (normalizedPath.includes("/auth/google")) return "Google Login";
  if (normalizedPath.includes("/auth/refresh")) return "Refresh Token";
  if (normalizedPath.includes("/auth/logout")) return "Logout";

  // Circle actions
  if (method === "POST" && normalizedPath === "/api/circles") return "Create Circle";
  if (method === "PUT" && normalizedPath.match(/^\/api\/circles\/[^/]+$/)) return "Update Circle";
  if (method === "DELETE" && normalizedPath.match(/^\/api\/circles\/[^/]+$/))
    return "Delete Circle";
  if (normalizedPath.includes("/circles") && normalizedPath.includes("/invite"))
    return "Invite User to Circle";
  if (normalizedPath.includes("/circles") && normalizedPath.includes("/accept-invite"))
    return "Accept Circle Invite";
  if (normalizedPath.includes("/circles") && normalizedPath.includes("/reject-invite"))
    return "Reject Circle Invite";
  if (
    normalizedPath.includes("/circles") &&
    normalizedPath.includes("/members") &&
    normalizedPath.includes("/role")
  )
    return "Update User Role in Circle";
  if (normalizedPath.includes("/circles") && normalizedPath.includes("/assign-location"))
    return "Assign Location to User";
  if (normalizedPath.includes("/circles") && normalizedPath.includes("/mark-location-reached"))
    return "Mark Location Reached";

  // Profile actions
  if (method === "PUT" && normalizedPath === "/api/profile") return "Update Profile";
  if (normalizedPath.includes("/profile/firebase-token")) return "Store Firebase Token";
  if (normalizedPath.includes("/profile/circles") && normalizedPath.includes("/location") && method === "POST")
    return "Update Current Location";
  if (normalizedPath.includes("/profile/location-history") && method === "GET") return "Get Location History";

  // Fallback: create a readable description from method + path
  const pathParts = path.split("/").filter(Boolean);
  const resource = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || "resource";
  const actionMap: Record<string, string> = {
    POST: "Create",
    PUT: "Update",
    PATCH: "Update",
    DELETE: "Delete",
  };

  const action = actionMap[method] || method;
  const resourceName = resource
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return `${action} ${resourceName}`;
}

/**
 * Middleware to log non-GET requests
 */
export async function logRequest(req: Request, res: Response, next: NextFunction) {
  // Skip logging for GET requests
  if (req.method === "GET") {
    return next();
  }

  // Skip logging for health checks and docs
  if (req.path === "/api/health" || req.path.startsWith("/api/docs")) {
    return next();
  }

  const startTime = Date.now();
  const method = req.method;
  const path = req.path;
  const action = deriveAction(method, path);
  const ipAddress = req.ip || req.socket.remoteAddress || null;
  const userAgent = req.get("user-agent") || null;

  // Capture request body (sanitized)
  let requestBody = null;
  if (req.body && Object.keys(req.body).length > 0) {
    requestBody = sanitizeRequestBody(req.body);
  }

  // Store original end function
  const originalEnd = res.end;
  let errorMessage: string | null = null;

  // Capture errors from route handlers via res.json
  const originalJson = res.json;
  res.json = function (body: any) {
    res.json = originalJson;
    // Check if response indicates an error
    if (res.statusCode >= 400 && body && typeof body === "object") {
      errorMessage = body.message || body.error || JSON.stringify(body);
    }
    return originalJson.call(this, body);
  };

  // Override res.end to capture response time and status code
  res.end = function (chunk?: any, encoding?: any) {
    res.end = originalEnd;

    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Capture userId at response time (after auth middleware has run)
    const userId = (req as AuthRequest).user?.userId || null;

    // Determine error message
    let error: string | null = null;
    if (statusCode >= 400) {
      error = errorMessage || chunk?.toString() || "Error occurred";
      // Limit error message length
      if (error && error.length > 500) {
        error = error.substring(0, 500) + "...";
      }
    }

    // Log to database asynchronously (don't block response)
    // Fetch user information and create log entry in parallel
    (async () => {
      let userInfo: Record<string, any> | null = null;
      
      // Always try to fetch user information if userId exists
      if (userId) {
        try {
          const user = await db.User.findByPk(userId, {
            attributes: ["id", "name", "email"],
          });
          if (user) {
            userInfo = {
              id: user.id,
              name: user.name,
              email: user.email,
            };
          }
        } catch (userErr) {
          // If user fetch fails, continue without user info
        }
      }

      // Prepare metadata with user information
      const metadata: Record<string, any> = {};
      if (userInfo) {
        metadata.user = userInfo;
      }

      // Always create log entry, even if user info couldn't be fetched
      try {
        await Log.create({
          method,
          path,
          action,
          userId,
          ipAddress,
          userAgent,
          requestBody,
          statusCode,
          responseTime,
          error,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        });
      } catch (err) {
        // Silently fail - don't block the request if logging fails
      }
    })();

    return originalEnd.call(this, chunk, encoding);
  };

  next();
}
