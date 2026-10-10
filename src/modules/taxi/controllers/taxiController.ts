import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth";
import { db, sequelize } from "../../../db";
import { sendNotificationToUser } from "../../../notifications/fcm-service";
import { Op } from "sequelize";
import { resolveVehicleTypeId, resolveSriLankanCoordinates, calculateHaversineDistanceKm } from "../utils/taxiHelpers";
import { getDrivingRoute, calculateTaxiFare, getFareEstimatesForAllVehicles } from "../services/routingService";
import { getIO, isDriverSocketConnected } from "../../../socket";
import { sendRideReceiptEmail } from "../../../services/emailService";

export function buildVehicleTypeWhere(categoryFilter?: string, typeFilter?: string) {
  const where: any = {};
  
  if (categoryFilter && typeof categoryFilter === "string") {
    const catLower = categoryFilter.trim().toLowerCase();
    if (catLower === "hire" || catLower === "transport") {
      where.category = catLower;
    } else if (
      catLower && 
      catLower !== "type" && 
      catLower !== "all" && 
      catLower !== "any" && 
      catLower !== "null" && 
      catLower !== "undefined" && 
      catLower !== "none" && 
      !typeFilter
    ) {
      typeFilter = categoryFilter;
    }
  }

  if (typeFilter && typeof typeFilter === "string") {
    let typeClean = typeFilter.trim();
    const typeLower = typeClean.toLowerCase();
    if (
      typeClean && 
      typeLower !== "type" && 
      typeLower !== "all" && 
      typeLower !== "any" && 
      typeLower !== "null" && 
      typeLower !== "undefined" && 
      typeLower !== "none"
    ) {
      const lower = typeLower.replace(/[\s-_]+/g, " ");
      if (
        lower === "tuk" || lower === "tuktuk" || lower === "tuk tuk" || 
        lower === "three wheel" || lower === "three wheeler" || lower === "threewheeler" || 
        lower === "3 wheel" || lower === "3-wheel" || lower === "auto" || lower === "trishaw" || lower === "wheel"
      ) {
        typeClean = "Tuk";
      } else if (lower === "bike" || lower === "motorbike" || lower === "motorcycle" || lower === "scooter") {
        typeClean = "Bike";
      } else if (lower === "car" || lower === "taxi" || lower === "sedan" || lower === "hatchback") {
        typeClean = "Car";
      } else if (lower === "flex") {
        typeClean = "Flex";
      } else if (lower === "mini van" || lower === "minivan") {
        typeClean = "Mini Van";
      } else if (lower === "van" || lower === "kdh") {
        typeClean = "Van";
      } else if (lower === "batta" || lower === "dimo") {
        typeClean = "Batta";
      }
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(typeClean);
      if (isUuid) {
        where.id = typeClean;
      } else {
        where.type = { [Op.iLike]: `%${typeClean}%` };
      }
    }
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export async function getVehicleTypes(req: AuthRequest, res: Response) {
  try {
    const types = await db.VehicleType.findAll();
    return res.json({ success: true, data: types });
  } catch (err) {
    console.error("❌ Get Vehicle Types Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function registerVehicle(req: AuthRequest, res: Response) {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user!.userId;
    const { 
      vehicleTypeId, 
      vehicleType,
      type,
      vehicleRegNum, 
      plateNumber,
      mobileNum, 
      showMobileNum,
      color, 
      nicNumber,
      nicFrontUrl, 
      nicBackUrl, 
      drivingLicenseNumber,
      licenseNumber,
      drivingLicenseFrontUrl,
      licenseFrontUrl,
      drivingLicenseBackUrl,
      licenseBackUrl,
      vehicleFrontUrl, 
      vehicleBackUrl, 
      vehicleInUrl,
      baseLatitude,
      motherLatitude,
      baseLongitude,
      motherLongitude,
      baseAddress,
      motherAddress,
      baseFare,
      pickupFare,
      pickupPrice,
      ratePerKm,
      waitingFare,
      waitingCharge,
      isWaiting
    } = req.body;

    const existingVehicle = await db.Vehicle.findOne({ where: { userId } });
    if (existingVehicle) {
      if (existingVehicle.approvalStatus === "approved") {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "User already has an approved registered vehicle" });
      }
      if (existingVehicle.approvalStatus === "pending") {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Your vehicle registration is currently pending admin approval" });
      }
      if (existingVehicle.approvalStatus === "suspended") {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: "Your vehicle account has been suspended. Please contact support." });
      }
      // If rejected, allow driver to re-submit with updated details
    }

    // Resolve vehicleTypeId gracefully using robust synonym mapping
    const vTypeQuery = vehicleTypeId || vehicleType || type;
    const resolvedVehicleTypeId = await resolveVehicleTypeId(vTypeQuery, "hire");

    if (!resolvedVehicleTypeId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Vehicle type not found in database. Please configure vehicle types first." });
    }

    const finalRegNum = (vehicleRegNum || plateNumber || "").trim().toUpperCase();
    if (!finalRegNum) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Vehicle registration number is required" });
    }

    const regExists = await db.Vehicle.findOne({ 
      where: { 
        vehicleRegNum: finalRegNum,
        ...(existingVehicle ? { id: { [Op.ne]: existingVehicle.id } } : {})
      } 
    });
    if (regExists) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "This vehicle registration number is already registered by another driver" });
    }

    const mAddress = motherAddress || baseAddress || "Colombo Center";
    let mLat = motherLatitude !== undefined && motherLatitude !== null ? Number(motherLatitude) : (baseLatitude !== undefined && baseLatitude !== null ? Number(baseLatitude) : null);
    let mLng = motherLongitude !== undefined && motherLongitude !== null ? Number(motherLongitude) : (baseLongitude !== undefined && baseLongitude !== null ? Number(baseLongitude) : null);

    if (mLat === null || mLng === null || isNaN(mLat) || isNaN(mLng)) {
      const geo = resolveSriLankanCoordinates(mAddress);
      mLat = geo.latitude;
      mLng = geo.longitude;
    }

    const pPrice = pickupPrice !== undefined ? Number(pickupPrice) : (pickupFare !== undefined ? Number(pickupFare) : 0.0);
    const resolvedWaitingFare = waitingFare !== undefined && waitingFare !== null 
      ? Number(waitingFare) 
      : (waitingCharge !== undefined && waitingCharge !== null ? Number(waitingCharge) : 0.0);
    const initialIsWaiting = isWaiting !== undefined ? Boolean(isWaiting) : false;

    let vehicle: any;

    if (existingVehicle) {
      await existingVehicle.update(
        {
          vehicleTypeId: resolvedVehicleTypeId,
          vehicleRegNum: finalRegNum,
          mobileNum: (mobileNum || "").trim(),
          showMobileNum: showMobileNum !== undefined ? Boolean(showMobileNum) : true,
          color: (color && String(color).trim()) || "White",
          isActive: false, // Default Offline
          latitude: mLat,
          longitude: mLng,
          baseLatitude: mLat,
          baseLongitude: mLng,
          baseAddress: mAddress,
          baseFare: baseFare !== undefined && baseFare !== null ? Number(baseFare) : null,
          pickupFare: pPrice,
          ratePerKm: ratePerKm !== undefined && ratePerKm !== null ? Number(ratePerKm) : null,
          waitingFare: resolvedWaitingFare,
          isWaiting: initialIsWaiting,
          waitingStartedAt: initialIsWaiting ? new Date() : null,
          approvalStatus: "pending",
          approvalReason: null,
          approvedBy: null,
          approvedById: null,
          approvedAt: null,
        },
        { transaction }
      );
      vehicle = existingVehicle;

      // Clean up previous documents to replace them cleanly
      if (nicFrontUrl || nicBackUrl || nicNumber) {
        await db.DriverDocument.destroy({ where: { userId, documentType: "NIC" }, transaction });
      }
      const finalLicenseNo = drivingLicenseNumber || licenseNumber || null;
      const finalLicenseFront = drivingLicenseFrontUrl || licenseFrontUrl || "";
      const finalLicenseBack = drivingLicenseBackUrl || licenseBackUrl || "";
      if (finalLicenseFront || finalLicenseBack || finalLicenseNo) {
        await db.DriverDocument.destroy({ where: { userId, documentType: "DrivingLicense" }, transaction });
      }
      if (vehicleFrontUrl || vehicleBackUrl || vehicleInUrl) {
        await db.VehicleImage.destroy({ where: { vehicleId: existingVehicle.id }, transaction });
      }
    } else {
      vehicle = await db.Vehicle.create(
        {
          userId,
          vehicleTypeId: resolvedVehicleTypeId,
          vehicleRegNum: finalRegNum,
          mobileNum: (mobileNum || "").trim(),
          showMobileNum: showMobileNum !== undefined ? Boolean(showMobileNum) : true,
          color: (color && String(color).trim()) || "White",
          isActive: false, // Default Offline
          latitude: mLat,
          longitude: mLng,
          baseLatitude: mLat,
          baseLongitude: mLng,
          baseAddress: mAddress,
          baseFare: baseFare !== undefined && baseFare !== null ? Number(baseFare) : null,
          pickupFare: pPrice,
          ratePerKm: ratePerKm !== undefined && ratePerKm !== null ? Number(ratePerKm) : null,
          waitingFare: resolvedWaitingFare,
          isWaiting: initialIsWaiting,
          waitingStartedAt: initialIsWaiting ? new Date() : null,
        },
        { transaction }
      );
    }

    // 1. NIC Document
    if (nicFrontUrl || nicBackUrl || nicNumber) {
      await db.DriverDocument.create(
        {
          userId,
          documentType: "NIC",
          documentNumber: nicNumber || null,
          frontUrl: nicFrontUrl || "",
          backUrl: nicBackUrl || "",
        },
        { transaction }
      );
    }

    // 2. Driving License Document
    const finalLicenseNo = drivingLicenseNumber || licenseNumber || null;
    const finalLicenseFront = drivingLicenseFrontUrl || licenseFrontUrl || "";
    const finalLicenseBack = drivingLicenseBackUrl || licenseBackUrl || "";

    if (finalLicenseFront || finalLicenseBack || finalLicenseNo) {
      await db.DriverDocument.create(
        {
          userId,
          documentType: "DrivingLicense",
          documentNumber: finalLicenseNo,
          frontUrl: finalLicenseFront,
          backUrl: finalLicenseBack,
        },
        { transaction }
      );
    }

    // 3. Vehicle Images (only if at least one image provided)
    if (vehicleFrontUrl || vehicleBackUrl || vehicleInUrl) {
      await db.VehicleImage.create(
        {
          vehicleId: vehicle.id,
          imageFrontUrl: vehicleFrontUrl || "",
          imageBackUrl: vehicleBackUrl || "",
          imageInUrl: vehicleInUrl || "",
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(201).json({ 
      success: true, 
      message: existingVehicle 
        ? "Vehicle registration re-submitted successfully with updated details. Pending admin approval."
        : "Vehicle registered successfully with Mother Location & Pickup Price. Pending admin approval.",
      data: vehicle 
    });

  } catch (err: any) {
    await transaction.rollback();
    console.error("❌ Vehicle Registration Error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err?.message ? `Server error during registration: ${err.message}` : "Server error during registration" 
    });
  }
}

export async function getNearbyDrivers(lat: number, lng: number, radiusKm: number = 15, category?: string, type?: string, onlineOnly?: boolean, excludeUserId?: string) {
  const safeLat = Number(lat);
  const safeLng = Number(lng);
  const requestedRadius = Number(radiusKm) > 0 ? Number(radiusKm) : 15;
  // Strictly enforce maximum pickup radius: max 25km (hard ceiling to prevent listing island-wide vehicles)
  const safeRadius = Math.min(25, Math.max(1, requestedRadius));

  // Guard against math domain errors in acos by clamping values between -1 and 1
  // Table alias "Vehicle" is strictly required because joined "driver" (users) table also has latitude & longitude columns
  // Use NULLIF to avoid 0.0 coordinates defaulting to Null Island (lat 0, lng 0)
  // Seamlessly fall back to driver user account live GPS if vehicle GPS is not set
  const cosFormula = `cos(radians(${safeLat})) * cos(radians(COALESCE(NULLIF("Vehicle"."latitude", 0), NULLIF("driver"."latitude", 0), NULLIF("Vehicle"."base_latitude", 0), 7.2906))) * cos(radians(COALESCE(NULLIF("Vehicle"."longitude", 0), NULLIF("driver"."longitude", 0), NULLIF("Vehicle"."base_longitude", 0), 80.6337)) - radians(${safeLng})) + sin(radians(${safeLat})) * sin(radians(COALESCE(NULLIF("Vehicle"."latitude", 0), NULLIF("driver"."latitude", 0), NULLIF("Vehicle"."base_latitude", 0), 7.2906)))`;
  const clampedCos = `LEAST(1.0, GREATEST(-1.0, ${cosFormula}))`;
  const distanceFormula = `(6371 * acos(${clampedCos}))`;

  // Find all vehicles currently engaged in active trips (within last 12 hours) or direct pending requests
  const busyBookings = await db.VehicleBooking.findAll({
    where: {
      vehicleId: { [Op.ne]: null },
      [Op.or]: [
        {
          status: { [Op.in]: ["accepted", "arrived", "in_transit"] },
          updatedAt: { [Op.gte]: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        },
        {
          status: "pending",
          createdAt: { [Op.gte]: new Date(Date.now() - 45 * 1000) }
        }
      ]
    },
    attributes: ["vehicleId"],
    raw: true
  });
  const busyVehicleIds = Array.from(new Set(busyBookings.map((b: any) => b.vehicleId).filter(Boolean)));

  const whereClause: any = { 
    approvalStatus: 'approved' 
  };
  if (onlineOnly === true) {
    whereClause.isActive = true;
  }
  // Exclude current authenticated driver's own vehicle so they never book or see themselves
  if (excludeUserId) {
    whereClause.userId = { [Op.ne]: excludeUserId };
  }
  // Exclude vehicles currently on another trip or direct pending call
  if (busyVehicleIds.length > 0) {
    whereClause.id = { [Op.notIn]: busyVehicleIds };
  }
  
  const filterWhere = buildVehicleTypeWhere(category, type);
  const vehicleTypeInclude: any = {
    model: db.VehicleType,
    as: 'vehicleType',
    attributes: ['id', 'type', 'category', 'baseFare', 'ratePerKm', 'seats'],
    required: filterWhere !== undefined
  };

  if (filterWhere) {
    vehicleTypeInclude.where = filterWhere;
  }

  const baseAttributes: any[] = [
    'id', 
    'userId', 
    'isActive',
    'latitude', 
    'longitude',
    'vehicleRegNum', 
    'mobileNum',
    'showMobileNum',     
    'color',      
    'ratePerKm',   
    'baseFare',
    'pickupFare',
    'waitingFare',
    'isWaiting',
    'baseLatitude',
    'baseLongitude',
    'baseAddress',
    'approvalStatus',
    'updatedAt',
    [sequelize.literal(distanceFormula), 'distance']
  ];

  const driverInclude = {
    model: db.User,
    as: 'driver',
    attributes: ['id', 'name', 'avatar', 'phoneNumber', 'email', 'latitude', 'longitude', 'updatedAt'],
    required: false
  };

  // 1. Primary Query: Try finding drivers within requested safeRadius (max 25km)
  let drivers = await db.Vehicle.findAll({
    attributes: baseAttributes,
    include: [vehicleTypeInclude, driverInclude],
    where: sequelize.and(
      whereClause,
      sequelize.where(sequelize.literal(distanceFormula), '<=', safeRadius)
    ),
    order: sequelize.literal('distance ASC'),
    limit: 50
  });

  // 2. Adaptive Proximity Fallback: If 0 drivers found and safeRadius was smaller than 25km,
  // expand radius up to 25km ceiling
  if ((!drivers || drivers.length === 0) && safeRadius < 25) {
    const extendedRadius = Math.min(25, safeRadius * 1.5);
    drivers = await db.Vehicle.findAll({
      attributes: baseAttributes,
      include: [vehicleTypeInclude, driverInclude],
      where: sequelize.and(
        whereClause,
        sequelize.where(sequelize.literal(distanceFormula), '<=', extendedRadius)
      ),
      order: sequelize.literal('distance ASC'),
      limit: 50
    });
  }

  // 3. Fleet Fallback: If still 0 drivers in immediate radius, return available approved fleet
  // ordered by proximity so passenger can always discover available vehicles and book rides
  if (!drivers || drivers.length === 0) {
    drivers = await db.Vehicle.findAll({
      attributes: baseAttributes,
      include: [vehicleTypeInclude, driverInclude],
      where: whereClause,
      order: sequelize.literal('distance ASC'),
      limit: 25
    });
  }

  return drivers || [];
}

export async function getAvailableRides(req: AuthRequest, res: Response) {
  try {
    const query = req.query as Record<string, any>;

    // Support all coordinate query param naming variations from mobile & web apps
    const rawLat = query.pickupLat ?? query.pickupLatitude ?? query.pickup_lat ?? query.pickup_latitude ?? query.lat ?? query.latitude ?? query.userLat ?? query.user_lat;
    const rawLng = query.pickupLng ?? query.pickupLongitude ?? query.pickup_lng ?? query.pickup_longitude ?? query.lng ?? query.longitude ?? query.userLng ?? query.user_lng;

    // Support dropoff coordinates for automated distance and fare estimation
    const rawDropLat = query.dropLat ?? query.dropLatitude ?? query.dropoffLat ?? query.dropoffLatitude ?? query.drop_lat ?? query.drop_latitude ?? query.destinationLat ?? query.toLat;
    const rawDropLng = query.dropLng ?? query.dropLongitude ?? query.dropoffLng ?? query.dropoffLongitude ?? query.drop_lng ?? query.drop_longitude ?? query.destinationLng ?? query.toLng;

    const rawRadius = query.radiusKm ?? query.radius ?? query.maxDistance ?? query.searchRadius;
    const rawDistance = query.distance ?? query.distanceKm ?? query.tripDistance;

    let finalLat = rawLat !== undefined && rawLat !== null && rawLat !== "" ? Number(rawLat) : null;
    let finalLng = rawLng !== undefined && rawLng !== null && rawLng !== "" ? Number(rawLng) : null;
    const dropLatNum = rawDropLat !== undefined && rawDropLat !== null && rawDropLat !== "" ? Number(rawDropLat) : null;
    const dropLngNum = rawDropLng !== undefined && rawDropLng !== null && rawDropLng !== "" ? Number(rawDropLng) : null;

    // Search radius strictly capped between 1km and 25km
    const rawRadiusNum = Number(rawRadius);
    const searchRadius = (rawRadiusNum > 0 && !isNaN(rawRadiusNum)) ? Math.min(25, Math.max(1, rawRadiusNum)) : 15;

    // If coordinates are missing from query, fallback to authenticated user's profile location
    if ((finalLat === null || finalLng === null || isNaN(finalLat) || isNaN(finalLng)) && req.user?.userId) {
      const userProfile = await db.User.findByPk(req.user.userId, { attributes: ["latitude", "longitude"] });
      if (userProfile?.latitude && userProfile?.longitude) {
        finalLat = Number(userProfile.latitude);
        finalLng = Number(userProfile.longitude);
      }
    }

    // Auto-calculate trip road distance (KM) and route using directions API
    let tripDistance = rawDistance !== undefined && rawDistance !== null && rawDistance !== "" ? Number(rawDistance) : 0;
    let tripGeometry: any = null;
    let isRoadDistance = false;
    let routeSource = "none";

    if (finalLat !== null && finalLng !== null && !isNaN(finalLat) && !isNaN(finalLng) && dropLatNum !== null && dropLngNum !== null && !isNaN(dropLatNum) && !isNaN(dropLngNum)) {
      if (tripDistance <= 0) {
        const routeResult = await getDrivingRoute(finalLat, finalLng, dropLatNum, dropLngNum);
        tripDistance = routeResult.distanceKm;
        tripGeometry = routeResult.geometry;
        isRoadDistance = routeResult.isRoadDistance;
        routeSource = routeResult.source;
      }
    }

    const isOnlineQuery = query.isOnline ?? query.onlineOnly ?? query.isActive;
    const onlyOnline = isOnlineQuery !== undefined ? (String(isOnlineQuery).toLowerCase() === 'true' || isOnlineQuery === '1') : false;

    // Always exclude the logged-in user's own vehicle so a driver never sees or books their own vehicle
    const excludeUserId = req.user?.userId || (query.excludeUserId as string) || (query.currentUserId as string) || undefined;

    // If coordinates are still missing, fallback to Sri Lanka default (Colombo: 6.9271, 79.8612)
    if (finalLat === null || finalLng === null || isNaN(finalLat) || isNaN(finalLng)) {
      finalLat = 6.9271;
      finalLng = 79.8612;
    }

    const drivers = await getNearbyDrivers(finalLat, finalLng, searchRadius, query.category as string, query.type as string, onlyOnline, excludeUserId);

    const results = drivers.map((d: any) => {
      // Driver account is online strictly if vehicle is active
      const isDriverActuallyOnline = Boolean(d.isActive);

      const baseFare = d.baseFare !== null && d.baseFare !== undefined ? Number(d.baseFare) : (d.vehicleType?.baseFare || 0);
      const pickupFare = d.pickupFare !== null && d.pickupFare !== undefined ? Number(d.pickupFare) : 0;
      const ratePerKm = d.ratePerKm !== null && d.ratePerKm !== undefined ? Number(d.ratePerKm) : (d.vehicleType?.ratePerKm || 0);
      const waitingFare = d.waitingFare !== null && d.waitingFare !== undefined ? Number(d.waitingFare) : 0;
      
      const tripDistFormatted = Number(tripDistance.toFixed(2));
      const distanceFare = Math.round(tripDistFormatted * ratePerKm);
      const fullFare = calculateTaxiFare(tripDistance, baseFare, ratePerKm, pickupFare);
      const estimatedFare = fullFare;

      // Determine display location: live location from vehicle OR driver user, else Mother Location (baseLocation), else Sri Lanka fallback
      let displayLat = (d.latitude && Number(d.latitude) !== 0)
        ? Number(d.latitude)
        : (d.driver?.latitude && Number(d.driver.latitude) !== 0
            ? Number(d.driver.latitude)
            : (d.baseLatitude && Number(d.baseLatitude) !== 0 ? Number(d.baseLatitude) : null));

      let displayLng = (d.longitude && Number(d.longitude) !== 0)
        ? Number(d.longitude)
        : (d.driver?.longitude && Number(d.driver.longitude) !== 0
            ? Number(d.driver.longitude)
            : (d.baseLongitude && Number(d.baseLongitude) !== 0 ? Number(d.baseLongitude) : null));
      
      if (displayLat === null || displayLng === null) {
        const fallback = resolveSriLankanCoordinates(d.baseAddress);
        displayLat = fallback.latitude;
        displayLng = fallback.longitude;
      }

      const locationType = ((d.latitude && Number(d.latitude) !== 0) || (d.driver?.latitude && Number(d.driver.latitude) !== 0)) ? 'live_location' : 'mother_location';

      // Distance from pickup location to driver location in KM
      let calculatedDistance: number | null = null;
      if (d.dataValues?.distance !== undefined && d.dataValues.distance !== null) {
        calculatedDistance = Number(Number(d.dataValues.distance).toFixed(2));
      } else if (d.distance !== undefined && d.distance !== null) {
        calculatedDistance = Number(Number(d.distance).toFixed(2));
      } else if (finalLat !== null && finalLng !== null && displayLat && displayLng) {
        calculatedDistance = calculateHaversineDistanceKm(finalLat, finalLng, displayLat, displayLng);
      }

      // Phone number privacy before booking acceptance:
      const phoneDisplay = d.showMobileNum ? (d.mobileNum || d.driver?.phoneNumber) : "Hidden until request accepted";

      const plateNum = d.vehicleRegNum || d.dataValues?.vehicleRegNum || "";

      return {
        id: d.id,
        vehicleId: d.id,
        driverUserId: d.userId,
        driverName: d.driver?.name || "Driver",
        driverPhone: phoneDisplay,
        phoneNumber: phoneDisplay,
        mobileNum: phoneDisplay,
        driverAvatar: d.driver?.avatar || null,
        vehicleRegNum: plateNum,
        plateNumber: plateNum,
        vehicleNumber: plateNum,
        color: d.color || d.dataValues?.color,
        isActive: isDriverActuallyOnline,
        isOnline: isDriverActuallyOnline,
        lastActiveAt: d.updatedAt || null,
        isWaiting: Boolean(d.isWaiting),
        waitingFare,
        locationType,
        // Standard coordinates for mobile & map rendering
        latitude: displayLat,
        longitude: displayLng,
        lat: displayLat,
        lng: displayLng,
        displayedLatitude: displayLat,
        displayedLongitude: displayLng,
        motherAddress: d.baseAddress,
        motherLatitude: d.baseLatitude || displayLat,
        motherLongitude: d.baseLongitude || displayLng,
        pickupFare,
        baseFare,
        ratePerKm,
        fullEstimatedBill: fullFare,
        estimatedFare: fullFare,
        fare: fullFare,
        fareAmount: fullFare,
        fullFare,
        fullBill: fullFare,
        distance: calculatedDistance,
        distanceKm: calculatedDistance,
        tripDistance: tripDistFormatted,
        approvalStatus: d.approvalStatus || 'approved',
        type: d.vehicleType?.type || 'Taxi',
        category: d.vehicleType?.category || 'hire',
        seats: d.vehicleType?.seats || 3,
        driver: d.driver ? {
          id: d.driver.id,
          name: d.driver.name,
          avatar: d.driver.avatar,
          phoneNumber: phoneDisplay,
        } : null,
        vehicleType: d.vehicleType ? {
          id: d.vehicleType.id,
          type: d.vehicleType.type,
          category: d.vehicleType.category,
          seats: d.vehicleType.seats || 3,
          baseFare: d.vehicleType.baseFare,
          ratePerKm: d.vehicleType.ratePerKm,
        } : null,
      };
    });

    // Hard ceiling safety filter: strictly exclude any vehicle where distance > 25km or distance is null
    const nearbyResults = results.filter((item) => {
      if (item.distance !== null && item.distance !== undefined) {
        return item.distance <= 25;
      }
      return false;
    });

    // Sort by user preference or default to rate (lowest rate/km to highest: rate eka adu eke idan wadi ekata)
    const sortBy = (query.sortBy as string)?.toLowerCase() || "rate";

    nearbyResults.sort((a, b) => {
      if (sortBy === "distance") {
        const distA = a.distance !== null && a.distance !== undefined ? a.distance : 999999;
        const distB = b.distance !== null && b.distance !== undefined ? b.distance : 999999;
        if (distA !== distB) return distA - distB;
        return (a.ratePerKm || 0) - (b.ratePerKm || 0);
      }

      if (sortBy === "fare" || sortBy === "price" || sortBy === "totalfare" || sortBy === "bill") {
        const fareA = a.fullFare !== null && a.fullFare !== undefined ? a.fullFare : 999999;
        const fareB = b.fullFare !== null && b.fullFare !== undefined ? b.fullFare : 999999;
        if (fareA !== fareB) return fareA - fareB;
        return (a.distance ?? 999999) - (b.distance ?? 999999);
      }

      // Default: 'rate' (rate eka adu eke idan wadi ekata - Rate Per KM ascending)
      const rateA = a.ratePerKm !== null && a.ratePerKm !== undefined ? a.ratePerKm : 999999;
      const rateB = b.ratePerKm !== null && b.ratePerKm !== undefined ? b.ratePerKm : 999999;
      if (rateA !== rateB) return rateA - rateB;

      // If rates are identical, sort by full fare / estimated fare ASC
      const fareA = a.fullFare !== null && a.fullFare !== undefined ? a.fullFare : 999999;
      const fareB = b.fullFare !== null && b.fullFare !== undefined ? b.fullFare : 999999;
      if (fareA !== fareB) return fareA - fareB;

      // If still identical, closest driver first (distance ASC)
      const distA = a.distance !== null && a.distance !== undefined ? a.distance : 999999;
      const distB = b.distance !== null && b.distance !== undefined ? b.distance : 999999;
      return distA - distB;
    });

    return res.json({ 
      success: true, 
      count: nearbyResults.length,
      tripDistance: Number(tripDistance.toFixed(2)),
      routeGeometry: tripGeometry,
      isRoadDistance,
      routeSource,
      data: nearbyResults 
    });
  } catch (err: any) {
    console.error("GET AVAILABLE RIDES ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error retrieving available rides", error: err?.message });
  }
}

// -------------------------------------------------------------
// Auto-Timeout & Expiration Management (PickMe / Uber style)
// -------------------------------------------------------------

export const activeBookingTimeouts = new Map<string, NodeJS.Timeout>();

export function clearBookingTimeout(bookingId: string) {
  const timer = activeBookingTimeouts.get(bookingId);
  if (timer) {
    clearTimeout(timer);
    activeBookingTimeouts.delete(bookingId);
    console.log(`⏱️ [AutoTimeout] Cleared timer for booking ${bookingId}`);
  }
}

export function scheduleBookingTimeout(bookingId: string, vehicleId?: string | null, timeoutMs = 45000) {
  clearBookingTimeout(bookingId);

  console.log(`⏱️ [AutoTimeout] Scheduled ${timeoutMs / 1000}s auto-timeout for booking ${bookingId}`);

  const timer = setTimeout(async () => {
    activeBookingTimeouts.delete(bookingId);
    try {
      const booking = await db.VehicleBooking.findByPk(bookingId, {
        include: [{ model: db.Vehicle, as: "vehicle" }],
      });

      // Only auto-cancel if still pending
      if (!booking || booking.status !== "pending") {
        return;
      }

      console.log(`⏰ [AutoTimeout] Booking ${bookingId} expired with no driver acceptance. Auto-cancelling...`);

      await booking.update({
        status: "cancelled",
        cancellationReason: "timeout_no_driver_accepted",
      });

      const io = getIO();
      const cancelPayload = {
        bookingId: booking.id,
        status: "cancelled",
        reason: "Ride request timed out (no driver accepted)",
        cancellationReason: "timeout_no_driver_accepted",
        cancelledBy: "system"
      };

      if (io) {
        // 1. Tell all nearby drivers to remove this request from their screens & stop ringing
        io.to("nearby_drivers").emit("ride_request_cancelled", cancelPayload);
        io.to("nearby_drivers").emit("ride_request_taken", { bookingId: booking.id });
        io.to("nearby_drivers").emit("ride_request_expired", cancelPayload);

        // 2. Tell targeted vehicle/driver if any
        const targetVehicleId = vehicleId || booking.vehicleId;
        if (targetVehicleId) {
          io.to(`driver_${targetVehicleId}`).emit("ride_request_cancelled", cancelPayload);
          io.to(`driver_${targetVehicleId}`).emit("ride_request_taken", { bookingId: booking.id });
          io.to(`driver_${targetVehicleId}`).emit("ride_request_expired", cancelPayload);
        }

        const vehicleUserId = (booking as any).vehicle?.userId;
        if (vehicleUserId) {
          io.to(`driver_${vehicleUserId}`).emit("ride_request_cancelled", cancelPayload);
          io.to(vehicleUserId).emit("ride_request_cancelled", cancelPayload);
          io.to(`user_${vehicleUserId}`).emit("ride_request_cancelled", cancelPayload);
        }

        // 3. Notify passenger
        const passengerPayload = {
          ...cancelPayload,
          message: "No drivers accepted your ride request. Please try again.",
        };
        io.to(`booking_${booking.id}`).emit("ride_timeout", passengerPayload);
        io.to(`booking_${booking.id}`).emit("ride_cancelled", passengerPayload);
        io.to(`booking_${booking.id}`).emit("ride_status_updated", passengerPayload);

        if (booking.userId) {
          io.to(`user_${booking.userId}`).emit("ride_timeout", passengerPayload);
          io.to(booking.userId).emit("ride_timeout", passengerPayload);
        }
      }

      // 4. Send Firebase Push Notification to passenger
      if (booking.userId) {
        await sendNotificationToUser(
          booking.userId,
          "No Drivers Available 🚕",
          "No nearby drivers accepted your ride request. Please try searching again.",
          {
            type: "TAXI_BOOKING_TIMEOUT",
            bookingId: String(booking.id),
            status: "cancelled",
            cancellationReason: "timeout_no_driver_accepted",
          },
          booking.userId
        ).catch((notifErr) => console.warn("⚠️ Passenger timeout notification warning:", notifErr));
      }
    } catch (timeoutErr) {
      console.error("❌ Error handling booking timeout:", timeoutErr);
    }
  }, timeoutMs);

  activeBookingTimeouts.set(bookingId, timer);
}

export async function cleanupStaleBookings() {
  try {
    const staleThreshold = new Date(Date.now() - 60 * 1000); // Older than 60s
    const staleBookings = await db.VehicleBooking.findAll({
      where: {
        status: "pending",
        createdAt: { [Op.lt]: staleThreshold }
      }
    });

    for (const b of staleBookings) {
      clearBookingTimeout(b.id);
      await b.update({
        status: "cancelled",
        cancellationReason: "timeout_no_driver_accepted"
      });
      try {
        const io = getIO();
        io?.to("nearby_drivers").emit("ride_request_expired", { bookingId: b.id });
        io?.to("nearby_drivers").emit("ride_request_taken", { bookingId: b.id });
        if (b.vehicleId) {
          io?.to(`driver_${b.vehicleId}`).emit("ride_request_expired", { bookingId: b.id });
          io?.to(`driver_${b.vehicleId}`).emit("ride_request_taken", { bookingId: b.id });
        }
        io?.to("admin_room").emit("ride_cancelled", {
          bookingId: b.id,
          reason: "timeout_no_driver_accepted"
        });

        // Notify passenger so their app screen does not hang indefinitely
        io?.to(`booking_${b.id}`).emit("ride_timeout", {
          bookingId: b.id,
          status: "cancelled",
          reason: "timeout_no_driver_accepted",
          message: "No drivers accepted the ride within time. Please try searching again."
        });
        io?.to(`booking_${b.id}`).emit("ride_cancelled", {
          bookingId: b.id,
          status: "cancelled",
          reason: "timeout_no_driver_accepted"
        });
        if (b.userId) {
          io?.to(`user_${b.userId}`).emit("ride_timeout", {
            bookingId: b.id,
            status: "cancelled",
            reason: "timeout_no_driver_accepted"
          });
          io?.to(`user_${b.userId}`).emit("ride_cancelled", {
            bookingId: b.id,
            status: "cancelled",
            reason: "timeout_no_driver_accepted"
          });
          sendNotificationToUser(
            b.userId,
            "No Drivers Available 🚕",
            "No nearby drivers accepted your ride request. Please try searching again.",
            {
              type: "TAXI_BOOKING_TIMEOUT",
              bookingId: String(b.id),
              status: "cancelled",
              cancellationReason: "timeout_no_driver_accepted",
            },
            b.userId
          ).catch(() => {});
        }
      } catch (sockErr) {
        console.warn("⚠️ Stale booking socket emit warning:", sockErr);
      }
    }

    if (staleBookings.length > 0) {
      console.log(`🧹 [AutoTimeout] Cleaned up ${staleBookings.length} stale pending bookings`);
    }

    // Auto-cancel abandoned active trips older than 12 hours so drivers aren't blocked forever
    const abandonedThreshold = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const [abandonedCount] = await db.VehicleBooking.update(
      {
        status: "cancelled",
        cancellationReason: "auto_expired_abandoned_inactivity"
      },
      {
        where: {
          status: { [Op.in]: ["accepted", "arrived", "in_transit"] },
          updatedAt: { [Op.lt]: abandonedThreshold }
        }
      }
    );
    if (abandonedCount > 0) {
      console.log(`🧹 [AutoTimeout] Cleaned up ${abandonedCount} abandoned uncompleted bookings older than 12h`);
    }
  } catch (err) {
    console.warn("⚠️ [AutoTimeout] Stale bookings cleanup warning:", err);
  }
}

export async function cleanupStaleDrivers() {
  try {
    // 60 minutes without any GPS update, app ping or heartbeat
    const staleDriverThreshold = new Date(Date.now() - 60 * 60 * 1000);
    const [affectedCount] = await db.Vehicle.update(
      { isActive: false },
      {
        where: {
          isActive: true,
          updatedAt: { [Op.lt]: staleDriverThreshold }
        }
      }
    );
    if (affectedCount > 0) {
      console.log(`🧹 [AutoOffline] Marked ${affectedCount} inactive/ghost drivers offline (>60 min without GPS update)`);
      try {
        getIO()?.to("admin_room").emit("drivers_status_updated", { autoOfflinedCount: affectedCount });
      } catch (_) {}
    }
  } catch (err) {
    console.warn("⚠️ [AutoOffline] Stale drivers cleanup warning:", err);
  }
}

// Initial cleanup on module load & periodic background check every 2 minutes
cleanupStaleBookings().catch(() => {});
cleanupStaleDrivers().catch(() => {});
setInterval(() => {
  cleanupStaleBookings().catch(() => {});
  cleanupStaleDrivers().catch(() => {});
}, 2 * 60 * 1000);

// -------------------------------------------------------------
// Booking Flow Controllers
// -------------------------------------------------------------

export async function bookRide(req: AuthRequest, res: Response) {
  try {
    const b = req.body || {};
    const rawPickupLat = b.pickupLat ?? b.pickupLatitude ?? b.pickup_lat ?? b.pickup_latitude ?? b.lat ?? b.latitude;
    const rawPickupLng = b.pickupLng ?? b.pickupLongitude ?? b.pickup_lng ?? b.pickup_longitude ?? b.lng ?? b.longitude;
    const rawDropLat = b.dropLat ?? b.dropLatitude ?? b.dropoffLat ?? b.dropoffLatitude ?? b.drop_lat ?? b.drop_latitude ?? b.destinationLat ?? b.toLat;
    const rawDropLng = b.dropLng ?? b.dropLongitude ?? b.dropoffLng ?? b.dropoffLongitude ?? b.drop_lng ?? b.drop_longitude ?? b.destinationLng ?? b.toLng;

    if (
      rawPickupLat === undefined || rawPickupLat === null || rawPickupLat === "" || isNaN(Number(rawPickupLat)) ||
      rawPickupLng === undefined || rawPickupLng === null || rawPickupLng === "" || isNaN(Number(rawPickupLng))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid pickup coordinates (pickupLat, pickupLng) are required to book a ride."
      });
    }

    const finalPickupLat = Number(rawPickupLat);
    const finalPickupLng = Number(rawPickupLng);

    const finalDropLat = rawDropLat !== undefined && rawDropLat !== null && rawDropLat !== "" && !isNaN(Number(rawDropLat)) ? Number(rawDropLat) : finalPickupLat;
    const finalDropLng = rawDropLng !== undefined && rawDropLng !== null && rawDropLng !== "" && !isNaN(Number(rawDropLng)) ? Number(rawDropLng) : finalPickupLng;

    const finalPickupAddress = b.pickupAddress || b.originAddress || b.fromAddress || "Current Location";
    const finalDropAddress = b.dropAddress || b.dropoffAddress || b.destinationAddress || b.toAddress || "Destination";

    const rawDistance = b.distance ?? b.distanceKm ?? b.tripDistance;
    let calculatedDistance = rawDistance !== undefined && rawDistance !== null && rawDistance !== "" ? Number(rawDistance) : 0;
    let tripGeometry: any = null;

    if (calculatedDistance <= 0 && (finalPickupLat !== finalDropLat || finalPickupLng !== finalDropLng)) {
      const routeResult = await getDrivingRoute(finalPickupLat, finalPickupLng, finalDropLat, finalDropLng);
      calculatedDistance = routeResult.distanceKm;
      tripGeometry = routeResult.geometry;
    }

    // Graceful fallback for distance: default to minimum 1 km if calculated distance is zero or missing
    if (calculatedDistance < 0.05) {
      calculatedDistance = 1.0;
    }

    const vehicleId = b.vehicleId || null;
    let targetVehicle: any = null;

    if (vehicleId) {
      targetVehicle = await db.Vehicle.findByPk(vehicleId, {
        include: [{ model: db.VehicleType, as: "vehicleType" }]
      });
      if (!targetVehicle) {
        return res.status(404).json({ success: false, message: "Selected vehicle not found" });
      }
      // If vehicle is approved, allow direct request and re-activate if idle
      if (targetVehicle.approvalStatus !== "approved") {
        return res.status(400).json({
          success: false,
          message: "Selected vehicle is not approved for service."
        });
      }
      // Validate distance: Selected driver must be within 25km of pickup location
      const vLat = Number(targetVehicle.latitude) || Number(targetVehicle.baseLatitude) || 0;
      const vLng = Number(targetVehicle.longitude) || Number(targetVehicle.baseLongitude) || 0;
      if (vLat && vLng && finalPickupLat && finalPickupLng) {
        const distToVehicle = calculateHaversineDistanceKm(finalPickupLat, finalPickupLng, vLat, vLng);
        if (distToVehicle > 150) {
          return res.status(400).json({
            success: false,
            message: `Selected driver is too far from your pickup location (${distToVehicle.toFixed(1)} km away).`
          });
        }
      }
      // Prevent passenger from booking their own vehicle
      if (targetVehicle.userId === req.user!.userId) {
        return res.status(400).json({ success: false, message: "You cannot book your own vehicle. Please select another driver." });
      }
      // Check: Is target vehicle currently on another trip?
      const busyBooking = await db.VehicleBooking.findOne({
        where: {
          vehicleId: targetVehicle.id,
          status: { [Op.in]: ["accepted", "arrived", "in_transit"] }
        }
      });
      if (busyBooking) {
        return res.status(409).json({
          success: false,
          message: "This driver is currently on another trip. Please choose another vehicle."
        });
      }
    }

    // Fare calculation & anti-tampering check
    const rawFare = b.estimatedFare ?? b.fare ?? b.totalFare ?? b.bidFare;
    let finalFare = rawFare !== undefined && rawFare !== null && rawFare !== "" ? Number(rawFare) : 0;

    let computedMinimumFare = 100;
    if (targetVehicle) {
      const bFare = targetVehicle.baseFare !== null && targetVehicle.baseFare !== undefined ? Number(targetVehicle.baseFare) : (targetVehicle.vehicleType?.baseFare || 100);
      const rPerKm = targetVehicle.ratePerKm !== null && targetVehicle.ratePerKm !== undefined ? Number(targetVehicle.ratePerKm) : (targetVehicle.vehicleType?.ratePerKm || 80);
      const pFare = targetVehicle.pickupFare !== null && targetVehicle.pickupFare !== undefined ? Number(targetVehicle.pickupFare) : 0;
      computedMinimumFare = calculateTaxiFare(calculatedDistance, bFare, rPerKm, pFare);
    } else {
      computedMinimumFare = Math.round(100 + (calculatedDistance * 80)); // Default base 100 + 80/km
    }

    const minFloor = targetVehicle ? (Number(targetVehicle.baseFare) || Number(targetVehicle.vehicleType?.baseFare) || 100) : 50;
    if (finalFare <= 0 || finalFare < minFloor) {
      finalFare = computedMinimumFare;
    }

    // Check: Does passenger already have an active ongoing trip?
    const passengerActiveTrip = await db.VehicleBooking.findOne({
      where: {
        userId: req.user!.userId,
        status: { [Op.in]: ["accepted", "arrived", "in_transit"] }
      }
    });
    if (passengerActiveTrip) {
      // Auto-cancel if it's an abandoned stale trip older than 2 hours
      const tripAgeHours = (Date.now() - new Date(passengerActiveTrip.createdAt).getTime()) / (1000 * 60 * 60);
      if (tripAgeHours > 2) {
        await passengerActiveTrip.update({ status: "cancelled", cancellationReason: "Auto-cleared stale ongoing trip" });
      } else {
        return res.status(409).json({
          success: false,
          message: "You already have an active ride in progress. Please complete or cancel it before booking a new ride."
        });
      }
    }

    // Clean up any previous pending bookings by this passenger (cancels duplicate pending spam)
    const existingPending = await db.VehicleBooking.findAll({
      where: {
        userId: req.user!.userId,
        status: "pending"
      }
    });
    for (const prev of existingPending) {
      clearBookingTimeout(prev.id);
      await prev.update({
        status: "cancelled",
        cancellationReason: "Superseded by new ride request"
      });
      try {
        const io = getIO();
        io?.to("nearby_drivers").emit("ride_request_cancelled", { bookingId: prev.id, reason: "Superseded" });
        io?.to("nearby_drivers").emit("ride_request_taken", { bookingId: prev.id });
        if (prev.vehicleId) {
          io?.to(`driver_${prev.vehicleId}`).emit("ride_request_cancelled", { bookingId: prev.id, reason: "Superseded" });
          io?.to(`driver_${prev.vehicleId}`).emit("ride_request_taken", { bookingId: prev.id });
        }
        io?.to("admin_room").emit("ride_cancelled", { bookingId: prev.id, reason: "Superseded by new ride request" });
      } catch (sockE) {}
    }

    const booking = await db.VehicleBooking.create({
      userId: req.user!.userId,
      vehicleId: vehicleId || null,
      pickupLat: finalPickupLat,
      pickupLng: finalPickupLng,
      dropLat: finalDropLat,    
      dropLng: finalDropLng,     
      pickupAddress: finalPickupAddress, 
      dropAddress: finalDropAddress,    
      distance: calculatedDistance,
      fare: finalFare,
      status: 'pending'
    });

    // Target nearby online drivers specifically within 15km - 25km instead of blasting all drivers nationwide
    let nearbyVehicles: any[] = [];
    if (!vehicleId) {
      nearbyVehicles = await getNearbyDrivers(finalPickupLat, finalPickupLng, 15, undefined, undefined, true, req.user!.userId);
      if (!nearbyVehicles || nearbyVehicles.length === 0) {
        nearbyVehicles = await getNearbyDrivers(finalPickupLat, finalPickupLng, 25, undefined, undefined, true, req.user!.userId);
      }
    }

    // Real-Time Socket.io Dispatch targeted directly to nearby drivers & admin
    try {
      const io = getIO();
      const socketPayload = {
        bookingId: booking.id,
        pickupLat: finalPickupLat,
        pickupLng: finalPickupLng,
        pickupAddress: finalPickupAddress,
        dropLat: finalDropLat,
        dropLng: finalDropLng,
        dropAddress: finalDropAddress,
        distance: calculatedDistance,
        fare: finalFare,
        passengerId: req.user!.userId,
        createdAt: booking.createdAt,
      };

      if (vehicleId && targetVehicle) {
        io?.to(`driver_${vehicleId}`).emit("new_ride_request", socketPayload);
        if (targetVehicle.userId) {
          io?.to(`driver_${targetVehicle.userId}`).emit("new_ride_request", socketPayload);
          io?.to(`user_${targetVehicle.userId}`).emit("new_ride_request", socketPayload);
        }
      } else {
        // Emit ONLY to actual nearby drivers discovered in the 15km/25km radius (excluding requester's own vehicle)
        for (const v of nearbyVehicles) {
          if (v.userId === req.user!.userId) continue;
          if (v.id) io?.to(`driver_${v.id}`).emit("new_ride_request", socketPayload);
          if (v.userId) {
            io?.to(`driver_${v.userId}`).emit("new_ride_request", socketPayload);
            io?.to(`user_${v.userId}`).emit("new_ride_request", socketPayload);
          }
        }
      }
      // Always inform dispatch admin room
      io?.to("admin_room").emit("new_ride_request", socketPayload);
    } catch (sockErr) {
      console.warn("⚠️ Ride Socket Dispatch warning:", sockErr);
    }

    // Notify Driver(s) via Firebase Push Notification
    (async () => {
      try {
        if (vehicleId && targetVehicle) {
          if (targetVehicle.userId) {
            await sendNotificationToUser(
              targetVehicle.userId,
              "New Taxi Request! 🚕",
              `You have a new ride request from ${finalPickupAddress}.`,
              {
                type: "TAXI_BOOKING_REQUEST",
                bookingId: String(booking.id),
                pickupAddress: finalPickupAddress,
                dropAddress: finalDropAddress,
                fare: String(finalFare),
                distance: String(calculatedDistance)
              },
              req.user!.userId
            );
          }
        } else {
          // Open broadcast booking: notify nearby active approved drivers
          for (const v of nearbyVehicles) {
            if (v.userId && v.userId !== req.user!.userId) {
              await sendNotificationToUser(
                v.userId,
                "New Ride Request Nearby! 🚕",
                `Ride request near you from ${finalPickupAddress} (Fare: Rs. ${finalFare})`,
                {
                  type: "TAXI_BOOKING_BROADCAST",
                  bookingId: String(booking.id),
                  pickupAddress: finalPickupAddress,
                  dropAddress: finalDropAddress,
                  fare: String(finalFare),
                  distance: String(calculatedDistance)
                },
                req.user!.userId
              ).catch(() => {});
            }
          }
        }
      } catch (notifyErr) {
        console.error("❌ Driver Notification Error:", notifyErr);
      }
    })();

    // Start 45-second auto-timeout timer for this booking
    scheduleBookingTimeout(booking.id, vehicleId, 45000);

    return res.status(201).json({ 
      success: true, 
      message: vehicleId ? "Ride request sent to driver successfully!" : "Ride request broadcast to nearby drivers!",
      data: {
        ...(typeof booking.toJSON === "function" ? booking.toJSON() : booking),
        routeGeometry: tripGeometry
      }
    });
  } catch (err) {
    console.error("BOOK RIDE ERROR:", err);
    return res.status(500).json({ success: false, message: "Booking failed" });
  }
}

export async function acceptBooking(req: AuthRequest, res: Response) {
  const transaction = await sequelize.transaction();
  try {
    const { bookingId } = req.params;
    const { vehicleId } = req.body;

    // Concurrency Protection: Row lock ensures only ONE driver can accept this ride
    const booking = await db.VehicleBooking.findOne({
      where: { id: bookingId, status: "pending" },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "Ride has already been accepted by another driver or cancelled",
      });
    }

    // Verify driver's registered vehicle belongs to logged-in user
    const driverVehicle = await db.Vehicle.findOne({
      where: { userId: req.user!.userId },
      transaction,
    });

    if (!driverVehicle) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "No registered vehicle found for your driver account" });
    }

    if (driverVehicle.approvalStatus !== "approved") {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: "Your vehicle is pending approval or suspended" });
    }

    // Prevent driver from accepting a ride requested by themselves
    if (booking.userId === req.user!.userId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "You cannot accept your own ride request" });
    }

    // If passenger requested a specific vehicle directly, only that vehicle's driver can accept
    if (booking.vehicleId && booking.vehicleId !== driverVehicle.id) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: "This ride was requested specifically for another driver" });
    }

    const driverVehicleId = driverVehicle.id;

    // Check if driver or vehicle already has an ongoing active trip!
    const existingActiveRide = await db.VehicleBooking.findOne({
      where: {
        vehicleId: driverVehicleId,
        id: { [Op.ne]: bookingId },
        status: { [Op.in]: ["accepted", "arrived", "in_transit"] }
      },
      transaction
    });

    if (existingActiveRide) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "You already have an active ongoing trip in progress. Please complete or cancel it before accepting another ride."
      });
    }

    await booking.update({ status: "accepted", vehicleId: driverVehicleId }, { transaction });
    await transaction.commit();

    // Clear auto-timeout timer immediately
    clearBookingTimeout(bookingId);

    const updatedBooking = await db.VehicleBooking.findByPk(bookingId, {
      include: [
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            {
              model: db.User,
              as: "driver",
              attributes: ["id", "name", "email", "avatar", "phoneNumber"],
            },
          ],
        },
      ],
    });

    // Reveal FULL contact details to passenger upon acceptance
    const bookingJson: any = updatedBooking ? (updatedBooking as any).toJSON() : {};
    const vehicleData = bookingJson.vehicle;
    const driverContact = {
      driverName: vehicleData?.driver?.name,
      phoneNumber: vehicleData?.mobileNum || vehicleData?.driver?.phoneNumber,
      vehicleRegNum: vehicleData?.vehicleRegNum,
      color: vehicleData?.color,
      pickupFare: vehicleData?.pickupFare,
      baseFare: vehicleData?.baseFare,
      ratePerKm: vehicleData?.ratePerKm,
      latitude: vehicleData?.latitude,
      longitude: vehicleData?.longitude,
    };

    // Real-Time Socket.io Events:
    try {
      const io = getIO();
      // 1. Tell all other nearby drivers to remove this request from their screens
      io?.to("nearby_drivers").emit("ride_request_taken", { bookingId });
      // 2. Notify passenger in the booking room that driver accepted
      io?.to(`booking_${bookingId}`).emit("ride_accepted", {
        bookingId,
        status: "accepted",
        contact: driverContact,
        vehicle: {
          id: driverVehicleId,
          latitude: vehicleData?.latitude,
          longitude: vehicleData?.longitude,
        },
      });
    } catch (sockErr) {
      console.warn("⚠️ Accept Booking Socket warning:", sockErr);
    }

    // Notify Passenger via Firebase Push Notification
    (async () => {
      try {
        if (booking.userId) {
          await sendNotificationToUser(
            booking.userId,
            "Ride Accepted! 🚕",
            `Driver ${driverContact.driverName || "assigned"} has accepted your ride request.`,
            {
              type: "TAXI_BOOKING_ACCEPTED",
              bookingId: String(bookingId),
              driverName: String(driverContact.driverName || ""),
              driverPhone: String(driverContact.phoneNumber || ""),
              vehicleRegNum: String(driverContact.vehicleRegNum || ""),
            },
            req.user!.userId
          );
        }
      } catch (notifyErr) {
        console.error("❌ Passenger Acceptance Notification Error:", notifyErr);
      }
    })();

    return res.json({
      success: true,
      message: "Ride accepted! Driver contact revealed.",
      data: updatedBooking,
      contact: driverContact,
    });
  } catch (err: any) {
    await transaction.rollback().catch(() => {});
    console.error("ACCEPT BOOKING ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Constructs an itemized official bill / receipt for a vehicle booking.
 */
export function buildBookingReceipt(booking: any) {
  const vehicle = booking.vehicle;
  const vehicleType = vehicle?.vehicleType;
  const driver = vehicle?.driver;
  const passenger = booking.passenger;

  const vBaseFare = Number(vehicle?.baseFare) || Number(vehicleType?.baseFare) || 100;
  const vRatePerKm = Number(vehicle?.ratePerKm) || Number(vehicleType?.ratePerKm) || 80;
  const vPickupFare = Number(vehicle?.pickupFare) || 0;
  const vWaitingRate = Number(vehicle?.waitingFare) || 10;

  const distanceKm = Number(booking.distance) || 0;
  const distanceFare = Math.round(distanceKm * vRatePerKm);

  let finalWaitingMinutes = Number(booking.waitingMinutes) || 0;
  if (booking.isWaiting && booking.waitingStartedAt) {
    const elapsedMinutes = Math.max(0, Math.round(((Date.now() - new Date(booking.waitingStartedAt).getTime()) / 60000) * 10) / 10);
    finalWaitingMinutes = Math.round((finalWaitingMinutes + elapsedMinutes) * 10) / 10;
  }
  const waitingFare = Number(booking.waitingFare) || Math.round(finalWaitingMinutes * vWaitingRate);

  const totalFare = Number(booking.fare) || Math.round(vBaseFare + distanceFare + vPickupFare + waitingFare);
  const companyCommission = Number(booking.companyCommission) || Math.round(totalFare * 0.10);
  const driverEarnings = Number(booking.driverEarnings) || Math.round(totalFare - companyCommission);

  return {
    bookingId: booking.id,
    invoiceNo: `INV-${booking.id.substring(0, 8).toUpperCase()}`,
    status: booking.status,
    pickupAddress: booking.pickupAddress || "Pickup location",
    dropAddress: booking.dropAddress || "Destination",
    pickupCoordinates: { lat: booking.pickupLat, lng: booking.pickupLng },
    dropCoordinates: { lat: booking.dropLat, lng: booking.dropLng },
    distanceKm: Math.round(distanceKm * 10) / 10,
    baseFare: Math.round(vBaseFare),
    ratePerKm: Math.round(vRatePerKm),
    pickupFare: Math.round(vPickupFare),
    distanceFare,
    waitingMinutes: Math.round(finalWaitingMinutes * 10) / 10,
    waitingRatePerMin: Math.round(vWaitingRate),
    waitingFare: Math.round(waitingFare),
    subTotal: Math.round(totalFare),
    discount: 0,
    totalFare: Math.round(totalFare),
    companyCommission: Math.round(companyCommission),
    driverEarnings: Math.round(driverEarnings),
    paymentMethod: booking.paymentMethod || "cash",
    paymentStatus: booking.paymentStatus || (booking.status === "completed" ? "paid" : "pending"),
    passenger: passenger ? {
      id: passenger.id,
      name: passenger.name || "Passenger",
      phoneNumber: passenger.phoneNumber || "—",
      email: passenger.email || "—",
      avatar: passenger.avatar || null
    } : null,
    driver: driver ? {
      id: driver.id,
      name: driver.name || "Driver",
      phoneNumber: driver.phoneNumber || vehicle?.mobileNum || "—",
      vehicleRegNum: vehicle?.vehicleRegNum || "—",
      vehicleType: vehicleType?.type || "Taxi",
      color: vehicle?.color || "—"
    } : null,
    createdAt: booking.createdAt,
    completedAt: booking.updatedAt || new Date().toISOString()
  };
}

export async function updateBookingStatus(req: AuthRequest, res: Response) {
  try {
    const { bookingId } = req.params;
    let { status, cancellationReason, reason } = req.body; // 'accepted', 'arrived', 'in_transit', 'completed', 'cancelled'

    if (status === "started" || status === "ongoing") {
      status = "in_transit";
    }

    const booking = await db.VehicleBooking.findByPk(bookingId, {
      include: [
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            { model: db.VehicleType, as: "vehicleType" },
            { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber", "avatar"] }
          ]
        },
        {
          model: db.User,
          as: "passenger",
          attributes: ["id", "name", "email", "phoneNumber", "avatar"]
        }
      ]
    });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // If it's already cancelled, return gracefully
    if (booking.status === "cancelled") {
      return res.json({ success: true, message: "Booking is already cancelled", data: booking });
    }

    const actorId = req.user!.userId;
    const passengerUserId = booking.userId;
    const vehicleUserId = (booking as any).vehicle?.userId;
    const userRole = (req.user as any).role || "";
    const isAdmin = ["admin", "superadmin", "agent"].includes(userRole);

    // Security Check: Only the passenger, assigned driver, or admin can update this booking
    if (!isAdmin && actorId !== passengerUserId && actorId !== vehicleUserId) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this booking" });
    }

    // Role-specific transition guards
    if (!isAdmin) {
      if (["arrived", "in_transit", "completed"].includes(status) && actorId !== vehicleUserId) {
        return res.status(403).json({ success: false, message: "Only the assigned driver can update trip progress" });
      }
      if (status === "cancelled" && booking.status === "in_transit" && actorId === passengerUserId) {
        return res.status(400).json({ success: false, message: "Cannot cancel a trip while in transit. Please contact support or your driver." });
      }
    }

    let companyCommission = (booking as any).companyCommission || 0;
    let driverEarnings = (booking as any).driverEarnings || 0;
    let paymentStatus = (booking as any).paymentStatus || "pending";
    let finalBill: any = null;

    if (status === "completed") {
      const vehicle = (booking as any).vehicle;
      const vehicleType = vehicle?.vehicleType;

      const vBaseFare = Number(vehicle?.baseFare) || Number(vehicleType?.baseFare) || 100;
      const vRatePerKm = Number(vehicle?.ratePerKm) || Number(vehicleType?.ratePerKm) || 80;
      const vPickupFare = Number(vehicle?.pickupFare) || 0;
      const vWaitingRate = Number(vehicle?.waitingFare) || 10;

      // Actual distance (if driver/body provides updated distance or coordinates)
      let actualDistance = Number(booking.distance) || 0;
      const bodyDistance = req.body.actualDistance ?? req.body.distance ?? req.body.distanceKm;
      if (bodyDistance !== undefined && bodyDistance !== null && !isNaN(Number(bodyDistance)) && Number(bodyDistance) > 0) {
        actualDistance = Math.round(Number(bodyDistance) * 10) / 10;
      }

      // Final waiting time and charges calculation
      let finalWaitingMinutes = Number(booking.waitingMinutes) || 0;
      if (booking.isWaiting && booking.waitingStartedAt) {
        const elapsedMinutes = Math.max(0, Math.round(((Date.now() - new Date(booking.waitingStartedAt).getTime()) / 60000) * 10) / 10);
        finalWaitingMinutes = Math.round((finalWaitingMinutes + elapsedMinutes) * 10) / 10;
      }
      const finalWaitingFare = Math.round(finalWaitingMinutes * vWaitingRate);

      // Distance & Ride Fare
      const distanceFare = Math.round(actualDistance * vRatePerKm);

      // Total Final Bill calculation
      const initialBookedFare = Number(booking.fare) || 0;
      const calculatedFare = Math.round(vBaseFare + distanceFare + vPickupFare + finalWaitingFare);
      let finalFare = Math.max(calculatedFare, Math.round(initialBookedFare + finalWaitingFare));
      if (finalFare <= 0) finalFare = Math.max(vBaseFare, 100);

      let commissionRate = 0.10; // Default 10% platform commission
      try {
        const commSetting = await db.SystemSetting.findOne({ where: { key: "platformCommissionFee" } });
        if (commSetting && commSetting.value !== undefined && commSetting.value !== null && !isNaN(Number(commSetting.value))) {
          commissionRate = Math.max(0, Math.min(100, Number(commSetting.value))) / 100;
        }
      } catch (_) {}

      companyCommission = Math.round(finalFare * commissionRate);
      driverEarnings = Math.round(finalFare - companyCommission);
      paymentStatus = "paid";

      await booking.update({
        status,
        distance: actualDistance,
        fare: finalFare,
        waitingMinutes: finalWaitingMinutes,
        waitingFare: finalWaitingFare,
        isWaiting: false,
        waitingStartedAt: null,
        companyCommission,
        driverEarnings,
        paymentStatus
      });

      // Reset driver vehicle waiting mode so it does not persist across future trips
      if (vehicle) {
        await vehicle.update({ isWaiting: false, waitingStartedAt: null }).catch(() => {});
      }

      finalBill = buildBookingReceipt(booking);
      finalBill.distanceKm = actualDistance;
      finalBill.baseFare = Math.round(vBaseFare);
      finalBill.ratePerKm = Math.round(vRatePerKm);
      finalBill.pickupFare = Math.round(vPickupFare);
      finalBill.distanceFare = distanceFare;
      finalBill.waitingMinutes = finalWaitingMinutes;
      finalBill.waitingRatePerMin = vWaitingRate;
      finalBill.waitingFare = finalWaitingFare;
      finalBill.subTotal = finalFare;
      finalBill.totalFare = finalFare;
      finalBill.companyCommission = companyCommission;
      finalBill.driverEarnings = driverEarnings;
    } else if (status === "cancelled") {
      // Clear any auto-timeout timer immediately
      clearBookingTimeout(bookingId);

      const finalReason = cancellationReason || reason || (actorId === passengerUserId ? "Cancelled by passenger" : "Cancelled by driver");
      await booking.update({
        status: "cancelled",
        cancellationReason: finalReason
      });
    } else {
      if (status === "accepted") {
        clearBookingTimeout(bookingId);
      }
      await booking.update({ status });
    }

    // Real-Time Socket.io Broadcast to the active trip room, drivers & admin room:
    try {
      const io = getIO();
      if (io) {
        const statusPayload = {
          bookingId,
          status,
          fare: booking.fare,
          paymentStatus,
          driverEarnings,
          companyCommission,
          cancellationReason: (booking as any).cancellationReason,
          bill: finalBill || undefined,
          updatedAt: new Date().toISOString(),
        };

        io.to(`booking_${bookingId}`).emit("ride_status_updated", statusPayload);
        io.to("admin_room").emit("ride_status_updated", statusPayload);

        if (status === "completed" || status === "cancelled") {
          const completionPayload = {
            bookingId,
            fare: booking.fare,
            paymentStatus,
            driverEarnings,
            companyCommission,
            cancellationReason: (booking as any).cancellationReason,
            bill: finalBill || undefined,
          };
          io.to(`booking_${bookingId}`).emit(status === "completed" ? "ride_completed" : "ride_cancelled", completionPayload);
          io.to("admin_room").emit(status === "completed" ? "ride_completed" : "ride_cancelled", completionPayload);
        }

        // CRITICAL: When cancelled, STOP the ringtone/popup on all drivers' devices!
        if (status === "cancelled") {
          const cancelPayload = {
            bookingId,
            status: "cancelled",
            reason: (booking as any).cancellationReason || "Ride request cancelled",
            cancelledBy: actorId === passengerUserId ? "passenger" : "driver"
          };

          // 1. Tell all nearby drivers to remove this request and stop ringing
          io.to("nearby_drivers").emit("ride_request_cancelled", cancelPayload);
          io.to("nearby_drivers").emit("ride_request_taken", { bookingId }); // Many driver apps listen to ride_request_taken to dismiss modal
          io.to("nearby_drivers").emit("ride_request_expired", cancelPayload);

          // 2. Tell specific vehicle/driver if requested
          if (booking.vehicleId) {
            io.to(`driver_${booking.vehicleId}`).emit("ride_request_cancelled", cancelPayload);
            io.to(`driver_${booking.vehicleId}`).emit("ride_request_taken", { bookingId });
            io.to(`driver_${booking.vehicleId}`).emit("ride_request_expired", cancelPayload);
          }
          if (vehicleUserId) {
            io.to(`driver_${vehicleUserId}`).emit("ride_request_cancelled", cancelPayload);
            io.to(vehicleUserId).emit("ride_request_cancelled", cancelPayload);
            io.to(`user_${vehicleUserId}`).emit("ride_request_cancelled", cancelPayload);
          }

          // 3. Passenger personal room
          if (passengerUserId) {
            io.to(`user_${passengerUserId}`).emit("ride_cancelled", cancelPayload);
            io.to(passengerUserId).emit("ride_cancelled", cancelPayload);
          }
        }
      }
    } catch (sockErr) {
      console.warn("⚠️ Ride Status Socket warning:", sockErr);
    }

    // Notify Passenger & Driver depending on status
    (async () => {
      try {
        const plateNum = (booking as any).vehicle?.vehicleRegNum || "Taxi";

        if (status === "arrived") {
          // Notify Passenger that driver has arrived
          if (passengerUserId) {
            await sendNotificationToUser(
              passengerUserId,
              "Driver Arrived 📍",
              `Your driver has arrived at the pickup location (${plateNum}).`,
              {
                type: "TAXI_BOOKING_STATUS_UPDATE",
                bookingId: String(bookingId),
                status: "arrived",
                vehicleRegNum: plateNum
              },
              actorId
            );
          }
        } else if (status === "in_transit") {
          // Notify Passenger that trip started
          if (passengerUserId) {
            await sendNotificationToUser(
              passengerUserId,
              "Trip Started 🚕",
              "Your trip has started. Have a safe journey!",
              {
                type: "TAXI_BOOKING_STATUS_UPDATE",
                bookingId: String(bookingId),
                status: "in_transit"
              },
              actorId
            );
          }
        } else if (status === "completed") {
          // 1. Notify Passenger with final fare
          if (passengerUserId) {
            await sendNotificationToUser(
              passengerUserId,
              "Trip Completed 🎉",
              `Your ride has completed. Total Fare: Rs. ${booking.fare}. Thank you for riding with Serve Family!`,
              {
                type: "TAXI_BOOKING_STATUS_UPDATE",
                bookingId: String(bookingId),
                status: "completed",
                fare: String(booking.fare),
                paymentStatus
              },
              actorId
            );
          }

          // 2. Notify Driver with earnings confirmation
          if (vehicleUserId) {
            await sendNotificationToUser(
              vehicleUserId,
              "Trip Completed! 💰",
              `Ride completed successfully. You earned Rs. ${driverEarnings} (Total Fare: Rs. ${booking.fare}).`,
              {
                type: "TAXI_BOOKING_STATUS_UPDATE",
                bookingId: String(bookingId),
                status: "completed",
                fare: String(booking.fare),
                driverEarnings: String(driverEarnings),
                paymentStatus
              },
              actorId
            );
          }

          // 3. Send Beautiful Email Receipt & Thank-You to Passenger
          try {
            let passengerEmail = (booking as any).passenger?.email;
            let passengerName = (booking as any).passenger?.name;
            if (!passengerEmail && passengerUserId) {
              const u = await db.User.findByPk(passengerUserId, { attributes: ["email", "name"] });
              if (u) {
                passengerEmail = u.email;
                if (!passengerName) passengerName = u.name;
              }
            }

            if (passengerEmail) {
              const vehicle = (booking as any).vehicle;
              sendRideReceiptEmail({
                toEmail: passengerEmail,
                passengerName: passengerName || "Valued Rider",
                invoiceNo: finalBill?.invoiceNo || `INV-${String(booking.id).substring(0, 8).toUpperCase()}`,
                bookingId: String(booking.id),
                date: booking.createdAt,
                completedAt: booking.updatedAt,
                pickupAddress: booking.pickupAddress || `${booking.pickupLat}, ${booking.pickupLng}`,
                dropoffAddress: booking.dropAddress || `${booking.dropLat}, ${booking.dropLng}`,
                distanceKm: finalBill?.distanceKm ?? Number(booking.distance) ?? 0,
                driverName: vehicle?.driver?.name || "Serve Family Driver",
                driverPhone: vehicle?.driver?.phoneNumber || vehicle?.mobileNum || "",
                vehicleRegNum: vehicle?.vehicleRegNum || "Taxi",
                vehicleType: vehicle?.vehicleType?.type || "Standard",
                paymentMethod: booking.paymentMethod || "cash",
                paymentStatus: "paid",
                baseFare: finalBill?.baseFare || 100,
                ratePerKm: finalBill?.ratePerKm || 80,
                distanceFare: finalBill?.distanceFare || 0,
                pickupFare: finalBill?.pickupFare || 0,
                waitingMinutes: finalBill?.waitingMinutes || 0,
                waitingFare: finalBill?.waitingFare || 0,
                totalFare: Number(booking.fare) || finalBill?.totalFare || 0
              }).catch(e => console.warn("Background receipt email error:", e));
            }
          } catch (emailErr) {
            console.warn("Could not send trip completion receipt email:", emailErr);
          }
        } else if (status === "cancelled") {
          const targetUserId = actorId === passengerUserId ? vehicleUserId : passengerUserId;
          const cancelledBy = actorId === passengerUserId ? "passenger" : "driver";
          if (targetUserId) {
            await sendNotificationToUser(
              targetUserId,
              "Ride Cancelled ❌",
              `The ride request was cancelled by the ${cancelledBy}.`,
              {
                type: "TAXI_BOOKING_STATUS_UPDATE",
                bookingId: String(bookingId),
                status: "cancelled",
                cancelledBy
              },
              actorId
            );
          } else if (actorId === passengerUserId && booking.vehicleId) {
            // If ride was cancelled while pending for a specific vehicle
            const targetVehicle = await db.Vehicle.findByPk(booking.vehicleId);
            if (targetVehicle && targetVehicle.userId) {
              await sendNotificationToUser(
                targetVehicle.userId,
                "Ride Request Cancelled ❌",
                "The passenger has cancelled the ride request.",
                {
                  type: "TAXI_BOOKING_STATUS_UPDATE",
                  bookingId: String(bookingId),
                  status: "cancelled",
                  cancelledBy: "passenger"
                },
                actorId
              ).catch(() => {});
            }
          }
        }
      } catch (notifyErr) {
        console.error("❌ Status Update Notification Error:", notifyErr);
      }
    })();

    if (status === "completed") {
      return res.json({
        success: true,
        message: "Trip completed successfully",
        status: "completed",
        bill: finalBill,
        data: booking
      });
    }

    return res.json({ success: true, message: `Status updated to ${status}`, data: booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Dedicated endpoint to cancel a ride request
export async function cancelBooking(req: AuthRequest, res: Response) {
  req.body = { ...req.body, status: "cancelled" };
  return updateBookingStatus(req, res);
}

export async function getActiveVehicles(req: AuthRequest, res: Response) {
  // Delegate directly to getAvailableRides for unified distance calculation, sorting & Sri Lanka fallbacks
  return getAvailableRides(req, res);
}

export async function acceptBookingWithBid(req: AuthRequest, res: Response) {
  const transaction = await sequelize.transaction();
  try {
    const { bookingId } = req.params;
    const { vehicleId, bidFare } = req.body;

    const numBid = Number(bidFare);
    if (bidFare === undefined || bidFare === null || isNaN(numBid) || numBid <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "A valid positive bid fare is required" });
    }

    const booking = await db.VehicleBooking.findOne({
      where: { id: bookingId, status: "pending" },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "Ride not available or already accepted by another driver" });
    }

    // Verify driver's registered vehicle belongs to logged-in user
    const driverVehicle = await db.Vehicle.findOne({
      where: { userId: req.user!.userId },
      transaction,
    });

    if (!driverVehicle) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "No registered vehicle found for your driver account" });
    }

    if (driverVehicle.approvalStatus !== "approved") {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: "Your vehicle is pending approval or suspended" });
    }

    const minFareFloor = Number(driverVehicle.baseFare) || Number(driverVehicle.pickupFare) || 50;
    if (numBid < minFareFloor) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Bid fare (Rs. ${numBid}) cannot be lower than minimum base fare (Rs. ${minFareFloor})`
      });
    }

    // Prevent driver from accepting a ride requested by themselves
    if (booking.userId === req.user!.userId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "You cannot accept your own ride request" });
    }

    // If passenger requested a specific vehicle directly, only that vehicle's driver can accept
    if (booking.vehicleId && booking.vehicleId !== driverVehicle.id) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: "This ride was requested specifically for another driver" });
    }

    const driverVehicleId = driverVehicle.id;

    // Check if vehicle already has an ongoing active trip!
    const existingActiveRide = await db.VehicleBooking.findOne({
      where: {
        vehicleId: driverVehicleId,
        id: { [Op.ne]: bookingId },
        status: { [Op.in]: ["accepted", "arrived", "in_transit"] }
      },
      transaction
    });

    if (existingActiveRide) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "You already have an active ongoing trip in progress. Please complete or cancel it before accepting another ride."
      });
    }

    await booking.update(
      {
        status: "accepted",
        vehicleId: driverVehicleId,
        fare: bidFare,
      },
      { transaction }
    );

    await transaction.commit();

    // Clear auto-timeout timer immediately
    clearBookingTimeout(bookingId);

    // Real-Time Socket.io Events:
    try {
      const io = getIO();
      io?.to("nearby_drivers").emit("ride_request_taken", { bookingId });
      io?.to(`booking_${bookingId}`).emit("ride_accepted", {
        bookingId,
        status: "accepted",
        fare: bidFare,
        vehicleId,
      });
    } catch (sockErr) {
      console.warn("⚠️ Accept Bid Socket warning:", sockErr);
    }

    // Notify Passenger
    (async () => {
      try {
        if (booking.userId) {
          await sendNotificationToUser(
            booking.userId,
            "Ride Accepted with Bid! 🚕",
            `Driver accepted your ride request for fare Rs. ${bidFare}.`,
            {
              type: "TAXI_BOOKING_ACCEPTED",
              bookingId: String(bookingId),
              bidFare: String(bidFare),
            },
            req.user!.userId
          );
        }
      } catch (notifyErr) {
        console.error("❌ Accept Bid Notification Error:", notifyErr);
      }
    })();

    return res.json({ success: true, message: "Ride accepted with bid!", data: { bidFare } });
  } catch (err) {
    await transaction.rollback().catch(() => {});
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateDriverRate(req: AuthRequest, res: Response) {
  try {
    const { ratePerKm, baseFare, pickupFare, waitingFare, waitingCharge, isWaiting, showMobileNum, isActive, motherLatitude, motherLongitude, motherAddress } = req.body;
    const userId = req.user!.userId;

    const vehicle = await db.Vehicle.findOne({ where: { userId } });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found for this driver" });
    }

    const updates: any = {};
    if (ratePerKm !== undefined) updates.ratePerKm = Number(ratePerKm);
    if (baseFare !== undefined) updates.baseFare = Number(baseFare);
    if (pickupFare !== undefined) updates.pickupFare = Number(pickupFare);
    if (waitingFare !== undefined) updates.waitingFare = Number(waitingFare);
    else if (waitingCharge !== undefined) updates.waitingFare = Number(waitingCharge);
    if (isWaiting !== undefined) {
      updates.isWaiting = Boolean(isWaiting);
      updates.waitingStartedAt = updates.isWaiting ? new Date() : null;
    }
    if (showMobileNum !== undefined) updates.showMobileNum = Boolean(showMobileNum);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (motherLatitude !== undefined) updates.baseLatitude = Number(motherLatitude);
    if (motherLongitude !== undefined) updates.baseLongitude = Number(motherLongitude);
    if (motherAddress !== undefined) updates.baseAddress = motherAddress;

    await vehicle.update(updates);
    return res.json({ success: true, message: "Driver vehicle settings & rates updated!", data: vehicle });
  } catch (err) {
    console.error("UPDATE DRIVER SETTINGS ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Dedicated API to toggle or update waiting status and waiting fare
export async function updateDriverWaiting(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const vehicle = await db.Vehicle.findOne({ where: { userId } });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found for this driver" });
    }

    let { isWaiting, waitingFare, waitingCharge, toggle, bookingId } = req.body;

    if (toggle === true || (isWaiting === undefined && waitingFare === undefined && waitingCharge === undefined)) {
      isWaiting = !vehicle.isWaiting;
    }

    const updates: any = {};
    if (isWaiting !== undefined) {
      const newStatus = Boolean(isWaiting);
      updates.isWaiting = newStatus;
      updates.waitingStartedAt = newStatus ? new Date() : null;
    }

    if (waitingFare !== undefined && waitingFare !== null) {
      updates.waitingFare = Number(waitingFare);
    } else if (waitingCharge !== undefined && waitingCharge !== null) {
      updates.waitingFare = Number(waitingCharge);
    }

    await vehicle.update(updates);

    // If driver currently has an active ride or bookingId is passed, synchronize waiting on the booking as well
    let activeBooking = null;
    if (bookingId) {
      activeBooking = await db.VehicleBooking.findByPk(bookingId);
    } else {
      activeBooking = await db.VehicleBooking.findOne({
        where: {
          vehicleId: vehicle.id,
          status: { [Op.in]: ["accepted", "arrived", "started", "in_transit"] }
        }
      });
    }

    if (activeBooking && updates.isWaiting !== undefined) {
      const bookingUpdates: any = { isWaiting: updates.isWaiting };
      if (updates.isWaiting) {
        bookingUpdates.waitingStartedAt = new Date();
      } else if (activeBooking.waitingStartedAt) {
        const elapsedMs = Date.now() - new Date(activeBooking.waitingStartedAt).getTime();
        const elapsedMinutes = Math.max(0, Math.round((elapsedMs / 60000) * 10) / 10);
        const prevMinutes = Number(activeBooking.waitingMinutes || 0);
        const totalMinutes = prevMinutes + elapsedMinutes;
        bookingUpdates.waitingMinutes = totalMinutes;
        const rate = Number(vehicle.waitingFare || 0);
        bookingUpdates.waitingFare = Math.round(totalMinutes * rate);
        bookingUpdates.waitingStartedAt = null;
      }
      await activeBooking.update(bookingUpdates);
    }

    return res.json({
      success: true,
      message: updates.isWaiting !== undefined 
        ? `Driver waiting mode turned ${updates.isWaiting ? "ON" : "OFF"}` 
        : "Driver waiting fare updated",
      data: {
        vehicle,
        booking: activeBooking || undefined
      }
    });
  } catch (err) {
    console.error("UPDATE DRIVER WAITING ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getBookingDetails(req: AuthRequest, res: Response) {
  try {
    const { bookingId } = req.params;
    const booking = await db.VehicleBooking.findByPk(bookingId, {
      include: [
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            {
              model: db.User,
              as: "driver",
              attributes: ["id", "name", "email", "avatar", "phoneNumber"],
            },
            {
              model: db.VehicleType,
              as: "vehicleType",
              attributes: ["id", "type", "category"],
            }
          ],
        },
        {
          model: db.User,
          as: "passenger",
          attributes: ["id", "name", "email", "avatar", "phoneNumber"],
        },
        {
          model: db.Review,
          as: "review",
          required: false,
        }
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    return res.json({ success: true, data: booking });
  } catch (err) {
    console.error("GET BOOKING DETAILS ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/taxi/booking/:bookingId/receipt or /bill
export async function getBookingReceipt(req: AuthRequest, res: Response) {
  try {
    const bookingId = req.params.bookingId || req.params.id;
    const booking = await db.VehicleBooking.findByPk(bookingId, {
      include: [
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            { model: db.VehicleType, as: "vehicleType" },
            { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber", "avatar"] }
          ]
        },
        {
          model: db.User,
          as: "passenger",
          attributes: ["id", "name", "email", "phoneNumber", "avatar"]
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const actorId = req.user!.userId;
    const passengerUserId = booking.userId;
    const vehicleUserId = (booking as any).vehicle?.userId;
    const userRole = (req.user as any).role || "";
    const isAdmin = ["admin", "superadmin", "agent"].includes(userRole);

    if (!isAdmin && actorId !== passengerUserId && actorId !== vehicleUserId) {
      return res.status(403).json({ success: false, message: "Unauthorized to access this receipt" });
    }

    const receipt = buildBookingReceipt(booking);
    return res.json({ success: true, data: receipt, bill: receipt });
  } catch (err) {
    console.error("GET BOOKING RECEIPT ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getDriverBookings(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { status } = req.query;

    const vehicle = await db.Vehicle.findOne({ where: { userId } });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found for this driver" });
    }

    // If vehicle is already active, keep updatedAt fresh; do NOT force offline drivers to online!
    if (vehicle.approvalStatus === "approved" && vehicle.isActive) {
      vehicle.update({ updatedAt: new Date() }).catch(() => {});
    }

    // Check if driver is currently occupied on an active trip
    const activeOngoingRide = await db.VehicleBooking.findOne({
      where: {
        vehicleId: vehicle.id,
        status: { [Op.in]: ["accepted", "arrived", "in_transit"] }
      }
    });

    // If driver is currently on an active trip, do not send pending requests to ring their phone
    if (activeOngoingRide && status === "pending") {
      return res.json({ success: true, data: [] });
    }

    let whereClause: any;
    if (status === "pending") {
      whereClause = {
        [Op.or]: [
          { vehicleId: vehicle.id, status: "pending" },
          { vehicleId: null, status: "pending" }
        ],
        createdAt: {
          [Op.gte]: new Date(Date.now() - 60 * 1000) // Only fresh requests from the last 60 seconds
        }
      };
    } else if (status && typeof status === "string") {
      whereClause = { vehicleId: vehicle.id, status };
    } else if (activeOngoingRide) {
      // Driver has an active trip: only return their assigned bookings, no incoming pending pool
      whereClause = { vehicleId: vehicle.id };
    } else {
      whereClause = {
        [Op.or]: [
          { vehicleId: vehicle.id },
          {
            vehicleId: null,
            status: "pending",
            createdAt: { [Op.gte]: new Date(Date.now() - 60 * 1000) }
          }
        ]
      };
    }

    const bookings = await db.VehicleBooking.findAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: "passenger",
          attributes: ["id", "name", "email", "avatar", "phoneNumber"],
        },
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            {
              model: db.VehicleType,
              as: "vehicleType",
              attributes: ["id", "type", "category", "baseFare", "ratePerKm"],
            }
          ]
        },
        {
          model: db.Review,
          as: "review",
          required: false
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const enrichedDriverBookings = bookings.map((b: any) => {
      const receipt = buildBookingReceipt(b);
      return {
        ...b.toJSON(),
        invoiceNo: receipt.invoiceNo,
        receipt,
        bill: receipt
      };
    });

    return res.json({ success: true, data: enrichedDriverBookings });
  } catch (err) {
    console.error("GET DRIVER BOOKINGS ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getPassengerBookings(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { status } = req.query;

    const whereClause: any = { userId };
    if (status && typeof status === "string") {
      whereClause.status = status;
    }

    const bookings = await db.VehicleBooking.findAll({
      where: whereClause,
      include: [
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            {
              model: db.User,
              as: "driver",
              attributes: ["id", "name", "email", "avatar", "phoneNumber"],
            },
            {
              model: db.VehicleType,
              as: "vehicleType",
              attributes: ["id", "type", "category", "baseFare", "ratePerKm"],
            }
          ]
        },
        {
          model: db.Review,
          as: "review",
          required: false
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const enrichedPassengerBookings = bookings.map((b: any) => {
      const receipt = buildBookingReceipt(b);
      return {
        ...b.toJSON(),
        invoiceNo: receipt.invoiceNo,
        receipt,
        bill: receipt
      };
    });

    return res.json({ success: true, data: enrichedPassengerBookings });
  } catch (err) {
    console.error("GET PASSENGER BOOKINGS ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Dedicated API to update driver live GPS location
export async function updateDriverLocation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { lat, latitude, lng, longitude, isOnline, isActive } = req.body;

    const finalLat = latitude !== undefined ? Number(latitude) : (lat !== undefined ? Number(lat) : null);
    const finalLng = longitude !== undefined ? Number(longitude) : (lng !== undefined ? Number(lng) : null);

    const vehicle = await db.Vehicle.findOne({ where: { userId } });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found for this driver" });
    }

    const updates: any = {};
    if (finalLat !== null && !isNaN(finalLat) && finalLat !== 0 && Math.abs(finalLat) <= 90) updates.latitude = finalLat;
    if (finalLng !== null && !isNaN(finalLng) && finalLng !== 0 && Math.abs(finalLng) <= 180) updates.longitude = finalLng;

    const activeVal = isOnline !== undefined ? isOnline : isActive;
    if (activeVal !== undefined) {
      updates.isActive = Boolean(activeVal);
    } else {
      // Driver is actively updating GPS location from app -> they are ONLINE!
      updates.isActive = true;
    }
    updates.updatedAt = new Date();

    if (Object.keys(updates).length > 0) {
      await vehicle.update(updates);

      // Real-time PickMe style tracking: If driver is on an active trip, broadcast live coordinates to passenger
      try {
        const activeBooking = await db.VehicleBooking.findOne({
          where: {
            vehicleId: vehicle.id,
            status: { [Op.in]: ["accepted", "arrived", "in_transit"] },
          },
          attributes: ["id", "status", "userId"],
        });

        if (activeBooking) {
          getIO()?.to(`booking_${activeBooking.id}`).emit("driver_location_update", {
            bookingId: activeBooking.id,
            vehicleId: vehicle.id,
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
            status: activeBooking.status,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (streamErr) {
        // Non-blocking
      }
      // Real-time fleet sync: notify admin room of driver position and status
      try {
        getIO()?.to("admin_room").emit("driver_status_changed", {
          vehicleId: vehicle.id,
          driverUserId: userId,
          vehicleRegNum: vehicle.vehicleRegNum,
          isActive: vehicle.isActive,
          isOnline: vehicle.isActive,
          latitude: vehicle.latitude,
          longitude: vehicle.longitude,
          updatedAt: vehicle.updatedAt
        });
      } catch (_) {}
    }

    return res.json({
      success: true,
      message: "Driver location updated successfully",
      data: {
        vehicleId: vehicle.id,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        isActive: vehicle.isActive,
        isOnline: vehicle.isActive
      }
    });
  } catch (err) {
    console.error("UPDATE DRIVER LOCATION ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Dedicated endpoint to get road distance, route geometry and fare estimates for all vehicle types
export async function estimateRideFare(req: AuthRequest, res: Response) {
  try {
    const q = (req.method === "POST" ? req.body : req.query) || {};
    const rawLat = q.pickupLat ?? q.pickupLatitude ?? q.pickup_lat ?? q.lat ?? q.latitude;
    const rawLng = q.pickupLng ?? q.pickupLongitude ?? q.pickup_lng ?? q.lng ?? q.longitude;
    const rawDropLat = q.dropLat ?? q.dropLatitude ?? q.dropoffLat ?? q.destinationLat ?? q.toLat;
    const rawDropLng = q.dropLng ?? q.dropLongitude ?? q.dropoffLng ?? q.destinationLng ?? q.toLng;

    const pLat = Number(rawLat);
    const pLng = Number(rawLng);
    const dLat = Number(rawDropLat);
    const dLng = Number(rawDropLng);

    if (isNaN(pLat) || isNaN(pLng) || isNaN(dLat) || isNaN(dLng)) {
      return res.status(400).json({
        success: false,
        message: "Valid pickup coordinates (pickupLat, pickupLng) and destination coordinates (dropLat, dropLng) are required"
      });
    }

    const { route, estimates } = await getFareEstimatesForAllVehicles(
      pLat,
      pLng,
      dLat,
      dLng,
      q.category as string
    );

    return res.json({
      success: true,
      data: {
        distanceKm: route.distanceKm,
        isRoadDistance: route.isRoadDistance,
        source: route.source,
        startAddress: route.startAddress,
        endAddress: route.endAddress,
        startLocation: route.startLocation,
        endLocation: route.endLocation,
        routeGeometry: route.geometry,
        estimates
      }
    });
  } catch (err: any) {
    console.error("ESTIMATE RIDE FARE ERROR:", err);
    return res.status(500).json({ success: false, message: "Error estimating fare", error: err?.message });
  }
}

// Passenger rating and review submission for completed trips
export async function rateBooking(req: AuthRequest, res: Response) {
  try {
    const { bookingId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user!.userId;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5" });
    }

    const booking = await db.VehicleBooking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ success: false, message: "Only the passenger who took this trip can submit a review" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({ success: false, message: "Reviews can only be submitted for completed trips" });
    }

    if (!booking.vehicleId) {
      return res.status(400).json({ success: false, message: "No vehicle associated with this booking" });
    }

    // Check if review already exists
    let review = await db.Review.findOne({ where: { bookingId } });
    if (review) {
      await review.update({ rating: numRating, feedback: feedback || null });
    } else {
      review = await db.Review.create({
        bookingId,
        userId,
        vehicleId: booking.vehicleId,
        rating: numRating,
        feedback: feedback || null,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review
    });
  } catch (err: any) {
    console.error("RATE BOOKING ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to submit review", error: err?.message });
  }
}

// GET /api/taxi/driver/earnings or /api/taxi/driver/wallet
export async function getDriverEarningsSummary(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const vehicle = await db.Vehicle.findOne({ where: { userId } });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "No registered vehicle found for this driver" });
    }

    const now = new Date();
    // Today: from 00:00:00
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // This week: Monday 00:00:00
    const dayOfWeek = (now.getDay() + 6) % 7;
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - dayOfWeek);

    // This month: 1st of month 00:00:00
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const completedBookings = await db.VehicleBooking.findAll({
      where: {
        vehicleId: vehicle.id,
        status: "completed"
      },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.User,
          as: "passenger",
          attributes: ["id", "name", "phoneNumber", "avatar"]
        }
      ]
    });

    let todayRides = 0, todayGross = 0, todayComm = 0, todayNet = 0;
    let weekRides = 0, weekGross = 0, weekComm = 0, weekNet = 0;
    let monthRides = 0, monthGross = 0, monthComm = 0, monthNet = 0;
    let totalRides = completedBookings.length, totalGross = 0, totalComm = 0, totalNet = 0;

    for (const b of completedBookings) {
      const fare = Number(b.fare) || 0;
      const comm = b.companyCommission !== null && b.companyCommission !== undefined
        ? Number(b.companyCommission)
        : Math.round(fare * 0.10);
      const net = b.driverEarnings !== null && b.driverEarnings !== undefined
        ? Number(b.driverEarnings)
        : (fare - comm);
      const tripTime = new Date(b.createdAt || 0);

      totalGross += fare;
      totalComm += comm;
      totalNet += net;

      if (tripTime >= monthStart) {
        monthRides++;
        monthGross += fare;
        monthComm += comm;
        monthNet += net;
      }

      if (tripTime >= weekStart) {
        weekRides++;
        weekGross += fare;
        weekComm += comm;
        weekNet += net;
      }

      if (tripTime >= todayStart) {
        todayRides++;
        todayGross += fare;
        todayComm += comm;
        todayNet += net;
      }
    }

    const recentRides = completedBookings.slice(0, 20).map((b: any) => {
      const fare = Number(b.fare) || 0;
      const comm = b.companyCommission !== null && b.companyCommission !== undefined
        ? Number(b.companyCommission)
        : Math.round(fare * 0.10);
      const net = b.driverEarnings !== null && b.driverEarnings !== undefined
        ? Number(b.driverEarnings)
        : (fare - comm);

      return {
        id: b.id,
        pickupAddress: b.pickupAddress,
        dropAddress: b.dropAddress,
        distance: b.distance,
        fare,
        companyCommission: comm,
        netEarnings: net,
        passengerName: b.passenger?.name || "Passenger",
        passengerPhone: b.passenger?.phoneNumber || null,
        createdAt: b.createdAt
      };
    });

    return res.json({
      success: true,
      data: {
        driver: {
          id: userId,
          vehicleId: vehicle.id,
          vehicleRegNum: vehicle.vehicleRegNum,
          approvalStatus: vehicle.approvalStatus,
          isActive: vehicle.isActive
        },
        today: {
          rides: todayRides,
          grossFare: todayGross,
          companyCommission: todayComm,
          netEarnings: todayNet
        },
        thisWeek: {
          rides: weekRides,
          grossFare: weekGross,
          companyCommission: weekComm,
          netEarnings: weekNet
        },
        thisMonth: {
          rides: monthRides,
          grossFare: monthGross,
          companyCommission: monthComm,
          netEarnings: monthNet
        },
        total: {
          rides: totalRides,
          grossFare: totalGross,
          companyCommission: totalComm,
          netEarnings: totalNet
        },
        commissionRate: "10%",
        driverShare: "90%",
        recentRides
      }
    });
  } catch (err: any) {
    console.error("❌ Get Driver Earnings Error:", err);
    return res.status(500).json({ success: false, message: "Server error retrieving driver earnings" });
  }
}

// POST or PATCH /api/taxi/driver/heartbeat or /api/taxi/heartbeat
export async function driverHeartbeat(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const vehicle = await db.Vehicle.findOne({ where: { userId } });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "No registered vehicle found for this driver" });
    }

    const { latitude, lat, longitude, lng, isOnline, isActive } = req.body || {};
    const finalLat = latitude !== undefined ? Number(latitude) : (lat !== undefined ? Number(lat) : null);
    const finalLng = longitude !== undefined ? Number(longitude) : (lng !== undefined ? Number(lng) : null);

    const updates: any = {};
    if (finalLat !== null && !isNaN(finalLat) && finalLat !== 0 && Math.abs(finalLat) <= 90) updates.latitude = finalLat;
    if (finalLng !== null && !isNaN(finalLng) && finalLng !== 0 && Math.abs(finalLng) <= 180) updates.longitude = finalLng;

    const activeVal = isOnline !== undefined ? isOnline : isActive;
    if (activeVal !== undefined) {
      updates.isActive = Boolean(activeVal);
    } else {
      updates.isActive = true;
    }

    // Refresh updatedAt timestamp
    updates.updatedAt = new Date();
    await vehicle.update(updates);

    return res.json({
      success: true,
      message: "Heartbeat acknowledged",
      data: {
        vehicleId: vehicle.id,
        isActive: vehicle.isActive,
        isOnline: vehicle.isActive,
        lastActiveAt: vehicle.updatedAt
      }
    });
  } catch (err: any) {
    console.error("❌ Driver Heartbeat Error:", err);
    return res.status(500).json({ success: false, message: "Server error acknowledging heartbeat" });
  }
}

// GET /api/taxi/driver/status - Get current driver online/offline & vehicle status
export async function getDriverStatus(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const vehicle = await db.Vehicle.findOne({
      where: { userId },
      include: [
        {
          model: db.VehicleType,
          as: "vehicleType",
          attributes: ["id", "type", "category", "baseFare", "ratePerKm"]
        }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "No registered vehicle found for this driver" });
    }

    const isSocketLive = Boolean(isDriverSocketConnected(userId) || isDriverSocketConnected(vehicle.id));
    const currentOnline = Boolean(vehicle.isActive);

    return res.json({
      success: true,
      data: {
        vehicleId: vehicle.id,
        vehicleRegNum: vehicle.vehicleRegNum,
        isActive: currentOnline,
        isOnline: currentOnline,
        status: currentOnline ? "online" : "offline",
        approvalStatus: vehicle.approvalStatus,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        updatedAt: vehicle.updatedAt,
        ratePerKm: vehicle.ratePerKm,
        baseFare: vehicle.baseFare,
        pickupFare: vehicle.pickupFare,
        waitingFare: vehicle.waitingFare,
        isWaiting: vehicle.isWaiting
      }
    });
  } catch (err: any) {
    console.error("GET DRIVER STATUS ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH & POST /api/taxi/driver/status, /api/taxi/driver/toggle-online, /api/taxi/toggle-online
export async function toggleDriverOnlineStatus(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const vehicle = await db.Vehicle.findOne({ where: { userId } });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "No registered vehicle found for this driver" });
    }

    if (vehicle.approvalStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: `Cannot go online. Vehicle approval status is '${vehicle.approvalStatus}'. Only approved vehicles can go online.`
      });
    }

    const body = req.body || {};
    const query = req.query || {};
    const rawVal = body.status ?? body.isOnline ?? body.isActive ?? body.online ?? body.active ?? query.status ?? query.isOnline ?? query.isActive;

    let targetOnline: boolean;
    if (rawVal !== undefined && rawVal !== null) {
      if (typeof rawVal === "string") {
        const lower = rawVal.toLowerCase().trim();
        targetOnline = lower === "online" || lower === "true" || lower === "1" || lower === "active";
      } else {
        targetOnline = Boolean(rawVal);
      }
    } else {
      // Toggle current status if no explicit parameter provided
      targetOnline = !vehicle.isActive;
    }

    const updates: any = {
      isActive: targetOnline,
      updatedAt: new Date()
    };

    const finalLat = body.latitude !== undefined ? Number(body.latitude) : (body.lat !== undefined ? Number(body.lat) : null);
    const finalLng = body.longitude !== undefined ? Number(body.longitude) : (body.lng !== undefined ? Number(body.lng) : null);
    if (finalLat !== null && !isNaN(finalLat) && finalLat !== 0 && Math.abs(finalLat) <= 90) updates.latitude = finalLat;
    if (finalLng !== null && !isNaN(finalLng) && finalLng !== 0 && Math.abs(finalLng) <= 180) updates.longitude = finalLng;

    await vehicle.update(updates);

    // Real-Time Socket Broadcast to Admin and nearby drivers
    try {
      const io = getIO();
      const payload = {
        vehicleId: vehicle.id,
        driverUserId: userId,
        vehicleRegNum: vehicle.vehicleRegNum,
        isActive: targetOnline,
        isOnline: targetOnline,
        status: targetOnline ? "online" : "offline",
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        updatedAt: vehicle.updatedAt
      };
      io?.to("admin_room").emit("driver_status_changed", payload);
      io?.to("admin_room").emit("drivers_status_updated", payload);
      io?.to("nearby_drivers").emit("driver_status_changed", payload);
    } catch (_) {}

    return res.json({
      success: true,
      message: targetOnline ? "Driver is now ONLINE" : "Driver is now OFFLINE",
      data: {
        vehicleId: vehicle.id,
        vehicleRegNum: vehicle.vehicleRegNum,
        isActive: vehicle.isActive,
        isOnline: vehicle.isActive,
        status: vehicle.isActive ? "online" : "offline",
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        updatedAt: vehicle.updatedAt
      }
    });
  } catch (err: any) {
    console.error("TOGGLE DRIVER STATUS ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error toggling driver status" });
  }
}

// POST /api/taxi/booking/:bookingId/send-receipt & /email-receipt
export async function emailBookingReceipt(req: AuthRequest, res: Response) {
  try {
    const { bookingId } = req.params;
    const targetEmail = req.body?.email || req.query?.email;

    const booking = await db.VehicleBooking.findByPk(bookingId, {
      include: [
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            { model: db.VehicleType, as: "vehicleType" },
            { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber", "avatar"] }
          ]
        },
        {
          model: db.User,
          as: "passenger",
          attributes: ["id", "name", "email", "phoneNumber", "avatar"]
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const receipt = buildBookingReceipt(booking);
    const toEmail = (targetEmail as string) || (booking as any).passenger?.email || (req.user as any)?.email;

    if (!toEmail) {
      return res.status(400).json({ success: false, message: "No recipient email address found. Please provide an email in the request body." });
    }

    const sent = await sendRideReceiptEmail({
      toEmail,
      passengerName: receipt.passenger?.name || "Valued Rider",
      invoiceNo: receipt.invoiceNo,
      bookingId: String(booking.id),
      date: booking.createdAt,
      completedAt: booking.updatedAt,
      pickupAddress: receipt.pickupAddress,
      dropoffAddress: receipt.dropAddress,
      distanceKm: receipt.distanceKm,
      driverName: receipt.driver?.name || "Driver",
      driverPhone: receipt.driver?.phoneNumber || "",
      vehicleRegNum: receipt.driver?.vehicleRegNum || "Vehicle",
      vehicleType: receipt.driver?.vehicleType || "Taxi",
      paymentMethod: receipt.paymentMethod,
      paymentStatus: receipt.paymentStatus,
      baseFare: receipt.baseFare,
      ratePerKm: receipt.ratePerKm,
      distanceFare: receipt.distanceFare,
      pickupFare: receipt.pickupFare,
      waitingMinutes: receipt.waitingMinutes,
      waitingFare: receipt.waitingFare,
      totalFare: receipt.totalFare,
    });

    return res.json({
      success: true,
      message: sent ? `Receipt email sent successfully to ${toEmail}` : `Email queued or sent to ${toEmail}`,
      toEmail,
      invoiceNo: receipt.invoiceNo
    });
  } catch (err: any) {
    console.error("EMAIL RECEIPT ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to send receipt email", error: err?.message });
  }
}



