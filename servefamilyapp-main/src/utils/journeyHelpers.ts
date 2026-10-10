import { Journey, JourneyHistoryPoint, LocationHistoryEntry } from "../types/models";

export interface LatLng { latitude: number; longitude: number; }


export function groupIntoJourneys(history: LocationHistoryEntry[]): Journey[] {
    if (!history || history.length === 0) return [];

    const groupedSegments: LocationHistoryEntry[][] = [];
    let currentSegment: LocationHistoryEntry[] = [];

    for (let i = 0; i < history.length; i++) {
        const entry = history[i];

        if (currentSegment.length === 0) {
            currentSegment.push(entry);
        } else {
            const currentName = currentSegment[0].name;
            if (entry.name === currentName) {
                currentSegment.push(entry);
            } else {
                groupedSegments.push(currentSegment);
                currentSegment = [entry];
            }
        }
    }

    if (currentSegment.length > 0) {
        groupedSegments.push(currentSegment);
    }


    return groupedSegments.map((segment) => {
        const firstPoint = segment[0];
        const lastPoint = segment[segment.length - 1];


        const historyPoints: JourneyHistoryPoint[] = segment.map(p => ({
            id: p.id,
            latitude: p.latitude,
            longitude: p.longitude,
            timestamp: p.createdAt,
            name: p.name || undefined
        }));

        return {
            journeyName: firstPoint.name || "Unknown Journey",
            startTime: firstPoint.createdAt,
            endTime: lastPoint.createdAt,
            history: historyPoints
        };
    });
}


export function decodePolyline(encoded: string): LatLng[] {
    const poly: LatLng[] = [];
    let index = 0,
        len = encoded.length;
    let lat = 0,
        lng = 0;

    while (index < len) {
        let b,
            shift = 0,
            result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = result & 1 ? ~(result >> 1) : result >> 1;
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = result & 1 ? ~(result >> 1) : result >> 1;
        lng += dlng;

        poly.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5,
        });
    }
    return poly;
}


export async function fetchOsrmRoute(points: LatLng[]): Promise<LatLng[]> {
    if (points.length < 2) return [];

    const origin = `${points[0].latitude},${points[0].longitude}`;
    const destination = `${points[points.length - 1].latitude},${points[points.length - 1].longitude}`;

    try {
        const response = await fetch(`https://test.servefamily.com/api/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
        if (response.ok) {
            const data = await response.json();
            if (data.geometry?.coordinates) {
                return data.geometry.coordinates.map((c: [number, number]) => ({ latitude: c[1], longitude: c[0] }));
            }
        }
    } catch {
        // Continue to fallback
    }

    const MAX_OSRM_POINTS = 100;
    let sampledPoints = points;
    if (points.length > MAX_OSRM_POINTS) {
        const step = Math.floor(points.length / MAX_OSRM_POINTS);
        sampledPoints = points.filter((_, i) => i % step === 0);
        if (sampledPoints[sampledPoints.length - 1] !== points[points.length - 1]) {
            sampledPoints.push(points[points.length - 1]);
        }
    }

    const coordinatesStr = sampledPoints
        .map((p) => `${p.longitude},${p.latitude}`)
        .join(";");

    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesStr}?overview=full&geometries=polyline`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
            return decodePolyline(data.routes[0].geometry);
        }
        console.warn("OSRM error:", data.code);
        return [];
    } catch (error) {
        console.error("Failed to fetch OSRM route:", error);
        return [];
    }
}
