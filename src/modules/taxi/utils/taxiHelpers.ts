import { db } from "../../../db";
import { Op } from "sequelize";

/**
 * Known Sri Lankan cities and regional town coordinates
 */
const SRI_LANKA_COORDINATES: Array<{ keywords: string[]; lat: number; lng: number }> = [
  { keywords: ["kandy", "mahanuwara", "peradeniya", "katugastota", "gampola", "kundasale", "digana", "central"], lat: 7.2906, lng: 80.6337 },
  { keywords: ["colombo", "fort", "pettah", "maradana", "borella", "kollupitiya", "bambalapitiya", "western"], lat: 6.9271, lng: 79.8612 },
  { keywords: ["nugegoda", "maharagama", "kottawa", "homagama", "delkanda"], lat: 6.8649, lng: 79.8997 },
  { keywords: ["dehiwala", "mount lavinia", "ratmalana", "moratuwa"], lat: 6.8300, lng: 79.8700 },
  { keywords: ["battaramulla", "kotte", "rajagiriya", "malabe", "thalawathugoda"], lat: 6.8990, lng: 79.9170 },
  { keywords: ["galle", "karapitiya", "hikkaduwa", "unawatuna", "southern"], lat: 6.0535, lng: 80.2210 },
  { keywords: ["matara", "weligama", "dikwella", "mirissa"], lat: 5.9549, lng: 80.5550 },
  { keywords: ["gampaha", "yakkala", "kadawatha", "kiribathgoda", "kelaniya"], lat: 7.0840, lng: 79.9943 },
  { keywords: ["negombo", "katunayake", "kochchikade", "ja-ela", "seeduwa"], lat: 7.2008, lng: 79.8737 },
  { keywords: ["kalutara", "wadduwa", "beruwala", "aluthgama"], lat: 6.5854, lng: 79.9607 },
  { keywords: ["panadura"], lat: 6.7133, lng: 79.9074 },
  { keywords: ["kurunegala", "kuliyapitiya", "narammala", "wariyapola"], lat: 7.4863, lng: 80.3623 },
  { keywords: ["kegalle", "mawanella", "warakapola"], lat: 7.2513, lng: 80.3464 },
  { keywords: ["ratnapura", "pelmadulla", "balangoda", "sabaragamuwa"], lat: 6.6828, lng: 80.4036 },
  { keywords: ["anuradhapura", "mihintale", "kekirawa", "north central"], lat: 8.3114, lng: 80.4037 },
  { keywords: ["polonnaruwa", "kaduruwela", "medirigiriya"], lat: 7.9403, lng: 81.0188 },
  { keywords: ["badulla", "bandarawela", "ella", "haputale", "uva"], lat: 6.9934, lng: 81.0550 },
  { keywords: ["nuwara eliya", "hatton", "talawakele"], lat: 6.9497, lng: 80.7891 },
  { keywords: ["matale", "dambulla", "sigiriya"], lat: 7.4675, lng: 80.6234 },
  { keywords: ["jaffna", "chavakachcheri", "point pedro", "northern"], lat: 9.6615, lng: 80.0255 },
  { keywords: ["kilinochchi"], lat: 9.3803, lng: 80.3770 },
  { keywords: ["mannar"], lat: 8.9810, lng: 79.9044 },
  { keywords: ["vavuniya"], lat: 8.7542, lng: 80.4982 },
  { keywords: ["trincomalee", "kinniya", "eastern"], lat: 8.5874, lng: 81.2152 },
  { keywords: ["batticaloa", "kattankudy", "eravur"], lat: 7.7310, lng: 81.6747 },
  { keywords: ["ampara", "kalmunai", "akkaraipattu"], lat: 7.2912, lng: 81.6724 },
  { keywords: ["hambantota", "tangalle", "beliatta", "ambalantota"], lat: 6.1429, lng: 81.1212 },
  { keywords: ["monaragala", "wellawaya", "buttala"], lat: 6.8728, lng: 81.3507 },
  { keywords: ["puttalam", "chilaw", "marawila", "wennappuwa"], lat: 8.0408, lng: 79.8394 },
];

/**
 * Resolves latitude/longitude from an address string or location name
 */
export function resolveSriLankanCoordinates(textOrAddress?: string | null): { latitude: number; longitude: number } {
  if (textOrAddress && typeof textOrAddress === "string") {
    const clean = textOrAddress.toLowerCase();
    for (const item of SRI_LANKA_COORDINATES) {
      for (const kw of item.keywords) {
        if (clean.includes(kw)) {
          return { latitude: item.lat, longitude: item.lng };
        }
      }
    }
  }
  // Default to Kandy / Colombo center
  return { latitude: 7.2906, longitude: 80.6337 };
}

/**
 * Comprehensive Vehicle Type Synonyms Map for Sri Lankan Taxi & Transport
 */
const TYPE_SYNONYMS: Record<string, string[]> = {
  "Tuk": [
    "tuk", "tuktuk", "tuk tuk", "tuk-tuk",
    "three wheel", "three-wheel", "three wheeler", "threewheeler", "three-wheeler",
    "3 wheel", "3-wheel", "3wheeler", "3-wheeler",
    "auto", "auto rickshaw", "autorickshaw",
    "trishaw", "wheel", "bajaj", "piaggio", "tuks"
  ],
  "Bike": [
    "bike", "motor bike", "motorbike", "motorcycle", "motor cycle", "scooter", "scooty", "two wheeler"
  ],
  "Car": [
    "car", "taxi", "sedan", "hatchback", "alto", "wagonr", "wagon-r", "prius", "aqua", "axio", "fit", "vitz"
  ],
  "Flex": [
    "flex", "economy", "budget", "compact"
  ],
  "Mini Van": [
    "mini van", "minivan", "mini-van", "every", "hijet", "clip", "micro van"
  ],
  "Van": [
    "van", "kdh", "dolphin", "caravan", "hiace", "commuter", "tour van"
  ],
  "Batta": [
    "batta", "dimo", "dimo batta", "dimobatta", "maximo", "small truck", "mini truck"
  ],
  "Truck": [
    "truck", "canter", "elf", "lorry", "commercial truck"
  ],
  "Tipper": [
    "tipper", "dump truck"
  ],
  "10 wheel Tipper": [
    "10 wheel tipper", "10 wheel", "10 wheeler", "10-wheel", "heavy tipper"
  ],
  "Large Tractor": [
    "large tractor", "big tractor"
  ],
  "Farm Tractor": [
    "farm tractor", "tractor", "kubota", "4 wheel tractor", "land master"
  ]
};

/**
 * Intelligently resolves a VehicleTypeId from UUID, Type Name, or common Sri Lankan synonyms.
 * Never silently defaults to Bike when a Tuk or Car is requested!
 */
export async function resolveVehicleTypeId(query?: any, fallbackCategory: "hire" | "transport" = "hire"): Promise<string> {
  if (!query) {
    // Default sensible fallback: Tuk for hire, Batta for transport
    const defaultTypeName = fallbackCategory === "transport" ? "Batta" : "Tuk";
    const defaultVt = await db.VehicleType.findOne({ where: { type: defaultTypeName } });
    if (defaultVt) return defaultVt.id;
    const anyVt = await db.VehicleType.findOne();
    return anyVt ? anyVt.id : "";
  }

  const queryStr = String(query).trim();

  // 1. Check if it's already a valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryStr);
  if (isUuid) {
    const existingById = await db.VehicleType.findByPk(queryStr);
    if (existingById) return existingById.id;
  }

  // 2. Normalize string and match against known synonyms
  const clean = queryStr.toLowerCase().replace(/[_\s-]+/g, " ").trim();

  for (const [canonicalType, synonyms] of Object.entries(TYPE_SYNONYMS)) {
    for (const syn of synonyms) {
      if (clean === syn || clean.includes(syn) || syn.includes(clean)) {
        const found = await db.VehicleType.findOne({ where: { type: canonicalType } });
        if (found) return found.id;
      }
    }
  }

  // 3. Bidirectional database check (e.g. type ILIKE %clean% or clean ILIKE %type%)
  const allTypes = await db.VehicleType.findAll();
  for (const vt of allTypes) {
    const vtName = vt.type.toLowerCase();
    if (clean.includes(vtName) || vtName.includes(clean)) {
      return vt.id;
    }
  }

  // 4. Fallback safely based on category
  const preferredFallback = fallbackCategory === "transport" ? "Batta" : "Tuk";
  const fallbackVt = await db.VehicleType.findOne({ where: { type: preferredFallback } });
  if (fallbackVt) return fallbackVt.id;

  const firstVt = await db.VehicleType.findOne();
  return firstVt ? firstVt.id : "";
}

/**
 * Calculates Haversine distance in kilometers between two GPS coordinate pairs
 */
export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Safely parses any boolean, string, number or status string representation of driver online state
 */
export function parseOnlineStatus(body: any): boolean | undefined {
  if (!body || typeof body !== "object") return undefined;
  const raw = body.isOnline ?? body.isActive ?? body.online ?? body.active;
  if (raw !== undefined && raw !== null) {
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "number") return raw === 1;
    if (typeof raw === "string") {
      const s = raw.trim().toLowerCase();
      if (s === "true" || s === "1" || s === "online" || s === "active") return true;
      if (s === "false" || s === "0" || s === "offline" || s === "inactive") return false;
    }
  }
  if (body.status !== undefined && body.status !== null) {
    const s = String(body.status).trim().toLowerCase();
    if (s === "online" || s === "active") return true;
    if (s === "offline" || s === "inactive") return false;
  }
  return undefined;
}

