import { farmerLocations } from "@/lib/recommendation-data";
import type { FarmerLocation } from "@/lib/types";

export const ALL_INDIA_LOCATION_NAME = "All India";

export const marketCropSuggestions = [
  "Banana",
  "Coconut",
  "Rice",
  "Tomato",
  "Onion",
  "Maize",
  "Mango",
  "Coffee",
];

export function haversineDistanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const originLatitude = toRadians(latitudeA);
  const destinationLatitude = toRadians(latitudeB);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function findNearestFarmerLocation(latitude: number, longitude: number): FarmerLocation {
  return farmerLocations.reduce((nearest, location) => {
    const nearestDistance = haversineDistanceKm(
      latitude,
      longitude,
      nearest.latitude,
      nearest.longitude,
    );
    const candidateDistance = haversineDistanceKm(
      latitude,
      longitude,
      location.latitude,
      location.longitude,
    );

    return candidateDistance < nearestDistance ? location : nearest;
  }, farmerLocations[0]);
}
