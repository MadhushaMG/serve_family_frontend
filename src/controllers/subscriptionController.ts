import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { db } from "../db";

interface SubscribeBody {
  planId: string;
}

export async function subscribeToPlan(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { planId } = req.body as SubscribeBody;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    // Verify plan exists
    const plan = await db.Plan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // Find or create UserPlan entry
    let userPlan = await db.UserPlan.findOne({ where: { userId } });

    if (userPlan) {
      // Update existing subscription
      userPlan.planId = planId;
      await userPlan.save();
    } else {
      // Create new subscription (shouldn't happen due to hook, but handle it anyway)
      userPlan = await db.UserPlan.create({
        userId,
        planId,
      });
    }

    // Fetch the updated user plan with plan details
    const updatedUserPlan = await db.UserPlan.findByPk(userPlan.id, {
      include: [
        {
          model: db.Plan,
          attributes: ["id", "name", "metadata"],
        },
      ],
    });

    return res.json({
      success: true,
      data: updatedUserPlan,
      message: `Successfully subscribed to ${plan.name} plan`,
    });
  } catch (err: any) {
    console.error("subscribeToPlan error:", err);
    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid plan ID",
      });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getCurrentPlan(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const userPlan = await db.UserPlan.findOne({
      where: { userId },
      include: [
        {
          model: db.Plan,
          attributes: ["id", "name", "metadata"],
        },
      ],
    });

    if (!userPlan) {
      return res.status(404).json({
        success: false,
        message: "No plan found for user",
      });
    }

    return res.json({
      success: true,
      data: userPlan,
    });
  } catch (err) {
    console.error("getCurrentPlan error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getAllPlans(req: AuthRequest, res: Response) {
  try {
    const plans = await db.Plan.findAll({
      attributes: ["id", "name", "maxGroups", "maxTracking", "maxDevices", "hasSms", "hasPhoneAlert", "metadata"],
      order: [
        [db.sequelize.literal(`CASE "name" WHEN 'Free' THEN 1 WHEN 'Silver' THEN 2 WHEN 'Gold' THEN 3 WHEN 'Platinum' THEN 4 ELSE 5 END`), "ASC"]
      ],
    });

    return res.json({
      success: true,
      data: plans,
    });
  } catch (err) {
    console.error("getAllPlans error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

