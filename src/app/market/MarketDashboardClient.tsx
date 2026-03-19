"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  DatabaseZap,
  LoaderCircle,
  LocateFixed,
  MapPinned,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { farmerLocations } from "@/lib/recommendation-data";
import {
  ALL_INDIA_LOCATION_NAME,
  findNearestFarmerLocation,
  marketCropSuggestions,
} from "@/lib/market-data";
import type { MarketDashboardResponse, MarketRecordWithInsights } from "@/lib/types";

const radiusOptions = [50, 120, 250];
const marketRegionOptions = [
  ALL_INDIA_LOCATION_NAME,
  ...Array.from(new Set(farmerLocations.map((location) => location.state))).sort((a, b) =>
    a.localeCompare(b, "en-IN"),
  ),
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDistance(distanceKm: number | null) {
  if (distanceKm === null) {
    return "Distance unavailable";
  }

  return `${Math.round(distanceKm)} km`;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getAlertStyles(tone: string) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (tone === "caution") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-800";
}

function formatLocationLabel(locationName: string) {
  if (locationName === ALL_INDIA_LOCATION_NAME) {
    return ALL_INDIA_LOCATION_NAME;
  }

  const location = farmerLocations.find((item) => item.name === locationName);
  if (!location) {
    return locationName;
  }

  return location.name === location.state ? location.name : `${location.name}, ${location.state}`;
}

function formatRegionLabel(regionName: string) {
  if (regionName === ALL_INDIA_LOCATION_NAME) {
    return ALL_INDIA_LOCATION_NAME;
  }

  return regionName;
}

function getComparisonCopy(
  scope: MarketDashboardResponse["query"]["scope"],
  locationLabel: string,
  radiusKm: number,
) {
  if (scope === "all-india") {
    return "Showing the best matching market options across India.";
  }

  if (scope === "state") {
    return `Showing the best matching markets in ${locationLabel}.`;
  }

  if (scope === "radius") {
    return `Showing the best matching markets within about ${radiusKm} km of ${locationLabel}.`;
  }

  return `Showing the best matching markets for ${locationLabel}, with an India-wide fallback when local matches are unavailable.`;
}

function TrendBadge({ record }: { record: MarketRecordWithInsights }) {
  if (record.trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
        <TrendingUp className="h-3.5 w-3.5" />
        {record.trendLabel} ({record.changePercent > 0 ? "+" : ""}
        {record.changePercent}%)
      </span>
    );
  }

  if (record.trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
        <TrendingDown className="h-3.5 w-3.5" />
        {record.trendLabel} ({record.changePercent}%)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
      Stable (0%)
    </span>
  );
}

export function MarketDashboardClient() {
  const [cropQuery, setCropQuery] = useState("Banana");
  const [location, setLocation] = useState(ALL_INDIA_LOCATION_NAME);
  const [radiusKm, setRadiusKm] = useState(120);
  const [dashboard, setDashboard] = useState<MarketDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [geoMessage, setGeoMessage] = useState("Showing the best crop markets across India.");
  const deferredCrop = useDeferredValue(cropQuery);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          crop: deferredCrop,
          location,
          radiusKm: String(radiusKm),
        });
        const result = await fetch(`/api/market?${params.toString()}`);

        if (!result.ok) {
          throw new Error("Unable to fetch market data");
        }

        const payload = (await result.json()) as MarketDashboardResponse;
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDashboard(payload);
        });
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load market prices.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [deferredCrop, location, radiusKm]);

  function handleLocationChange(nextRegion: string) {
    setLocation(nextRegion);
    setGeoMessage(
      nextRegion === ALL_INDIA_LOCATION_NAME
        ? "Showing the best crop markets across India."
        : `Showing market suggestions for ${formatRegionLabel(nextRegion)}.`,
    );
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setGeoMessage("Geolocation is not available in this browser, so the selected location is being used.");
      return;
    }

    setGeoMessage("Checking your nearest supported market location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = findNearestFarmerLocation(position.coords.latitude, position.coords.longitude);
        setLocation(nearest.name);
        setGeoMessage(`Using the nearest supported market location: ${formatLocationLabel(nearest.name)}.`);
      },
      () => {
        setGeoMessage("Location access was not available, so the selected location is still being used.");
      },
    );
  }

  const records = dashboard?.records ?? [];
  const nearbyMarkets = dashboard?.nearbyMarkets ?? [];
  const bestNearbyMarket = dashboard?.bestNearbyMarket;
  const bestMarket = dashboard?.bestMarket;
  const prediction = dashboard?.prediction;
  const summary = dashboard?.summary;
  const currentScope =
    dashboard?.query.scope ?? (location === ALL_INDIA_LOCATION_NAME ? "all-india" : "state");
  const selectedLocationLabel = formatLocationLabel(dashboard?.query.location ?? location);
  const comparisonCopy = getComparisonCopy(currentScope, selectedLocationLabel, radiusKm);
  const radiusDisabled = location === ALL_INDIA_LOCATION_NAME;
  const bestOption = bestNearbyMarket ?? bestMarket;
  const bestOptionMetricLabel =
    currentScope === "all-india"
      ? "Coverage"
      : currentScope === "state"
        ? "Selected region"
        : "Distance";
  const bestOptionMetricValue =
    currentScope === "all-india"
      ? "All India"
      : currentScope === "state"
        ? selectedLocationLabel
        : formatDistance(bestOption?.distanceKm ?? null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#1f463c_0%,#275d50_45%,#cf9a3f_100%)] p-8 text-white shadow-[0_30px_80px_rgba(31,70,60,0.28)]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur">
            <DatabaseZap className="h-4 w-4" />
            Market intelligence dashboard
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Compare prices across India, see the next-week outlook, and know exactly what kind of data you are viewing.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50/90 sm:text-lg">
            The page now distinguishes cached snapshot prices from historical dataset prices, adds a
            next-week forecast, and lets you switch between an India-wide view and a selected state or UT.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/15 bg-black/10 p-4">
              <p className="text-sm text-emerald-100/80">Price mode</p>
              <p className="mt-2 text-2xl font-semibold">{summary?.latestPriceLabel ?? "Loading..."}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 bg-black/10 p-4">
              <p className="text-sm text-emerald-100/80">Selection scope</p>
              <p className="mt-2 text-2xl font-semibold">{selectedLocationLabel}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 bg-black/10 p-4">
              <p className="text-sm text-emerald-100/80">Live API status</p>
              <p className="mt-2 text-2xl font-semibold">Not connected</p>
            </div>
          </div>
        </div>

        <Card className="rounded-[2rem] border-emerald-100 bg-white/90">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700/80">
                Best market option
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                {bestOption?.market ?? "Waiting for data"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{comparisonCopy}</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              {selectedLocationLabel}
            </span>
          </div>

          {bestOption ? (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-700/80">
                    {summary?.latestPriceLabel ?? "Latest price"}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatPrice(bestOption.price)}/{bestOption.unit}
                  </p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-sky-700/80">{bestOptionMetricLabel}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{bestOptionMetricValue}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-700/80">Demand</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{bestOption.demand}</p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Source clarity</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{summary?.explanation}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Latest update shown: {summary ? formatUpdatedAt(summary.updatedAt) : "--"}
                </p>
                <div className="mt-4">
                  <TrendBadge record={bestOption} />
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              No matching records were found for the current crop search.
            </p>
          )}
        </Card>
      </section>

      <Card className="rounded-[2rem] border-white/70 bg-white/88">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-slate-900">Search and market filters</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Search by crop and switch between an India-wide view and any state or UT.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            <MapPinned className="h-4 w-4" />
            {geoMessage}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,1fr,auto]">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Crop search
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                className="w-full bg-transparent text-slate-900 outline-none"
                placeholder="Banana, Rice, Tomato..."
                suppressHydrationWarning
                value={cropQuery}
                onChange={(event) => setCropQuery(event.target.value)}
              />
            </div>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Market region
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
              suppressHydrationWarning
              value={location}
              onChange={(event) => handleLocationChange(event.target.value)}
            >
              {marketRegionOptions.map((regionOption) => (
                <option key={regionOption} value={regionOption}>
                  {formatRegionLabel(regionOption)}
                </option>
              ))}
            </select>
            <span className="text-xs leading-5 text-slate-500">
              Selected region: {formatRegionLabel(location)}
            </span>
          </label>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            suppressHydrationWarning
            type="button"
            onClick={handleUseMyLocation}
          >
            <LocateFixed className="h-4 w-4" />
            Use my location
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {marketCropSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                cropQuery.toLowerCase() === suggestion.toLowerCase()
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              suppressHydrationWarning
              type="button"
              onClick={() => setCropQuery(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </Card>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Markets listed</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {isLoading ? "--" : summary?.totalRecords ?? 0}
          </p>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average price</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {isLoading ? "--" : `${formatPrice(summary?.averagePrice ?? 0)}/kg`}
          </p>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Highest price</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {isLoading ? "--" : `${formatPrice(summary?.highestPrice ?? 0)}/kg`}
          </p>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Next-week prediction</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {prediction ? `${formatPrice(prediction.nextWeekPrice)}/kg` : "--"}
          </p>
        </Card>
      </section>

      {error ? (
        <Card className="mt-6 rounded-[1.75rem] border-rose-200 bg-rose-50">
          <p className="text-sm font-semibold text-rose-900">Market data is unavailable</p>
          <p className="mt-2 text-sm leading-6 text-rose-800/80">{error}</p>
        </Card>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/88">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Alerts and selling signals</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Signals generated from recent trend movement plus the next-week forecast.
              </p>
            </div>
            {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" /> : null}
          </div>

          <div className="mt-6 grid gap-4">
            {(dashboard?.alerts ?? []).map((alert) => (
              <div key={alert.id} className={`rounded-[1.5rem] border p-5 ${getAlertStyles(alert.tone)}`}>
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="mt-2 text-sm leading-6 opacity-90">{alert.message}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-emerald-700" />
              <p className="text-sm font-semibold text-slate-900">Next week price prediction</p>
            </div>
            {prediction ? (
              <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                <p>
                  Projected price: <span className="font-semibold text-slate-900">{formatPrice(prediction.nextWeekPrice)}/kg</span>
                </p>
                <p>
                  Expected movement: <span className="font-semibold text-slate-900">{prediction.projectedChangePercent > 0 ? "+" : ""}{prediction.projectedChangePercent}%</span>
                </p>
                <p>Model: {prediction.model}</p>
                <p>Confidence: {prediction.confidence}</p>
                <p>{prediction.basis}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Not enough historical coverage was available to build a forecast for this crop.
              </p>
            )}
          </div>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-white/88">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Market comparison for selected region</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{comparisonCopy}</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-amber-700" />
          </div>

          <div className="mt-6 grid gap-4">
            {nearbyMarkets.map((record) => (
              <div key={record.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{record.market}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {record.location}, {record.state}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{record.dataLabel}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <p className="text-2xl font-semibold text-slate-900">{formatPrice(record.price)}/{record.unit}</p>
                    <TrendBadge record={record} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    Distance: {formatDistance(record.distanceKm)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    Demand: {record.demand}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    Updated: {formatUpdatedAt(record.updatedAt)}
                  </span>
                </div>
              </div>
            ))}

            {!isLoading && nearbyMarkets.length === 0 ? (
              <p className="text-sm leading-6 text-slate-600">
                No market options matched the current crop filter.
              </p>
            ) : null}
          </div>
        </Card>
      </section>

      <Card className="mt-6 rounded-[2rem] border-white/70 bg-white/88">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Price board</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Detailed view of the filtered markets, sorted by the latest known price.
            </p>
          </div>
          {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" /> : null}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="pb-4 pr-6 font-medium">Crop</th>
                <th className="pb-4 pr-6 font-medium">Market</th>
                <th className="pb-4 pr-6 font-medium">Price label</th>
                <th className="pb-4 pr-6 font-medium">Latest</th>
                <th className="pb-4 pr-6 font-medium">Previous</th>
                <th className="pb-4 pr-6 font-medium">Trend</th>
                <th className="pb-4 pr-6 font-medium">Distance</th>
                <th className="pb-4 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="align-top text-sm text-slate-700">
                  <td className="py-4 pr-6 font-semibold text-slate-900">{record.crop}</td>
                  <td className="py-4 pr-6">
                    <div>
                      <p className="font-medium text-slate-900">{record.market}</p>
                      <p className="text-slate-500">{record.location}</p>
                    </div>
                  </td>
                  <td className="py-4 pr-6">{record.dataLabel}</td>
                  <td className="py-4 pr-6">{formatPrice(record.price)}/{record.unit}</td>
                  <td className="py-4 pr-6">{formatPrice(record.previousPrice)}/{record.unit}</td>
                  <td className="py-4 pr-6">
                    <TrendBadge record={record} />
                  </td>
                  <td className="py-4 pr-6">{formatDistance(record.distanceKm)}</td>
                  <td className="py-4 font-medium text-slate-900">{formatUpdatedAt(record.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!isLoading && records.length === 0 ? (
            <p className="py-8 text-sm leading-6 text-slate-600">
              No market records matched the current crop filter.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
