import { Request, Response } from "express";
import { Log } from "../db/models/Log";
import { Op } from "sequelize";
import { db } from "../db";
import { parseDate } from "../utils/timezone";

interface LogQueryParams {
  page?: string;
  limit?: string;
  method?: string;
  statusCode?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Get API logs with pagination and filtering (unprotected route)
 */
export async function getLogs(req: Request, res: Response) {
  try {
    const {
      page = "1",
      limit = "50",
      method,
      statusCode,
      userId,
      startDate,
      endDate,
    } = req.query as LogQueryParams;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (method) {
      where.method = method.toUpperCase();
    }

    if (statusCode) {
      const status = parseInt(statusCode, 10);
      if (!isNaN(status)) {
        where.statusCode = status;
      }
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = parseDate(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = parseDate(endDate);
      }
    }

    // Fetch logs with pagination and include user information
    const { rows: logs, count } = await Log.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          attributes: ["id", "name", "email"],
          required: false, // Left join - include logs even if user doesn't exist
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset,
    });

    return res.json({
      success: true,
      data: {
        logs: logs.map((log: any) => ({
          id: log.id,
          method: log.method,
          path: log.path,
          action: log.action,
          userId: log.userId,
          user: log.User
            ? {
                id: log.User.id,
                name: log.User.name,
                email: log.User.email,
              }
            : null,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          requestBody: log.requestBody,
          statusCode: log.statusCode,
          responseTime: log.responseTime,
          error: log.error,
          metadata: log.metadata,
          createdAt: log.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.ceil(count / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch logs",
      errors: [error.message],
    });
  }
}
