import { db } from "../db";

export async function canAddMore(userId: string, type: 'groups' | 'admins' | 'locations' | 'devices', circleId?: string) {
    const user = await db.User.findByPk(userId);
    // SuperAdmin & System Admins bypass plan limits completely
    if (user && (user.email === 'admin@servefamily.com' || (user as any).metadata?.role === 'admin' || (user as any).metadata?.role === 'superadmin')) {
      return { allowed: true };
    }

    let userPlan = await db.UserPlan.findOne({
        where: { userId },
        include: [{ model: db.Plan }]
    });

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
        return { allowed: false, message: "No active plan found." };
      }
    }
    
    const plan = userPlan?.Plan;
    if (!plan) return { allowed: false, message: "No active plan found." };

    if (type === 'groups') {
        const count = await db.Circle.count({ where: { creatorId: userId } });
        return count < plan.maxGroups ? { allowed: true } : { allowed: false, message: `Your ${plan.name} plan allows only ${plan.maxGroups} groups.` };
    }

    if (type === 'locations') {
 

        const whereClause = circleId ? { circleId } : { creatorId: userId };
        const count = await db.Location.count({ where: whereClause });
        return count < plan.maxTracking ? { allowed: true } : { allowed: false, message: `Your ${plan.name} plan allows only ${plan.maxTracking} locations.` };
    }

    if (type === 'devices') {
        const count = await db.UserDevice.count({ where: { userId } });
        return count < plan.maxDevices ? { allowed: true } : { allowed: false, message: `Your ${plan.name} plan allows only ${plan.maxDevices} devices.` };
    }

    if (type === 'admins' && circleId) {
        return { allowed: true };
    }

    return { allowed: false, message: "Invalid check type." };
}
