import { Response, Request } from "express";
import { AuthRequest } from "../middleware/auth";
import { db } from "../db";

async function generateUniqueReferralCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  const exists = await db.Referral.findOne({ where: { referralCode: code } });
  return exists ? generateUniqueReferralCode() : code;
}

export const generateReferralLink = async (req: AuthRequest, res: Response) => {
  try {
    const referrerId = req.user!.userId;
    let referral = await db.Referral.findOne({ where: { referrerId, status: 'pending' } });
    if (!referral) {
      const code = await generateUniqueReferralCode();
      referral = await db.Referral.create({
        referrerId,
        referralCode: code,
        status: 'pending'
      });
    }
    return res.json({
      success: true,
      data: {
        referralCode: referral.referralCode,
        signupUrl: `https://api.servofamily.com/t/signup.html?ref=${referral.referralCode}`
      }
    });
  } catch (error) {
    console.error("GENERATE REFERRAL ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getReferrerDetails = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const referral = await db.Referral.findOne({
      where: { referralCode: code },
      include: [{
        model: db.User,
        as: 'referrerInfo',
        attributes: ['name', 'avatar'],
        include: [{
          model: db.UserPlan,
          as: 'UserPlan',
          include: [{ model: db.Plan, as: 'Plan', attributes: ['name'] }]
        }]
      }]
    });

    if (!referral || !referral.referrerInfo) {
      return res.status(404).json({ success: false, message: "Invalid code" });
    }

    const info = referral.referrerInfo as any;
    const planName = info.UserPlan?.Plan?.name || "Free";

    return res.json({
      success: true,
      data: {
        name: info.name,
        avatar: info.avatar,
        package: planName
      }
    });
  } catch (error) {
    console.error("GET REFERRER DETAILS ERROR:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: (error as any).message 
    });
  }
};
