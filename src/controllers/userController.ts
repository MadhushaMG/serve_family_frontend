import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { User } from "../db/models/User";

export const getMyReferralStats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        const { count, rows } = await User.findAndCountAll({
            where: { referredById: userId },
            attributes: ['id', 'name', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });

        const currentUser = await User.findByPk(userId, { attributes: ['referralCode'] });

        return res.json({
            success: true,
            data: {
                myReferralCode: currentUser?.referralCode,
                totalReferrals: count,
                referralList: rows
            }
        });
    } catch (error) {
        console.error("Referral Stats Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const claimReferral = async (req: AuthRequest, res: Response) => {
    try {
        const { referralCode } = req.body;
        const userId = req.user!.userId;

        if (!referralCode) {
            return res.status(400).json({ success: false, message: "Referral code is required" });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.referredById) {
            return res.status(400).json({ success: false, message: "Referral already claimed" });
        }

        const normalizedCode = referralCode.toUpperCase();

        if (user.referralCode === normalizedCode) {
            return res.status(400).json({ success: false, message: "You cannot use your own referral code" });
        }

        const referrer = await User.findOne({ where: { referralCode: normalizedCode } });
        if (!referrer) {
            return res.status(404).json({ success: false, message: "Invalid referral code" });
        }

        await user.update({ referredById: referrer.id });

        return res.json({
            success: true,
            message: "Referral claimed successfully"
        });
    } catch (error) {
        console.error("Claim Referral Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
