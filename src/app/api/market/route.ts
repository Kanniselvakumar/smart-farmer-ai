import { NextRequest, NextResponse } from "next/server";
import { ALL_INDIA_LOCATION_NAME } from "@/lib/market-data";
import { getMarketDashboardData } from "@/lib/market-service";

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const crop = searchParams.get("crop") ?? "";
  const location = searchParams.get("location") ?? ALL_INDIA_LOCATION_NAME;
  const radiusParam = Number(searchParams.get("radiusKm") ?? "120");
  const radiusKm = Number.isFinite(radiusParam) && radiusParam > 0 ? radiusParam : 120;

  return NextResponse.json(
    getMarketDashboardData({
      crop,
      location,
      radiusKm,
    }),
  );
}
