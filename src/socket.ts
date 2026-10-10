import { Server, Socket } from "socket.io";
import { createServer } from "http";

let ioInstance: Server | null = null;
const connectedDriverUserIds = new Set<string>();
const socketToUserMap = new Map<string, string>();
const userToSocketsMap = new Map<string, Set<string>>();

export const isDriverSocketConnected = (driverOrUserId: string): boolean => {
  if (!driverOrUserId) return false;
  return connectedDriverUserIds.has(String(driverOrUserId));
};

export const markDriverUserConnected = (userId: string, socketId?: string) => {
  if (!userId) return;
  const uStr = String(userId);
  connectedDriverUserIds.add(uStr);
  if (socketId) {
    socketToUserMap.set(socketId, uStr);
    if (!userToSocketsMap.has(uStr)) {
      userToSocketsMap.set(uStr, new Set<string>());
    }
    userToSocketsMap.get(uStr)!.add(socketId);
  }
};

export const markDriverUserDisconnected = async (userId?: string, socketId?: string, reason?: string) => {
  const targetUid = userId ? String(userId) : (socketId ? socketToUserMap.get(socketId) : undefined);

  if (socketId) {
    socketToUserMap.delete(socketId);
  }

  if (targetUid) {
    const uStr = String(targetUid);
    if (userToSocketsMap.has(uStr)) {
      const sSet = userToSocketsMap.get(uStr)!;
      if (socketId) sSet.delete(socketId);
      if (sSet.size === 0) {
        userToSocketsMap.delete(uStr);
        connectedDriverUserIds.delete(uStr);
      }
    } else {
      connectedDriverUserIds.delete(uStr);
    }

    // Check if the user has any sockets left connected (e.g. phone turned off, all connections closed)
    const remainingSockets = userToSocketsMap.get(uStr);
    if (!remainingSockets || remainingSockets.size === 0) {
      connectedDriverUserIds.delete(uStr);

      // Automatically update vehicle in database and notify admin / riders
      try {
        const { db } = await import("./db");
        const { Op } = await import("sequelize");
        const vehicle = await db.Vehicle.findOne({
          where: {
            [Op.or]: [{ userId: uStr }, { id: uStr }],
            approvalStatus: "approved"
          }
        });
        if (vehicle && vehicle.isActive) {
          await vehicle.update({ isActive: false, updatedAt: new Date() });
          const payload = {
            vehicleId: vehicle.id,
            driverUserId: vehicle.userId,
            vehicleRegNum: vehicle.vehicleRegNum,
            isActive: false,
            isOnline: false,
            status: "offline",
            reason: reason || "phone_disconnected",
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
            updatedAt: new Date()
          };
          ioInstance?.to("admin_room").emit("driver_status_changed", payload);
          ioInstance?.to("admin_room").emit("drivers_status_updated", payload);
          ioInstance?.to("nearby_drivers").emit("driver_status_changed", payload);
          console.log(`🔌 Driver phone turned off / disconnected: ${vehicle.vehicleRegNum} (${uStr}) -> auto-marked OFFLINE in DB & real-time broadcasted`);
        }
      } catch (err) {
        console.warn("Failed to mark vehicle offline on disconnect:", err);
      }
    }
  }
};

let staleCleanupInterval: NodeJS.Timeout | null = null;

export const startDriverStaleCleaner = () => {
  if (staleCleanupInterval) return;
  staleCleanupInterval = setInterval(async () => {
    try {
      const { db } = await import("./db");
      const activeVehicles = await db.Vehicle.findAll({
        where: {
          isActive: true,
          approvalStatus: "approved"
        }
      });
      if (!activeVehicles || activeVehicles.length === 0) return;

      for (const v of activeVehicles) {
        const hasLiveSocket = isDriverSocketConnected(v.userId) || isDriverSocketConnected(v.id);
        const lastUpdated = v.updatedAt ? new Date(v.updatedAt).getTime() : 0;
        const isStale = (Date.now() - lastUpdated) > 2 * 60 * 1000; // Inactive for > 2 mins

        // If driver has no live socket connection AND no updates in > 2 mins, they are offline!
        if (!hasLiveSocket && isStale) {
          await v.update({ isActive: false, updatedAt: new Date() });
          const payload = {
            vehicleId: v.id,
            driverUserId: v.userId,
            vehicleRegNum: v.vehicleRegNum,
            isActive: false,
            isOnline: false,
            status: "offline",
            reason: "stale_inactivity_timeout",
            latitude: v.latitude,
            longitude: v.longitude,
            updatedAt: new Date()
          };
          ioInstance?.to("admin_room").emit("driver_status_changed", payload);
          ioInstance?.to("admin_room").emit("drivers_status_updated", payload);
          ioInstance?.to("nearby_drivers").emit("driver_status_changed", payload);
          console.log(`⏱️ Auto-swept stale driver offline: ${v.vehicleRegNum} (${v.userId})`);
        }
      }
    } catch (_) {}
  }, 30 * 1000); // Sweep every 30 seconds
};

export const getIO = (): Server | null => {
  return ioInstance;
};

export const initSocket = (app: any) => {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    transports: ["websocket", "polling"],
    pingInterval: 10000, // 10s ping interval for rapid phone disconnect detection
    pingTimeout: 5000,   // 5s timeout -> phone dead / turned off detected in max 15s
  });

  ioInstance = io;
  startDriverStaleCleaner();

  io.on("connection", (socket: Socket) => {
    console.log("⚡ New socket connection:", socket.id);

    // Auto-detect user or driver from socket handshake auth/query
    const handshakeAuth = (socket.handshake?.auth || {}) as Record<string, any>;
    const handshakeQuery = (socket.handshake?.query || {}) as Record<string, any>;
    const autoUserId = handshakeAuth.userId || handshakeAuth.id || handshakeAuth.driverId ||
      handshakeQuery.userId || handshakeQuery.id || handshakeQuery.driverId;
    if (autoUserId) {
      const uStr = String(autoUserId);
      markDriverUserConnected(uStr, socket.id);
      socket.join(`user_${uStr}`);
      import("./db").then(({ db }) => {
        const { Op } = require("sequelize");
        db.Vehicle.findOne({
          where: {
            [Op.or]: [{ userId: uStr }, { id: uStr }],
            approvalStatus: "approved"
          }
        }).then((v: any) => {
          if (v && v.isActive) {
            socket.join(`driver_${uStr}`);
            socket.join("nearby_drivers");
            v.update({ updatedAt: new Date() }).catch(() => {});
            io.to("admin_room").emit("driver_status_changed", {
              vehicleId: v.id,
              driverUserId: v.userId,
              vehicleRegNum: v.vehicleRegNum,
              isActive: true,
              isOnline: true,
              latitude: v.latitude,
              longitude: v.longitude,
              updatedAt: new Date()
            });
          }
        }).catch(() => {});
      }).catch(() => {});
    }

    // Join driver's private room to receive booking requests
    socket.on("join_driver", async (driverData: any) => {
      const driverId = typeof driverData === "object" && driverData !== null
        ? (driverData.driverId || driverData.userId || driverData.id)
        : driverData;

      if (driverId) {
        socket.join(`driver_${driverId}`);
        socket.join(driverId); // Backward compatibility
        socket.join("nearby_drivers");
        markDriverUserConnected(String(driverId), socket.id);

        try {
          const { db } = await import("./db");
          const { Op } = await import("sequelize");
          const vehicle = await db.Vehicle.findOne({
            where: {
              [Op.or]: [{ userId: driverId }, { id: driverId }],
              approvalStatus: "approved"
            }
          });
          if (vehicle) {
            // Driver account online -> automatically mark taxi Online!
            await vehicle.update({ isActive: true, updatedAt: new Date() });
            io.to("admin_room").emit("driver_status_changed", {
              vehicleId: vehicle.id,
              driverUserId: vehicle.userId,
              vehicleRegNum: vehicle.vehicleRegNum,
              isActive: true,
              isOnline: true,
              latitude: vehicle.latitude,
              longitude: vehicle.longitude,
              updatedAt: vehicle.updatedAt
            });
          }
        } catch (_) {}
      }
    });

    // Explicit Driver Go-Online socket event
    socket.on("driver_online", async (data: any) => {
      const driverId = typeof data === "object" && data !== null
        ? (data.driverId || data.userId || data.id)
        : data;

      if (driverId) {
        socket.join(`driver_${driverId}`);
        socket.join(driverId);
        socket.join("nearby_drivers");

        try {
          const { db } = await import("./db");
          const { Op } = await import("sequelize");
          const vehicle = await db.Vehicle.findOne({
            where: {
              [Op.or]: [{ userId: driverId }, { id: driverId }],
              approvalStatus: "approved"
            }
          });
          if (vehicle) {
            const updates: any = { isActive: true, updatedAt: new Date() };
            if (data?.latitude && !isNaN(data.latitude) && Number(data.latitude) !== 0) {
              updates.latitude = Number(data.latitude);
            }
            if (data?.longitude && !isNaN(data.longitude) && Number(data.longitude) !== 0) {
              updates.longitude = Number(data.longitude);
            }
            await vehicle.update(updates);

            const payload = {
              vehicleId: vehicle.id,
              driverUserId: vehicle.userId,
              vehicleRegNum: vehicle.vehicleRegNum,
              isActive: true,
              isOnline: true,
              latitude: vehicle.latitude,
              longitude: vehicle.longitude,
              updatedAt: vehicle.updatedAt
            };
            io.to("admin_room").emit("driver_status_changed", payload);
            io.to("admin_room").emit("drivers_status_updated", payload);
            socket.emit("driver_status_acknowledged", { success: true, isActive: true, isOnline: true });
          }
        } catch (e) {
          console.warn("Socket driver_online error:", e);
        }
      }
    });

    // Explicit Driver Go-Offline socket event
    socket.on("driver_offline", async (data: any) => {
      const driverId = typeof data === "object" && data !== null
        ? (data.driverId || data.userId || data.id)
        : data;

      if (driverId) {
        socket.leave("nearby_drivers");

        try {
          const { db } = await import("./db");
          const { Op } = await import("sequelize");
          const vehicle = await db.Vehicle.findOne({
            where: {
              [Op.or]: [{ userId: driverId }, { id: driverId }],
              approvalStatus: "approved"
            }
          });
          if (vehicle) {
            await vehicle.update({ isActive: false, updatedAt: new Date() });

            const payload = {
              vehicleId: vehicle.id,
              driverUserId: vehicle.userId,
              vehicleRegNum: vehicle.vehicleRegNum,
              isActive: false,
              isOnline: false,
              updatedAt: vehicle.updatedAt
            };
            io.to("admin_room").emit("driver_status_changed", payload);
            io.to("admin_room").emit("drivers_status_updated", payload);
            socket.emit("driver_status_acknowledged", { success: true, isActive: false, isOnline: false });
          }
        } catch (e) {
          console.warn("Socket driver_offline error:", e);
        }
      }
    });

    // Toggle Driver Status socket event
    socket.on("toggle_driver_status", async (data: any) => {
      const driverId = typeof data === "object" && data !== null
        ? (data.driverId || data.userId || data.id)
        : data;

      if (driverId) {
        try {
          const { db } = await import("./db");
          const { Op } = await import("sequelize");
          const vehicle = await db.Vehicle.findOne({
            where: {
              [Op.or]: [{ userId: driverId }, { id: driverId }],
              approvalStatus: "approved"
            }
          });
          if (vehicle) {
            const targetOnline = data?.isOnline !== undefined ? Boolean(data.isOnline) : !vehicle.isActive;
            if (targetOnline) {
              socket.join("nearby_drivers");
            } else {
              socket.leave("nearby_drivers");
            }
            const updates: any = { isActive: targetOnline, updatedAt: new Date() };
            if (data?.latitude && !isNaN(data.latitude) && Number(data.latitude) !== 0) {
              updates.latitude = Number(data.latitude);
            }
            if (data?.longitude && !isNaN(data.longitude) && Number(data.longitude) !== 0) {
              updates.longitude = Number(data.longitude);
            }
            await vehicle.update(updates);

            const payload = {
              vehicleId: vehicle.id,
              driverUserId: vehicle.userId,
              vehicleRegNum: vehicle.vehicleRegNum,
              isActive: targetOnline,
              isOnline: targetOnline,
              latitude: vehicle.latitude,
              longitude: vehicle.longitude,
              updatedAt: vehicle.updatedAt
            };
            io.to("admin_room").emit("driver_status_changed", payload);
            io.to("admin_room").emit("drivers_status_updated", payload);
            socket.emit("driver_status_acknowledged", { success: true, isActive: targetOnline, isOnline: targetOnline });
          }
        } catch (e) {
          console.warn("Socket toggle_driver_status error:", e);
        }
      }
    });

    // Driver location ping via socket (keeps vehicle coordinates & updatedAt fresh)
    socket.on("driver_location", async (data: { driverId?: string; userId?: string; latitude: number; longitude: number; heading?: number; speed?: number }) => {
      const driverId = data?.driverId || data?.userId;
      if (driverId && data?.latitude && data?.longitude) {
        try {
          const { db } = await import("./db");
          const { Op } = await import("sequelize");
          const vehicle = await db.Vehicle.findOne({
            where: {
              [Op.or]: [{ userId: driverId }, { id: driverId }],
              approvalStatus: "approved"
            }
          });
          if (vehicle) {
            await vehicle.update({
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              isActive: true,
              updatedAt: new Date()
            });

            markDriverUserConnected(String(driverId), socket.id);

            io.to("admin_room").emit("driver_status_changed", {
              vehicleId: vehicle.id,
              driverUserId: vehicle.userId,
              vehicleRegNum: vehicle.vehicleRegNum,
              isActive: true,
              isOnline: true,
              latitude: vehicle.latitude,
              longitude: vehicle.longitude,
              heading: data.heading || 0,
              speed: data.speed || 0,
              updatedAt: vehicle.updatedAt
            });
          }
        } catch (_) {}
      }
    });

    // Join booking room (used by both passenger and assigned driver for real-time tracking)
    socket.on("join_booking", (bookingId: string) => {
      if (bookingId) {
        socket.join(`booking_${bookingId}`);
        console.log(`📍 Socket ${socket.id} joined room booking_${bookingId}`);
      }
    });

    // Driver streaming live coordinates during an active trip
    socket.on(
      "stream_driver_location",
      (data: { bookingId: string; latitude: number; longitude: number; heading?: number; speed?: number }) => {
        if (data?.bookingId) {
          io.to(`booking_${data.bookingId}`).emit("driver_location_update", {
            bookingId: data.bookingId,
            latitude: data.latitude,
            longitude: data.longitude,
            heading: data.heading || 0,
            speed: data.speed || 0,
            timestamp: new Date().toISOString(),
          });
        }
      }
    );

    // Join user's private room to receive personal ride updates
    socket.on("join_user", async (userId: string) => {
      if (userId) {
        socket.join(`user_${userId}`);
        socket.join(userId);
        markDriverUserConnected(String(userId), socket.id);

        try {
          const { db } = await import("./db");
          const vehicle = await db.Vehicle.findOne({
            where: { userId, approvalStatus: "approved" }
          });
          if (vehicle) {
            socket.join(`driver_${userId}`);
            // Only join nearby_drivers and keep online if driver's vehicle is already active
            if (vehicle.isActive) {
              socket.join("nearby_drivers");
              await vehicle.update({ updatedAt: new Date() });
              io.to("admin_room").emit("driver_status_changed", {
                vehicleId: vehicle.id,
                driverUserId: vehicle.userId,
                vehicleRegNum: vehicle.vehicleRegNum,
                isActive: true,
                isOnline: true,
                latitude: vehicle.latitude,
                longitude: vehicle.longitude,
                updatedAt: vehicle.updatedAt
              });
            }
          }
        } catch (_) {}
      }
    });

    // Join admin room for real-time fleet operations & booking pulse
    socket.on("join_admin", () => {
      socket.join("admin_room");
      socket.join("nearby_drivers");
      console.log(`🛡️ Admin socket ${socket.id} joined admin_room`);
    });

    // Leave booking room
    socket.on("leave_booking", (bookingId: string) => {
      if (bookingId) {
        socket.leave(`booking_${bookingId}`);
      }
    });

    socket.on("new_ride_request", (data: any) => {
      io.to("nearby_drivers").emit("ride_request_received", data);
    });

    // Direct socket event to cancel a ride request and notify drivers immediately
    socket.on("cancel_ride_request", (data: { bookingId: string; reason?: string }) => {
      if (data?.bookingId) {
        io.to("nearby_drivers").emit("ride_request_cancelled", data);
        io.to("nearby_drivers").emit("ride_request_taken", { bookingId: data.bookingId });
        io.to("nearby_drivers").emit("ride_request_expired", data);
        io.to(`booking_${data.bookingId}`).emit("ride_cancelled", data);
        io.to("admin_room").emit("ride_cancelled", data);
      }
    });

    socket.on("disconnect", async (reason: string) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (reason: ${reason})`);
      await markDriverUserDisconnected("", socket.id, reason);
    });
  });

  return httpServer;
};
