import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { sendCircleInviteEmail } from "../services/emailService";
import { NotificationType } from "../db/types";
import { sendNotificationToCircle } from "../services/sendNotificationHelper";
import { triggerSmartNotification, EventType } from "../services/notificationLogic";

export async function inviteUser(req: AuthRequest, res: Response) {
  try {
    const circleId = req.params.id;
    const userId = req.user!.userId;
    const {
      email,
      role = "member",
      nickname,
    } = req.body as { email?: string; role?: "admin" | "member"; nickname?: string | null };

    if (!email) {
      return res.status(400).json({ success: false, message: "email is required" });
    }

    if (role !== "admin" && role !== "member") {
      return res.status(400).json({ success: false, message: "role must be 'admin' or 'member'" });
    }

    const circle = await db.Circle.findByPk(circleId, {
      include: [{ model: db.User, as: "creator", attributes: ["id", "name", "email"] }],
    });

    if (!circle) {
      return res.status(404).json({ success: false, message: "Circle not found" });
    }

    const isCreator = circle.creatorId === userId;
    let isAdmin = false;

    if (!isCreator) {
      const membership = await db.Membership.findOne({
        where: { userId, circleId, status: "accepted", role: "admin" },
      });
      isAdmin = !!membership;
    }

    if (!isCreator && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Only circle creators and admins can invite users" });
    }

    const [user] = await db.User.findOrCreate({
      where: { email },
      defaults: {
        name: email.split("@")[0],
        email,
      },
    });

    const existingMembership = await db.Membership.findOne({
      where: { userId: user.id, circleId },
    });

    if (existingMembership) {
      if (existingMembership.status === "accepted") {
        return res
          .status(400)
          .json({ success: false, message: "User is already a member of this circle" });
      }
      if (existingMembership.status === "pending") {
        return res
          .status(400)
          .json({ success: false, message: "Invitation already sent and pending" });
      }
      existingMembership.status = "pending";
      existingMembership.role = role;
      if (nickname !== undefined) existingMembership.nickname = nickname || null;
      await existingMembership.save();
    } else {
      await db.Membership.create({
        userId: user.id,
        circleId,
        role,
        status: "pending",
        nickname: nickname || null,
      });
    }

    const inviter = await db.User.findByPk(userId, { attributes: ["name", "email"] });
    try {
      await sendCircleInviteEmail(email, inviter?.name || "Someone", circle.name, circleId, role);
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
    }

    await triggerSmartNotification(
        circleId,
        EventType.INVITE,
        userId,
        `📨 Invite Sent`,
        `${inviter?.name} invited ${email} to ${circle.name}`,
        { role, email }
    );

    const membership = await db.Membership.findOne({
      where: { userId: user.id, circleId },
      include: [
        { model: db.User, attributes: ["id", "name", "email", "avatar"] },
        { model: db.Circle, attributes: ["id", "name"] },
      ],
    });

    return res.status(201).json({
      success: true,
      data: membership,
      message: "Invitation sent successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function acceptInvite(req: AuthRequest, res: Response) {
  try {
    const circleId = req.params.id;
    const userId = req.user!.userId;

    const membership = await db.Membership.findOne({
      where: { userId, circleId, status: "pending" },
      include: [{ model: db.Circle, attributes: ["id", "name"] }],
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "No pending invitation found for this circle",
      });
    }

    membership.status = "accepted";
    await membership.save();

    const { assignCommonLocationsToMember } = await import("./circleController");
    await assignCommonLocationsToMember(userId, circleId);

    const user = await db.User.findByPk(userId, { attributes: ["id", "name"] });
    const circle = await db.Circle.findByPk(circleId, { attributes: ["id", "name"] });

    if (user && circle) {
      await sendNotificationToCircle({
        circleId,
        notificationType: NotificationType.MEMBERSHIP_ACCEPTED,
        actorId: userId,
        message: `${user.name} has joined ${circle.name}`,
        title: `New member joined: ${circle.name}`,
        body: `${user.name} has joined ${circle.name}`,
        data: {
          userId: userId,
          userName: user.name,
          circleId: circleId,
          circleName: circle.name,
        },
      });
    }

    const updatedCircle = await db.Circle.findByPk(circleId, {
      include: [
        { model: db.Location },
        { model: db.User, as: "creator", attributes: ["id", "name", "email", "avatar"] },
        {
          model: db.User,
          through: { attributes: ["role", "status", "nickname"] },
          attributes: ["id", "name", "email", "avatar"],
        },
      ],
    });

    return res.json({
      success: true,
      data: updatedCircle,
      message: "Invitation accepted successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function rejectInvite(req: AuthRequest, res: Response) {
  try {
    const circleId = req.params.id;
    const userId = req.user!.userId;

    const membership = await db.Membership.findOne({
      where: { userId, circleId, status: "pending" },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "No pending invitation found for this circle",
      });
    }

    membership.status = "rejected";
    await membership.save();

    await triggerSmartNotification(
      circleId,
      EventType.MEMBERSHIP_REJECTED,
      userId,
      `🚫 Invitation Rejected`,
      `A user rejected the invitation to join.`,
      { userId }
    );

    return res.json({
      success: true,
      message: "Invitation rejected successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function listPendingInvites(req: AuthRequest, res: Response) {
  try {
    const circleId = req.params.id;
    const userId = req.user!.userId;

    const circle = await db.Circle.findByPk(circleId);
    if (!circle) {
      return res.status(404).json({ success: false, message: "Circle not found" });
    }

    const isCreator = circle.creatorId === userId;
    let isAdmin = false;

    if (!isCreator) {
      const membership = await db.Membership.findOne({
        where: { userId, circleId, status: "accepted", role: "admin" },
      });
      isAdmin = !!membership;
    }

    if (!isCreator && !isAdmin) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Only circle creators and admins can view pending invites",
        });
    }

    const pendingInvites = await db.Membership.findAll({
      where: { circleId, status: "pending" },
      include: [{ model: db.User, attributes: ["id", "name", "email", "avatar"] }],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: pendingInvites,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function listMyPendingInvites(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const pendingInvites = await db.Membership.findAll({
      where: { userId, status: "pending" },
      include: [
        {
          model: db.Circle,
          attributes: ["id", "name"],
          include: [
            { model: db.User, as: "creator", attributes: ["id", "name", "email", "avatar"] },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: pendingInvites,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  try {
    const circleId = req.params.id;
    const userId = req.user!.userId;
    const targetUserId = req.params.userId;
    const { role } = req.body as { role?: "admin" | "member" };

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    if (!role || (role !== "admin" && role !== "member")) {
      return res.status(400).json({ success: false, message: "role must be 'admin' or 'member'" });
    }

    const circle = await db.Circle.findByPk(circleId);
    if (!circle) {
      return res.status(404).json({ success: false, message: "Circle not found" });
    }

    if (circle.creatorId !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Only the circle creator can change user roles" });
    }

    if (targetUserId === circle.creatorId) {
      return res.status(400).json({ success: false, message: "Cannot change the creator's role" });
    }

    const membership = await db.Membership.findOne({
      where: { userId: targetUserId, circleId, status: "accepted" },
      include: [{ model: db.User, attributes: ["id", "name", "email", "avatar"] }],
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "User is not an accepted member of this circle",
      });
    }

    membership.role = role;
    await membership.save();

    await triggerSmartNotification(
        circleId,
        EventType.ROLE_UPDATED,
        userId,
        `👮 Role Updated`,
        `A member's role was changed to ${role}`,
        { targetUserId, newRole: role }
    );

    const updatedMembership = await db.Membership.findByPk(membership.id, {
      include: [
        { model: db.User, attributes: ["id", "name", "email", "avatar"] },
        { model: db.Circle, attributes: ["id", "name"] },
      ],
    });

    return res.json({
      success: true,
      data: updatedMembership,
      message: "User role updated successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateNickname(req: AuthRequest, res: Response) {
  try {
    const circleId = req.params.id;
    const requesterId = req.user!.userId;
    const targetUserId = req.params.userId;
    const { nickname } = req.body as { nickname?: string | null };

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const circle = await db.Circle.findByPk(circleId);
    if (!circle) {
      return res.status(404).json({ success: false, message: "Circle not found" });
    }

    const isCreator = circle.creatorId === requesterId;
    let isAdmin = false;

    if (!isCreator) {
      const requesterMembership = await db.Membership.findOne({
        where: { userId: requesterId, circleId, status: "accepted", role: "admin" },
      });
      isAdmin = !!requesterMembership;
    }

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only circle creators and admins can update nicknames",
      });
    }

    const membership = await db.Membership.findOne({
      where: { userId: targetUserId, circleId, status: "accepted" },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Target user is not an accepted member of this circle",
      });
    }

    membership.nickname = nickname || null;
    await membership.save();

    await triggerSmartNotification(
        circleId,
        EventType.NICKNAME_UPDATED,
        requesterId,
        `✏️ Nickname Updated`,
        `Someone's nickname was changed to ${nickname}`,
        { targetUserId, newNickname: nickname }
    );

    const updatedMembership = await db.Membership.findByPk(membership.id, {
      include: [
        { model: db.User, attributes: ["id", "name", "email", "avatar"] },
        { model: db.Circle, attributes: ["id", "name"] },
      ],
    });

    return res.json({
      success: true,
      data: updatedMembership,
      message: "Nickname updated successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
