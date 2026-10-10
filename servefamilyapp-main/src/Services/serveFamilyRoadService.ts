const BACKEND_URL = "https://test.servefamily.com";
const ROAD_TRACE_URL = `${BACKEND_URL}/api/road-trace`;
const ROAD_DIRECTIONS_URL = `${BACKEND_URL}/api/road-directions`;
const DIRECTIONS_URL = `${BACKEND_URL}/api/directions`;

export interface DirectionPoint {
  lat: number;
  lng: number;
}

export interface RouteGeometry {
  type: "LineString" | "MultiLineString";
  coordinates: any;
}

export interface DirectionsResult {
  distanceKm: number;
  startAddress: string;
  endAddress: string;
  startLocation: DirectionPoint;
  endLocation: DirectionPoint;
  geometry: RouteGeometry;
}

export interface TaggedRoad {
  id?: string;
  consensus: "one_way" | "two_way" | string;
  oneWayDirection?: "forward" | "backward" | null;
  geometry: {
    type: "LineString";
    coordinates: number[][];
  };
}

async function parseJsonResponse(response: Response, label: string): Promise<any> {
  const raw = await response.text();

  console.log(`[${label}] status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    console.log(`[${label}] body (first 300 chars): ${raw.slice(0, 300)}`);
    throw new Error(`${label} failed with status ${response.status}.`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    console.log(`[${label}] response was not valid JSON: ${raw.slice(0, 200)}`);
    throw new Error(`${label} did not return JSON, the server may be down or misconfigured.`);
  }
}

export async function fetchRoadDirections(): Promise<TaggedRoad[]> {
  console.log("[roadTrace] fetching tagged roads from ServeFamily backend");
  const response = await fetch(ROAD_DIRECTIONS_URL);
  return parseJsonResponse(response, "road-directions");
}

export async function fetchDirections(origin: string, destination: string): Promise<DirectionsResult> {
  console.log(`[roadTrace] fetching directions: "${origin}" -> "${destination}"`);
  const url = `${DIRECTIONS_URL}?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  const response = await fetch(url);

  if (response.status === 400 || response.status === 404) {
    const raw = await response.text();
    let message = null;
    try {
      message = JSON.parse(raw).error;
    } catch {
      // Ignore
    }
    throw new Error(message || `directions failed with status ${response.status}.`);
  }

  return parseJsonResponse(response, "directions");
}
