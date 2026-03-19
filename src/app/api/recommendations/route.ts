import { NextRequest, NextResponse } from "next/server";
import { farmerLocations } from "@/lib/recommendation-data";
import { getCropRecommendations } from "@/lib/recommendations";
import {
  soilTypes,
  seasons,
  waterAvailabilityLevels,
  type RecommendationInput,
} from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;

  const soilType: RecommendationInput["soilType"] =
    typeof body.soilType === "string" &&
    soilTypes.includes(body.soilType as RecommendationInput["soilType"])
      ? (body.soilType as RecommendationInput["soilType"])
      : "Loamy";

  const season: RecommendationInput["season"] =
    typeof body.season === "string" &&
    seasons.includes(body.season as RecommendationInput["season"])
      ? (body.season as RecommendationInput["season"])
      : "Kharif";

  const waterAvailability: RecommendationInput["waterAvailability"] =
    typeof body.waterAvailability === "string" &&
    waterAvailabilityLevels.includes(body.waterAvailability as RecommendationInput["waterAvailability"])
      ? (body.waterAvailability as RecommendationInput["waterAvailability"])
      : "Medium";

  const location: RecommendationInput["location"] =
    typeof body.location === "string" &&
    farmerLocations.some((farmerLocation) => farmerLocation.name === body.location)
      ? body.location
      : "Tamil Nadu";

  const valueOrDefault = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return NextResponse.json(
    getCropRecommendations({
      soilType,
      season,
      temperature: valueOrDefault(body.temperature, 28),
      rainfall: valueOrDefault(body.rainfall, 650),
      humidity: valueOrDefault(body.humidity, 72),
      waterAvailability,
      location,
    }),
  );
}

