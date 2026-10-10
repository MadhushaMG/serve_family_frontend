import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { UserDevice } from "../db/models/UserDevice";
import { Notification } from "../db/models/Notification";


export async function markNotificationAsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const [updatedRows] = await Notification.update(
      { read: true }, 
      { 
        where: { 
          recipientId: userId,
          read: false 
        } 
      }
    );

    console.log(`✅ Marked ${updatedRows} notifications as read for user: ${userId}`);

    return res.json({ 
      success: true, 
      message: `Successfully marked ${updatedRows} notifications as read` 
    });
  } catch (err) {
    console.error("Error updating notifications:", err);
    return res.status(500).json({ success: false, message: "Error updating status" });
  }
}
