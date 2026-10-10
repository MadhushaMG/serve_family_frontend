import { db } from "../db";

export const checkPlanLimit = async (userId: string, feature: 'maxGroups' | 'maxDevices') => {
  try {
    const user = await db.User.findByPk(userId);
    // SuperAdmin & System Admins bypass plan limits completely
    if (user && (user.email === 'admin@servefamily.com' || (user as any).metadata?.role === 'admin' || (user as any).metadata?.role === 'superadmin')) {
      return { allowed: true, current: 0, limit: 9999, message: "OK" };
    }

    let userPlan = await db.UserPlan.findOne({
      where: { userId },
      include: [{ model: db.Plan }]
    });

    // If user has no active plan record, auto-assign default Free plan
    if (!userPlan || !userPlan.Plan) {
      const freePlan = await db.Plan.findOne({ where: { name: 'Free' } });
      if (freePlan) {
        userPlan = await db.UserPlan.create({
          userId,
          planId: freePlan.id,
          status: 'active'
        });
        (userPlan as any).Plan = freePlan;
      } else {
        return { allowed: false, message: "No active plan found for this user." };
      }
    }

    const plan = userPlan?.Plan;
    if (!plan) {
      return { allowed: false, message: "No active plan found for this user." };
    }

    if (feature === 'maxGroups') {
      const count = await db.Circle.count({ where: { creatorId: userId } });
      const allowed = count < plan.maxGroups;
      return { 
        allowed, 
        current: count, 
        limit: plan.maxGroups,
        message: allowed 
          ? "OK" 
          : `According to your ${plan.name} plan, you can only create ${plan.maxGroups} group(s). You already have ${count} group(s). Please upgrade your plan to increase this limit.`
      };
    }

    if (feature === 'maxDevices') {
      const count = await db.UserDevice.count({ where: { userId } });
      const allowed = count < plan.maxDevices;
      return { 
        allowed, 
        current: count, 
        limit: plan.maxDevices,
        message: allowed 
          ? "OK" 
          : `According to your ${plan.name} plan, you can only connect ${plan.maxDevices} device(s). You already have ${count} device(s). Please upgrade your plan to increase this limit.`
      };
    }

    return { allowed: false, message: "Unknown limit feature." };
  } catch (error) {
    console.error("❌ LIMIT CHECK ERROR:", error);
    return { allowed: false, message: "Internal server error during limit check." };
  }
};
