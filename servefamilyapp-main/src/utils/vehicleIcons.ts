import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export interface VehicleCategoryItem {
  id: string;
  name: string;
  type: string;
  category: "hire" | "transport";
  iconName: string;
  iconFamily: "Ionicons" | "MaterialCommunityIcons";
  baseFare: number;
  ratePerKm: number;
  seats?: number;
}

export const HIRE_VEHICLE_TYPES: VehicleCategoryItem[] = [
  { id: "9317062a-0062-4f42-9bd0-77f5cd79b74e", name: "Bike", type: "Bike", category: "hire", iconName: "motorbike", iconFamily: "MaterialCommunityIcons", baseFare: 80, ratePerKm: 50, seats: 1 },
  { id: "3a335e93-c7b3-4607-95f9-1018f313f27c", name: "Tuk", type: "Tuk", category: "hire", iconName: "rickshaw", iconFamily: "MaterialCommunityIcons", baseFare: 100, ratePerKm: 80, seats: 3 },
  { id: "e14648b8-d229-4623-b358-a5572ea1f122", name: "Car", type: "Car", category: "hire", iconName: "car", iconFamily: "MaterialCommunityIcons", baseFare: 200, ratePerKm: 120, seats: 4 },
  { id: "79bd5265-818d-46b5-8191-c7e53f9d2849", name: "Flex", type: "Flex", category: "hire", iconName: "car-hatchback", iconFamily: "MaterialCommunityIcons", baseFare: 250, ratePerKm: 140, seats: 4 },
  { id: "f943b21a-5b84-4b14-9be8-deaddda5d717", name: "Mini Van", type: "Mini Van", category: "hire", iconName: "van-utility", iconFamily: "MaterialCommunityIcons", baseFare: 350, ratePerKm: 170, seats: 7 },
  { id: "fee736ec-1be6-4e42-83d9-2b6e951e64e3", name: "Van", type: "Van", category: "hire", iconName: "van-passenger", iconFamily: "MaterialCommunityIcons", baseFare: 450, ratePerKm: 200, seats: 10 },
];

export const TRANSPORT_VEHICLE_TYPES: VehicleCategoryItem[] = [
  { id: "2a41b671-9991-497d-abe5-8a098858b18e", name: "Batta", type: "Batta", category: "transport", iconName: "truck-delivery", iconFamily: "MaterialCommunityIcons", baseFare: 400, ratePerKm: 180, seats: 2 },
  { id: "45b4b36a-a66b-4772-be61-02f4cdaeae1f", name: "Truck", type: "Truck", category: "transport", iconName: "truck", iconFamily: "MaterialCommunityIcons", baseFare: 800, ratePerKm: 300, seats: 2 },
  { id: "15c96c0c-1d2b-48a9-933a-c1c257aaf92c", name: "Tipper", type: "Tipper", category: "transport", iconName: "dump-truck", iconFamily: "MaterialCommunityIcons", baseFare: 1200, ratePerKm: 400, seats: 2 },
  { id: "1926ffe3-938b-4780-bd9e-32f000804ced", name: "10 wheel Tipper", type: "10 wheel Tipper", category: "transport", iconName: "dump-truck", iconFamily: "MaterialCommunityIcons", baseFare: 2000, ratePerKm: 600, seats: 2 },
  { id: "ec9da351-f3f2-498d-84f1-9f2ef5996a6a", name: "Large Tractor", type: "Large Tractor", category: "transport", iconName: "tractor", iconFamily: "MaterialCommunityIcons", baseFare: 1000, ratePerKm: 350, seats: 1 },
  { id: "115d9648-de44-4565-ae8e-fdf26bf2d959", name: "Farm Tractor", type: "Farm Tractor", category: "transport", iconName: "tractor", iconFamily: "MaterialCommunityIcons", baseFare: 900, ratePerKm: 300, seats: 1 },
];

export function getVehicleIconDetails(typeName: string): {
  iconName: string;
  iconFamily: "Ionicons" | "MaterialCommunityIcons";
  category: "hire" | "transport";
} {
  const normalized = (typeName || "").trim().toLowerCase();

  // Match UUIDs first
  if (normalized === "9317062a-0062-4f42-9bd0-77f5cd79b74e") return { iconName: "motorbike", iconFamily: "MaterialCommunityIcons", category: "hire" };
  if (normalized === "3a335e93-c7b3-4607-95f9-1018f313f27c") return { iconName: "rickshaw", iconFamily: "MaterialCommunityIcons", category: "hire" };
  if (normalized === "e14648b8-d229-4623-b358-a5572ea1f122") return { iconName: "car", iconFamily: "MaterialCommunityIcons", category: "hire" };
  if (normalized === "79bd5265-818d-46b5-8191-c7e53f9d2849") return { iconName: "car-hatchback", iconFamily: "MaterialCommunityIcons", category: "hire" };
  if (normalized === "f943b21a-5b84-4b14-9be8-deaddda5d717") return { iconName: "van-utility", iconFamily: "MaterialCommunityIcons", category: "hire" };
  if (normalized === "fee736ec-1be6-4e42-83d9-2b6e951e64e3") return { iconName: "van-passenger", iconFamily: "MaterialCommunityIcons", category: "hire" };

  if (normalized === "2a41b671-9991-497d-abe5-8a098858b18e") return { iconName: "truck-delivery", iconFamily: "MaterialCommunityIcons", category: "transport" };
  if (normalized === "45b4b36a-a66b-4772-be61-02f4cdaeae1f") return { iconName: "truck", iconFamily: "MaterialCommunityIcons", category: "transport" };
  if (normalized === "15c96c0c-1d2b-48a9-933a-c1c257aaf92c") return { iconName: "dump-truck", iconFamily: "MaterialCommunityIcons", category: "transport" };
  if (normalized === "1926ffe3-938b-4780-bd9e-32f000804ced") return { iconName: "dump-truck", iconFamily: "MaterialCommunityIcons", category: "transport" };
  if (normalized === "ec9da351-f3f2-498d-84f1-9f2ef5996a6a") return { iconName: "tractor", iconFamily: "MaterialCommunityIcons", category: "transport" };
  if (normalized === "115d9648-de44-4565-ae8e-fdf26bf2d959") return { iconName: "tractor", iconFamily: "MaterialCommunityIcons", category: "transport" };

  // Match names
  if (normalized.includes("bike") || normalized.includes("motorcycle")) {
    return { iconName: "motorbike", iconFamily: "MaterialCommunityIcons", category: "hire" };
  }
  if (normalized.includes("tuk") || normalized.includes("three") || normalized.includes("auto")) {
    return { iconName: "rickshaw", iconFamily: "MaterialCommunityIcons", category: "hire" };
  }
  if (normalized.includes("flex")) {
    return { iconName: "car-hatchback", iconFamily: "MaterialCommunityIcons", category: "hire" };
  }
  if (normalized.includes("mini van")) {
    return { iconName: "van-utility", iconFamily: "MaterialCommunityIcons", category: "hire" };
  }
  if (normalized.includes("van")) {
    return { iconName: "van-passenger", iconFamily: "MaterialCommunityIcons", category: "hire" };
  }
  if (normalized.includes("car") || normalized.includes("sedan")) {
    return { iconName: "car", iconFamily: "MaterialCommunityIcons", category: "hire" };
  }

  // Transport category
  if (normalized.includes("batta")) {
    return { iconName: "truck-delivery", iconFamily: "MaterialCommunityIcons", category: "transport" };
  }
  if (normalized.includes("tipper")) {
    return { iconName: "dump-truck", iconFamily: "MaterialCommunityIcons", category: "transport" };
  }
  if (normalized.includes("truck") || normalized.includes("lorry")) {
    return { iconName: "truck", iconFamily: "MaterialCommunityIcons", category: "transport" };
  }
  if (normalized.includes("tractor")) {
    return { iconName: "tractor", iconFamily: "MaterialCommunityIcons", category: "transport" };
  }

  return { iconName: "car", iconFamily: "MaterialCommunityIcons", category: "hire" };
}


