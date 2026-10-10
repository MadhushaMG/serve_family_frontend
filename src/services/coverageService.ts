import { db } from "../db";
import { calculateHaversineDistanceKm, resolveSriLankanCoordinates } from "../modules/taxi/utils/taxiHelpers";

export interface CoverageZone {
  id: string;
  name: string;
  nameSi?: string;
  type: "province" | "district" | "custom";
  lat: number;
  lng: number;
  radiusKm: number;
  isCovered: boolean;
  description?: string;
  updatedAt?: string;
}

export const DEFAULT_SRI_LANKA_ZONES: CoverageZone[] = [
  {
    id: "western_province",
    name: "Western Province (Colombo, Gampaha, Kalutara)",
    nameSi: "බස්නාහිර පළාත",
    type: "province",
    lat: 6.9271,
    lng: 79.9612,
    radiusKm: 45,
    isCovered: true,
    description: "Western Province commercial hub (Colombo, Gampaha, Negombo, Kalutara)"
  },
  {
    id: "central_province",
    name: "Central Province (Kandy, Matale, Nuwara Eliya)",
    nameSi: "මධ්‍යම පළාත",
    type: "province",
    lat: 7.2906,
    lng: 80.6337,
    radiusKm: 45,
    isCovered: true,
    description: "Central Highlands (Kandy, Peradeniya, Matale, Nuwara Eliya)"
  },
  {
    id: "southern_province",
    name: "Southern Province (Galle, Matara, Hambantota)",
    nameSi: "දකුණු පළාත",
    type: "province",
    lat: 6.0535,
    lng: 80.4500,
    radiusKm: 55,
    isCovered: true,
    description: "Southern coastal and commercial belt (Galle, Matara, Weligama, Tangalle)"
  },
  {
    id: "north_western",
    name: "North Western Province (Kurunegala, Puttalam)",
    nameSi: "වයඹ පළාත",
    type: "province",
    lat: 7.6500,
    lng: 80.1000,
    radiusKm: 55,
    isCovered: false,
    description: "Wayamba region (Kurunegala, Kuliyapitiya, Chilaw, Puttalam)"
  },
  {
    id: "sabaragamuwa",
    name: "Sabaragamuwa Province (Ratnapura, Kegalle)",
    nameSi: "සබරගමුව පළාත",
    type: "province",
    lat: 6.8000,
    lng: 80.4000,
    radiusKm: 45,
    isCovered: false,
    description: "Gem city and rubber basin (Ratnapura, Kegalle, Mawanella)"
  },
  {
    id: "eastern_province",
    name: "Eastern Province (Trincomalee, Batticaloa, Ampara)",
    nameSi: "නැගෙනහිර පළාත",
    type: "province",
    lat: 7.8500,
    lng: 81.5000,
    radiusKm: 75,
    isCovered: false,
    description: "Eastern coastal strip (Trincomalee, Batticaloa, Ampara, Arugam Bay)"
  },
  {
    id: "northern_province",
    name: "Northern Province (Jaffna, Kilinochchi, Vavuniya, Mannar)",
    nameSi: "උතුරු පළාත",
    type: "province",
    lat: 9.2000,
    lng: 80.3000,
    radiusKm: 75,
    isCovered: false,
    description: "Northern peninsula and mainland (Jaffna, Vavuniya, Mannar)"
  },
  {
    id: "north_central",
    name: "North Central Province (Anuradhapura, Polonnaruwa)",
    nameSi: "උතුරු මැද පළාත",
    type: "province",
    lat: 8.2000,
    lng: 80.6000,
    radiusKm: 60,
    isCovered: false,
    description: "Rajarata ancient capitals (Anuradhapura, Polonnaruwa, Dambulla)"
  },
  {
    id: "uva_province",
    name: "Uva Province (Badulla, Monaragala)",
    nameSi: "ඌව පළාත",
    type: "province",
    lat: 6.9000,
    lng: 81.1500,
    radiusKm: 50,
    isCovered: false,
    description: "Uva province hill country (Badulla, Bandarawela, Ella, Monaragala)"
  },
  // Key Urban Hubs
  {
    id: "colombo_metro",
    name: "Colombo Metro Core",
    nameSi: "කොළඹ මහා නගර සීමාව",
    type: "district",
    lat: 6.9271,
    lng: 79.8612,
    radiusKm: 20,
    isCovered: true,
    description: "Fort, Pettah, Kollupitiya, Dehiwala, Nugegoda, Kaduwela"
  },
  {
    id: "kandy_metro",
    name: "Kandy Greater Urban Area",
    nameSi: "මහනුවර නගර සීමාව",
    type: "district",
    lat: 7.2906,
    lng: 80.6337,
    radiusKm: 18,
    isCovered: true,
    description: "Kandy City, Katugastota, Peradeniya, Kundasale, Digana"
  },
  {
    id: "galle_coastal",
    name: "Galle & Unawatuna Coastal Hub",
    nameSi: "ගාල්ල සහ උණවටුන කලාපය",
    type: "district",
    lat: 6.0535,
    lng: 80.2210,
    radiusKm: 18,
    isCovered: true,
    description: "Galle Fort, Karapitiya, Hikkaduwa, Unawatuna"
  }
];

const SETTING_KEY = "coverage_zones";

/**
 * Retrieves the current coverage zones from SystemSetting or defaults
 */
export async function getStoredCoverageZones(): Promise<CoverageZone[]> {
  try {
    const record = await db.SystemSetting.findOne({ where: { key: SETTING_KEY } });
    if (record && record.value) {
      let val = record.value;
      if (typeof val === "string") {
        try { val = JSON.parse(val); } catch(e){}
      }
      if (Array.isArray(val) && val.length > 0) {
        return val as CoverageZone[];
      }
    }
  } catch (err) {
    console.error("⚠️ Failed to load coverage zones from DB, using defaults:", err);
  }
  return DEFAULT_SRI_LANKA_ZONES;
}

/**
 * Saves/updates coverage zones in SystemSetting
 */
export async function saveStoredCoverageZones(zones: CoverageZone[]): Promise<CoverageZone[]> {
  await db.SystemSetting.upsert({
    key: SETTING_KEY,
    value: zones,
    description: `Coverage zones configured with ${zones.filter(z => z.isCovered).length} active areas.`
  });
  return zones;
}

/**
 * Checks if a given coordinate (lat, lng) falls inside any actively covered zone
 */
export async function checkUserCoordinatesCoverage(lat: number | null | undefined, lng: number | null | undefined): Promise<{
  isCovered: boolean;
  status: "covered" | "notcovered";
  matchedZone: string | null;
  distanceKm: number | null;
}> {
  if (lat === null || lat === undefined || lng === null || lng === undefined || isNaN(Number(lat)) || isNaN(Number(lng))) {
    return {
      isCovered: false,
      status: "notcovered",
      matchedZone: null,
      distanceKm: null
    };
  }

  const numLat = Number(lat);
  const numLng = Number(lng);

  // Filter out invalid/zero coordinates (e.g. 0, 0)
  if (numLat === 0 && numLng === 0) {
    return {
      isCovered: false,
      status: "notcovered",
      matchedZone: null,
      distanceKm: null
    };
  }

  const zones = await getStoredCoverageZones();
  const activeCoveredZones = zones.filter(z => z.isCovered === true);

  for (const zone of activeCoveredZones) {
    const zoneLat = Number(zone.lat);
    const zoneLng = Number(zone.lng);
    const zoneRadius = Number(zone.radiusKm);

    if (isNaN(zoneLat) || isNaN(zoneLng) || isNaN(zoneRadius)) continue;

    const dist = calculateHaversineDistanceKm(numLat, numLng, zoneLat, zoneLng);
    if (dist <= zoneRadius) {
      return {
        isCovered: true,
        status: "covered",
        matchedZone: zone.name,
        distanceKm: Number(dist.toFixed(2))
      };
    }
  }

  return {
    isCovered: false,
    status: "notcovered",
    matchedZone: null,
    distanceKm: null
  };
}

/**
 * Comprehensive resolver for User Role and Coverage Status
 */
export async function getUserRoleAndCoverage(userId: string, userInstance?: any): Promise<{
  role: string;
  coverageStatus: "covered" | "notcovered";
  isCovered: boolean;
  coveredArea: string | null;
}> {
  let user = userInstance;
  if (!user) {
    user = await db.User.findByPk(userId, {
      attributes: ["id", "email", "latitude", "longitude", "metadata"]
    });
  }

  // 1. Determine User Role
  let role = "user";
  const userEmail = (user?.email || "").toLowerCase();
  const existingMeta = user?.metadata && typeof user.metadata === "object" ? user.metadata : {};

  // Check if driver (has vehicle registered)
  const isDriverVehicle = await db.Vehicle.findOne({
    where: { userId },
    attributes: ["id", "approvalStatus"]
  });

  if (
    userEmail === "admin@servefamily.com" || 
    existingMeta.role === "admin" || 
    existingMeta.role === "superadmin"
  ) {
    role = "admin";
  } else if (existingMeta.role === "agent" || userEmail.includes("agent")) {
    role = "agent";
  } else if (isDriverVehicle || existingMeta.role === "driver") {
    role = "driver";
  } else if (existingMeta.role) {
    role = String(existingMeta.role);
  }

  // 2. Determine Coordinates
  let userLat = user?.latitude !== null && user?.latitude !== undefined && Number(user.latitude) !== 0 ? Number(user.latitude) : null;
  let userLng = user?.longitude !== null && user?.longitude !== undefined && Number(user.longitude) !== 0 ? Number(user.longitude) : null;

  // Fallback to latest location in LocationHistory if user model coordinates are missing
  if (userLat === null || userLng === null) {
    try {
      const latestLoc = await db.LocationHistory.findOne({
        where: { userId },
        order: [["createdAt", "DESC"]],
        attributes: ["latitude", "longitude"]
      });
      if (latestLoc && Number(latestLoc.latitude) !== 0) {
        userLat = Number(latestLoc.latitude);
        userLng = Number(latestLoc.longitude);
      }
    } catch (_) {}
  }

  // Fallback to driver's vehicle location or mother location if driver
  if ((userLat === null || userLng === null) && isDriverVehicle) {
    try {
      const v = await db.Vehicle.findOne({
        where: { userId },
        attributes: ["latitude", "longitude", "baseLatitude", "baseLongitude", "baseAddress"]
      });
      if (v) {
        if (v.latitude && Number(v.latitude) !== 0) {
          userLat = Number(v.latitude);
          userLng = Number(v.longitude);
        } else if (v.baseLatitude && Number(v.baseLatitude) !== 0) {
          userLat = Number(v.baseLatitude);
          userLng = Number(v.baseLongitude);
        } else if (v.baseAddress) {
          const coords = resolveSriLankanCoordinates(v.baseAddress);
          userLat = coords.latitude;
          userLng = coords.longitude;
        }
      }
    } catch (_) {}
  }

  // 3. Determine Coverage
  const coverageResult = await checkUserCoordinatesCoverage(userLat, userLng);

  let finalIsCovered = coverageResult.isCovered;
  let finalStatus = coverageResult.status;
  let finalArea = coverageResult.matchedZone;

  // If user metadata explicitly marked as covered, preserve it
  if (!finalIsCovered && existingMeta) {
    const metaCover = (
      existingMeta.coverageStatus ||
      existingMeta.coverage ||
      existingMeta.status ||
      existingMeta.covering ||
      ""
    ).toString().toLowerCase().trim();

    if (
      metaCover === "covered" ||
      metaCover === "cover" ||
      existingMeta.isCovered === true ||
      existingMeta.covered === true ||
      existingMeta.iscovered === true
    ) {
      finalIsCovered = true;
      finalStatus = "covered";
      finalArea = existingMeta.coveredArea || "Configured Covered Area";
    }
  }

  return {
    role,
    coverageStatus: finalStatus,
    isCovered: finalIsCovered,
    coveredArea: finalArea
  };
}
