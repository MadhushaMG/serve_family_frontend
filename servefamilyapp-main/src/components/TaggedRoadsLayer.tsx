import React from "react";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { TaggedRoad } from "@/src/Services/serveFamilyRoadService";

export const CONSENSUS_COLORS = { one_way: "#e08e2b", two_way: "#2ecc71" };

export function buildTaggedRoadsGeoJson(taggedRoads: TaggedRoad[]) {
  return {
    type: "FeatureCollection" as const,
    features: taggedRoads.map((road) => {
      const coordinates =
        road.oneWayDirection === "backward"
          ? [...road.geometry.coordinates].reverse()
          : road.geometry.coordinates;

      return {
        type: "Feature" as const,
        geometry: { ...road.geometry, coordinates },
        properties: {
          consensus: road.consensus,
          showArrow: road.consensus === "one_way" && Boolean(road.oneWayDirection),
        },
      };
    }),
  };
}

interface TaggedRoadsLayerProps {
  data: ReturnType<typeof buildTaggedRoadsGeoJson>;
}

export default function TaggedRoadsLayer({ data }: TaggedRoadsLayerProps) {
  if (!data || !data.features || data.features.length === 0) return null;

  return (
    <GeoJSONSource id="taggedRoadsSource" data={data}>
      <Layer
        id="taggedRoadsLine"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-width": 3,
          "line-color": [
            "match",
            ["get", "consensus"],
            "one_way",
            CONSENSUS_COLORS.one_way,
            "two_way",
            CONSENSUS_COLORS.two_way,
            "#999999",
          ],
        }}
      />
      <Layer
        id="taggedRoadsArrows"
        type="symbol"
        filter={["==", ["get", "showArrow"], true]}
        layout={{
          "symbol-placement": "line",
          "symbol-spacing": 40,
          "text-field": "▶",
          "text-size": 16,
          "text-rotation-alignment": "map",
          "text-pitch-alignment": "map",
          "text-keep-upright": false,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        }}
        paint={{
          "text-color": "#7a4a00",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        }}
      />
    </GeoJSONSource>
  );
}
