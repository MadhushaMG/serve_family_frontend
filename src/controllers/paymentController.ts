import { Request, Response } from "express";
import { db } from "../db";

export const ipayCallback = async (req: Request, res: Response) => {
  try {
    const { status, order_id, transaction_id, amount } = req.body;
    const [userId, planId] = order_id.split("|");

    const payment = await db.Payment.create({
      userId,
      planId,
      transactionId: transaction_id,
      amount: amount,
      status: status === "1" ? "success" : "failed",
      rawResponse: req.body
    });

    if (status === "1") {
      let userPlan = await db.UserPlan.findOne({ where: { userId } });
      if (userPlan) {
        userPlan.planId = planId;
        await userPlan.save();
      } else {
        await db.UserPlan.create({ userId, planId });
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("IPAY CALLBACK ERROR:", error);
    return res.status(500).send("Internal Server Error");
  }
};
