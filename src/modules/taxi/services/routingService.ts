import axios from "axios";
import { env } from "../../../config/env";
import { calculateHaversineDistanceKm } from "../utils/taxiHelpers";
import { db } from "../../../db";

export interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface DrivingRouteResult {
  distanceKm: number;
  geometry: GeoJSONLineString | null;
  startAddress: string | null;
  endAddress: string | null;
  startLocation: { lat: number; lng: number } | null;
  endLocation: { lat: number; lng: number } | null;
  isRoadDistance: boolean;
  source: "pgrouting_osm" | "haversine_fallback" | "zero_distance";
}

export interface VehicleFareEstimate {
  vehicleTypeId: string;
  type: string;
  category: "hire" | "transport";
  seats: number;
  baseFare: number;
  pickupFare: number;
  ratePerKm: number;
  estimatedFare: number;
  distanceKm: number;
}

/**
 * Fetches the real driving road route & distance using test.servefamily.com (OSM + pgRouting).
 * Falls back safely to Haversine distance with road winding multiplier (1.25x) if the external API times out or fails.
 */
export async function getDrivingRoute(
  originLat: number | null | undefined,
  originLng: number | null | undefined,
  destLat: number | null | undefined,
  destLng: number | null | undefined
): Promise<DrivingRouteResult> {
  const oLat = originLat !== null && originLat !== undefined ? Number(originLat) : null;
  const oLng = originLng !== null && originLng !== undefined ? Number(originLng) : null;
  const dLat = destLat !== null && destLat !== undefined ? Number(destLat) : null;
  const dLng = destLng !== null && destLng !== undefined ? Number(destLng) : null;

  if (
    oLat === null ||
    oLng === null ||
    dLat === null ||
    dLng === null ||
    isNaN(oLat) ||
    isNaN(oLng) ||
    isNaN(dLat) ||
    isNaN(dLng)
  ) {
    return {
      distanceKm: 0,
      geometry: null,
      startAddress: null,
      endAddress: null,
      startLocation: null,
      endLocation: null,
      isRoadDistance: false,
      source: "zero_distance",
    };
  }

  // Calculate straight-line distance first
  const straightKm = calculateHaversineDistanceKm(oLat, oLng, dLat, dLng);

  // If points are within 25 meters, consider zero distance
  if (straightKm < 0.025) {
    return {
      distanceKm: 0,
      geometry: null,
      startAddress: null,
      endAddress: null,
      startLocation: { lat: oLat, lng: oLng },
      endLocation: { lat: dLat, lng: dLng },
      isRoadDistance: true,
      source: "zero_distance",
    };
  }

  const baseUrl = (env.ROUTING_API_URL || "https://test.servefamily.com").replace(/\/+$/, "");

  try {
    const response = await axios.get(`${baseUrl}/api/directions`, {
      params: {
        origin: `${oLat},${oLng}`,
        destination: `${dLat},${dLng}`,
      },
      timeout: 3500, // 3.5 seconds timeout
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 200 && response.data && typeof response.data.distanceKm === "number") {
      const roadDistanceKm = Number(Number(response.data.distanceKm).toFixed(2));
      return {
        distanceKm: roadDistanceKm > 0 ? roadDistanceKm : straightKm,
        geometry: response.data.geometry || null,
        startAddress: response.data.startAddress || null,
        endAddress: response.data.endAddress || null,
        startLocation: response.data.startLocation || { lat: oLat, lng: oLng },
        endLocation: response.data.endLocation || { lat: dLat, lng: dLng },
        isRoadDistance: true,
        source: "pgrouting_osm",
      };
    }
  } catch (err: any) {
    console.warn(
      `⚠️ [RoutingService] Failed to reach ${baseUrl}/api/directions (${err?.message || "timeout/error"}). Using Haversine road-factor fallback.`
    );
  }

  // Graceful fallback: 1.25x multiplier approximates Sri Lankan road curvature over straight-line distance
  const roadFallbackKm = Number((straightKm * 1.25).toFixed(2));

  return {
    distanceKm: roadFallbackKm,
    geometry: null,
    startAddress: null,
    endAddress: null,
    startLocation: { lat: oLat, lng: oLng },
    endLocation: { lat: dLat, lng: dLng },
    isRoadDistance: false,
    source: "haversine_fallback",
  };
}

/**
 * Calculates taxi fare based on base fare, rate per km, pickup fare, and waiting fare
 */
export function calculateTaxiFare(
  distanceKm: number,
  baseFare: number = 0,
  ratePerKm: number = 0,
  pickupFare: number = 0,
  waitingFare: number = 0
): number {
  const safeDistance = Math.max(0, Number(distanceKm) || 0);
  const total = Number(pickupFare || 0) + Number(baseFare || 0) + safeDistance * Number(ratePerKm || 0) + Number(waitingFare || 0);
  return Math.round(total);
}

/**
 * Calculates road route and estimated fares for all available vehicle types
 */
export async function getFareEstimatesForAllVehicles(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  categoryFilter?: string
): Promise<{
  route: DrivingRouteResult;
  estimates: VehicleFareEstimate[];
}> {
  const route = await getDrivingRoute(originLat, originLng, destLat, destLng);

  const whereClause: any = {};
  if (categoryFilter && (categoryFilter === "hire" || categoryFilter === "transport")) {
    whereClause.category = categoryFilter;
  }

  const vehicleTypes = await db.VehicleType.findAll({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    order: [["baseFare", "ASC"]],
  });

  const estimates: VehicleFareEstimate[] = vehicleTypes.map((vt: any) => {
    const baseFare = Number(vt.baseFare) || 0;
    const ratePerKm = Number(vt.ratePerKm) || 0;
    const pickupFare = 0;
    const estimatedFare = calculateTaxiFare(route.distanceKm, baseFare, ratePerKm, pickupFare);

    return {
      vehicleTypeId: vt.id,
      type: vt.type,
      category: vt.category,
      seats: vt.seats,
      baseFare,
      pickupFare,
      ratePerKm,
      estimatedFare,
      distanceKm: route.distanceKm,
    };
  });

  return { route, estimates };
}
