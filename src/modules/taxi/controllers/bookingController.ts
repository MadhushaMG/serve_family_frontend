import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth";
import { db } from "../../../db";
import { Op } from "sequelize";


export async function createBooking(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { pickupLat, pickupLng, pickupAddress, dropLat, dropLng, dropAddress, distance, fare } = req.body;

    const booking = await db.VehicleBooking.create({
      userId,
      pickupLat,
      pickupLng,
      pickupAddress,
      dropLat,
      dropLng,
      dropAddress,
      distance,
      fare,
      status: "pending"
    });



    return res.status(201).json({ success: true, data: booking });
  } catch (err) {
    console.error("❌ Booking Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}


export async function acceptBooking(req: AuthRequest, res: Response) {
    try {
        const { bookingId } = req.params;
        const vehicleId = req.body.vehicleId;

        const booking = await db.VehicleBooking.findByPk(bookingId);
        if (!booking || booking.status !== "pending") {
            return res.status(400).json({ success: false, message: "Booking already taken or not found" });
        }

        await booking.update({ status: "accepted", vehicleId });
        
        return res.json({ success: true, message: "Ride accepted!" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
}
