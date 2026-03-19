import "server-only";

import fs from "node:fs";
import path from "node:path";
import { ALL_INDIA_LOCATION_NAME, haversineDistanceKm } from "@/lib/market-data";
import { cropProfiles, farmerLocations } from "@/lib/recommendation-data";
import type {
  CropProfile,
  MarketAlert,
  MarketDashboardResponse,
  MarketQueryScope,
  MarketPrediction,
  MarketRecord,
  MarketRecordWithInsights,
  MarketTrend,
  ProfitSuggestion,
} from "@/lib/types";

type HistoricalObservation = {
  cropKey: string;
  cropName: string;
  market: string;
  district: string;
  state: string;
  price: number;
  previousPrice: number;
  date: string;
  source: string;
};

type HistoricalStore = {
  latestRecords: Map<string, HistoricalObservation[]>;
  series: Map<string, Array<{ date: string; timestamp: number; price: number }>>;
};

const localSnapshotRecords: MarketRecord[] = [
  {
    id: "banana-kolkata",
    crop: "Banana",
    market: "Koley Market",
    district: "Kolkata",
    location: "Kolkata",
    state: "West Bengal",
    latitude: 22.5726,
    longitude: 88.3639,
    price: 39,
    previousPrice: 37,
    demand: "High",
    source: "Local state demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:30:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached state snapshot",
  },
  {
    id: "rice-burdwan",
    crop: "Rice",
    market: "Burdwan Market Yard",
    district: "Purba Bardhaman",
    location: "Burdwan",
    state: "West Bengal",
    latitude: 23.2324,
    longitude: 87.8615,
    price: 53,
    previousPrice: 51,
    demand: "High",
    source: "Local state demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:22:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached state snapshot",
  },
  {
    id: "banana-chennai-fruit",
    crop: "Banana",
    market: "Koyambedu Fruit Market",
    district: "Chennai",
    location: "Chennai",
    state: "Tamil Nadu",
    latitude: 13.0693,
    longitude: 80.2045,
    price: 40,
    previousPrice: 38,
    demand: "High",
    source: "Local state demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:18:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached state snapshot",
  },
  {
    id: "banana-panaji",
    crop: "Banana",
    market: "Panaji Market",
    district: "North Goa",
    location: "Panaji",
    state: "Goa",
    latitude: 15.4909,
    longitude: 73.8278,
    price: 42,
    previousPrice: 40,
    demand: "High",
    source: "Local state demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:10:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached state snapshot",
  },
  {
    id: "tomato-margao",
    crop: "Tomato",
    market: "Margao Market",
    district: "South Goa",
    location: "Margao",
    state: "Goa",
    latitude: 15.2993,
    longitude: 73.958,
    price: 37,
    previousPrice: 35,
    demand: "High",
    source: "Local state demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:12:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached state snapshot",
  },
  {
    id: "tomato-koyambedu",
    crop: "Tomato",
    market: "Koyambedu Market",
    district: "Chennai",
    location: "Chennai",
    state: "Tamil Nadu",
    latitude: 13.0693,
    longitude: 80.2045,
    price: 34,
    previousPrice: 31,
    demand: "High",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:30:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "tomato-tambaram",
    crop: "Tomato",
    market: "Tambaram Market",
    district: "Chennai",
    location: "Tambaram",
    state: "Tamil Nadu",
    latitude: 12.9249,
    longitude: 80.1275,
    price: 33,
    previousPrice: 32,
    demand: "High",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:20:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "tomato-chengalpattu",
    crop: "Tomato",
    market: "Chengalpattu Market",
    district: "Chengalpattu",
    location: "Chengalpattu",
    state: "Tamil Nadu",
    latitude: 12.692,
    longitude: 79.9776,
    price: 32,
    previousPrice: 31,
    demand: "Medium",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:10:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "tomato-madurai",
    crop: "Tomato",
    market: "Madurai Central Market",
    district: "Madurai",
    location: "Madurai",
    state: "Tamil Nadu",
    latitude: 9.9252,
    longitude: 78.1198,
    price: 37,
    previousPrice: 35,
    demand: "High",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:05:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "tomato-coimbatore",
    crop: "Tomato",
    market: "Coimbatore Uzhavar Sandhai",
    district: "Coimbatore",
    location: "Coimbatore",
    state: "Tamil Nadu",
    latitude: 11.0168,
    longitude: 76.9558,
    price: 35,
    previousPrice: 36,
    demand: "High",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:15:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "rice-koyambedu",
    crop: "Rice",
    market: "Koyambedu Market",
    district: "Chennai",
    location: "Chennai",
    state: "Tamil Nadu",
    latitude: 13.0693,
    longitude: 80.2045,
    price: 48,
    previousPrice: 48,
    demand: "High",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:35:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "rice-trichy",
    crop: "Rice",
    market: "Trichy Gandhi Market",
    district: "Trichy",
    location: "Trichy",
    state: "Tamil Nadu",
    latitude: 10.816,
    longitude: 78.6967,
    price: 52,
    previousPrice: 50,
    demand: "High",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:10:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "rice-madurai",
    crop: "Rice",
    market: "Madurai Central Market",
    district: "Madurai",
    location: "Madurai",
    state: "Tamil Nadu",
    latitude: 9.9252,
    longitude: 78.1198,
    price: 49,
    previousPrice: 48,
    demand: "Medium",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:12:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "rice-erode",
    crop: "Rice",
    market: "Erode Regulated Market",
    district: "Erode",
    location: "Erode",
    state: "Tamil Nadu",
    latitude: 11.341,
    longitude: 77.7172,
    price: 50,
    previousPrice: 51,
    demand: "Medium",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:07:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "rice-chengalpattu",
    crop: "Rice",
    market: "Chengalpattu Market",
    district: "Chengalpattu",
    location: "Chengalpattu",
    state: "Tamil Nadu",
    latitude: 12.692,
    longitude: 79.9776,
    price: 47,
    previousPrice: 46,
    demand: "Medium",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:02:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "onion-coimbatore",
    crop: "Onion",
    market: "Coimbatore Uzhavar Sandhai",
    district: "Coimbatore",
    location: "Coimbatore",
    state: "Tamil Nadu",
    latitude: 11.0168,
    longitude: 76.9558,
    price: 41,
    previousPrice: 39,
    demand: "High",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:22:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "onion-erode",
    crop: "Onion",
    market: "Erode Regulated Market",
    district: "Erode",
    location: "Erode",
    state: "Tamil Nadu",
    latitude: 11.341,
    longitude: 77.7172,
    price: 42,
    previousPrice: 40,
    demand: "High",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:18:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "maize-salem",
    crop: "Maize",
    market: "Salem Market Yard",
    district: "Salem",
    location: "Salem",
    state: "Tamil Nadu",
    latitude: 11.6643,
    longitude: 78.146,
    price: 29,
    previousPrice: 28,
    demand: "Medium",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:40:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "maize-erode",
    crop: "Maize",
    market: "Erode Regulated Market",
    district: "Erode",
    location: "Erode",
    state: "Tamil Nadu",
    latitude: 11.341,
    longitude: 77.7172,
    price: 31,
    previousPrice: 30,
    demand: "High",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:28:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "maize-trichy",
    crop: "Maize",
    market: "Trichy Gandhi Market",
    district: "Trichy",
    location: "Trichy",
    state: "Tamil Nadu",
    latitude: 10.816,
    longitude: 78.6967,
    price: 28,
    previousPrice: 29,
    demand: "Medium",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:14:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "groundnut-madurai",
    crop: "Groundnut",
    market: "Madurai Central Market",
    district: "Madurai",
    location: "Madurai",
    state: "Tamil Nadu",
    latitude: 9.9252,
    longitude: 78.1198,
    price: 64,
    previousPrice: 63,
    demand: "High",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:33:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "groundnut-trichy",
    crop: "Groundnut",
    market: "Trichy Gandhi Market",
    district: "Trichy",
    location: "Trichy",
    state: "Tamil Nadu",
    latitude: 10.816,
    longitude: 78.6967,
    price: 61,
    previousPrice: 60,
    demand: "Medium",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:29:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "cotton-coimbatore",
    crop: "Cotton",
    market: "Coimbatore Uzhavar Sandhai",
    district: "Coimbatore",
    location: "Coimbatore",
    state: "Tamil Nadu",
    latitude: 11.0168,
    longitude: 76.9558,
    price: 74,
    previousPrice: 73,
    demand: "Medium",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:27:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
  {
    id: "cotton-erode",
    crop: "Cotton",
    market: "Erode Regulated Market",
    district: "Erode",
    location: "Erode",
    state: "Tamil Nadu",
    latitude: 11.341,
    longitude: 77.7172,
    price: 72,
    previousPrice: 70,
    demand: "Medium",
    source: "Local demo snapshot maintained inside the app",
    sourceMode: "demo-snapshot",
    isLive: false,
    updatedAt: "2026-03-19T08:21:00+05:30",
    unit: "kg",
    dataLabel: "Latest cached snapshot",
  },
];

const cropAliases = {
  tomato: ["tomato"],
  onion: ["onion"],
  groundnut: ["groundnut", "peanut"],
  rice: ["rice", "paddy", "dhan"],
  maize: ["maize", "corn"],
  cotton: ["cotton", "kapas"],
  apple: ["apple"],
  banana: ["banana"],
  mango: ["mango"],
  chickpea: ["chickpea", "gram", "chana", "bengal gram"],
  kidneybeans: ["kidney beans", "kidneybeans", "rajma"],
  pigeonpeas: ["pigeon peas", "pigeonpeas", "arhar", "tur", "red gram"],
  mungbean: ["mung bean", "mungbean", "moong", "green gram"],
  blackgram: ["black gram", "blackgram", "urd", "urad"],
  lentil: ["lentil", "masur"],
  pomegranate: ["pomegranate", "anar"],
  grapes: ["grape", "grapes"],
  watermelon: ["water melon", "watermelon", "tarbooj"],
  muskmelon: ["musk melon", "muskmelon", "kharbuja", "melon"],
  orange: ["orange"],
  papaya: ["papaya"],
  coconut: ["coconut", "copra"],
  coffee: ["coffee"],
  jute: ["jute"],
  wheat: ["wheat"],
} as const;

const cropProfileMap = new Map(cropProfiles.map((profile) => [profile.id, profile]));
const MAX_HISTORICAL_MARKETS_PER_CROP = 120;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const stateNameAliases: Record<string, string> = {
  andamanandnicobar: "Andaman and Nicobar Islands",
  chattisgarh: "Chhattisgarh",
  delhinct: "Delhi",
  nctofdelhi: "Delhi",
  orissa: "Odisha",
  pondicherry: "Puducherry",
  uttaranchal: "Uttarakhand",
};

const farmerLocationByState = new Map(
  farmerLocations.map((location) => [normalizeText(location.state), location]),
);

function normalizeStateName(value: string) {
  const normalized = normalizeText(value);
  const canonicalState = stateNameAliases[normalized] ?? value;
  return farmerLocationByState.get(normalizeText(canonicalState))?.state ?? canonicalState;
}

function getLocationByState(stateName: string) {
  return farmerLocationByState.get(normalizeText(normalizeStateName(stateName))) ?? null;
}

function isAllIndiaLocation(locationName: string) {
  return normalizeText(locationName) === normalizeText(ALL_INDIA_LOCATION_NAME);
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseDate(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(`${value} UTC`);
}

function safeNumber(value: string) {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function matchCropKey(value: string) {
  const normalized = normalizeText(value);

  for (const [cropKey, aliases] of Object.entries(cropAliases)) {
    if (aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      return cropKey;
    }
  }

  return null;
}

function recordDemand(price: number, previousPrice: number): MarketRecord["demand"] {
  if (price >= previousPrice * 1.08) {
    return "High";
  }

  if (price <= previousPrice * 0.97) {
    return "Low";
  }

  return "Medium";
}

function getTrend(record: MarketRecord) {
  const change = Number((record.price - record.previousPrice).toFixed(1));
  const changePercent =
    record.previousPrice > 0 ? Number(((change / record.previousPrice) * 100).toFixed(1)) : 0;
  const trend: MarketTrend = change > 0 ? "up" : change < 0 ? "down" : "stable";
  const trendLabel = change > 0 ? "Rising" : change < 0 ? "Cooling" : "Stable";
  return { trend, trendLabel, change, changePercent };
}

function getSelectedLocation(locationName: string) {
  if (isAllIndiaLocation(locationName)) {
    return null;
  }

  const directMatch = farmerLocations.find((location) => location.name === locationName);
  if (directMatch) {
    return directMatch;
  }

  const normalizedInput = normalizeText(normalizeStateName(locationName));
  const stateMatch = farmerLocations.find(
    (location) => normalizeText(normalizeStateName(location.state)) === normalizedInput,
  );
  return stateMatch ?? null;
}

function getSelectedState(locationName: string) {
  if (isAllIndiaLocation(locationName)) {
    return null;
  }

  return normalizeStateName(locationName);
}

function parseHistoricalStore(): HistoricalStore {
  const series = new Map<string, Array<{ date: string; timestamp: number; price: number }>>();
  const latestByCropMarket = new Map<string, HistoricalObservation>();

  const agmarknetPath = path.join(
    process.cwd(),
    "price_dataset",
    "agmarknet_india_historical_prices_2024_2025.csv",
  );
  const agmarknetLines = fs.readFileSync(agmarknetPath, "utf8").split(/\r?\n/).filter(Boolean);

  for (const line of agmarknetLines.slice(1)) {
    const columns = parseCsvLine(line);
    const cropKey = matchCropKey(columns[3] ?? "");
    const modalPrice = safeNumber(columns[8] ?? "");
    const date = parseDate(columns[9] ?? "");

    if (!cropKey || modalPrice === null || Number.isNaN(date.getTime())) {
      continue;
    }

    const price = Number((modalPrice / 100).toFixed(1));
    const dateString = date.toISOString();
    const marketKey = `${cropKey}:${columns[2]}:${columns[1]}:${columns[10]}`;
    const history = series.get(cropKey) ?? [];
    history.push({ date: dateString, timestamp: date.getTime(), price });
    series.set(cropKey, history);

    const existing = latestByCropMarket.get(marketKey);
    if (!existing || new Date(existing.date).getTime() < date.getTime()) {
      latestByCropMarket.set(marketKey, {
        cropKey,
        cropName: columns[3],
        market: columns[2],
        district: columns[1],
        state: columns[10],
        price,
        previousPrice: existing?.price ?? price,
        date: dateString,
        source: "Historical AGMARKNET-style dataset bundled with the project",
      });
    }
  }

  const legacyPath = path.join(process.cwd(), "price_dataset", "market data.csv");
  const legacyLines = fs.readFileSync(legacyPath, "utf8").split(/\r?\n/).filter(Boolean);

  for (const line of legacyLines.slice(1)) {
    const columns = parseCsvLine(line);
    const cropKey = matchCropKey(columns[3] ?? "");
    const modalPrice = safeNumber(columns[8] ?? "");
    const date = parseDate(columns[9] ?? "");

    if (!cropKey || modalPrice === null || Number.isNaN(date.getTime())) {
      continue;
    }

    const price = Number((modalPrice / 100).toFixed(1));
    const dateString = date.toISOString();
    const history = series.get(cropKey) ?? [];
    history.push({ date: dateString, timestamp: date.getTime(), price });
    series.set(cropKey, history);

    const marketKey = `${cropKey}:${columns[2]}:${columns[1]}:${columns[0]}`;
    const existing = latestByCropMarket.get(marketKey);
    if (!existing || new Date(existing.date).getTime() < date.getTime()) {
      latestByCropMarket.set(marketKey, {
        cropKey,
        cropName: columns[3],
        market: columns[2],
        district: columns[1],
        state: columns[0],
        price,
        previousPrice: existing?.price ?? price,
        date: dateString,
        source: "Legacy historical market dataset bundled with the project",
      });
    }
  }

  const latestRecords = new Map<string, HistoricalObservation[]>();
  for (const observation of latestByCropMarket.values()) {
    const bucket = latestRecords.get(observation.cropKey) ?? [];
    bucket.push(observation);
    latestRecords.set(observation.cropKey, bucket);
  }

  for (const [cropKey, observations] of series.entries()) {
    series.set(
      cropKey,
      observations.sort((left, right) => left.timestamp - right.timestamp),
    );
  }

  for (const [cropKey, records] of latestRecords.entries()) {
      latestRecords.set(
      cropKey,
      records
        .sort((left, right) => {
          if (right.price !== left.price) {
            return right.price - left.price;
          }

          return new Date(right.date).getTime() - new Date(left.date).getTime();
        })
        .slice(0, MAX_HISTORICAL_MARKETS_PER_CROP),
    );
  }

  return { latestRecords, series };
}

let cachedHistoricalStore: HistoricalStore | null = null;

function getHistoricalStore() {
  cachedHistoricalStore ??= parseHistoricalStore();
  return cachedHistoricalStore;
}

function toHistoricalRecord(observation: HistoricalObservation): MarketRecord {
  const stateLocation = getLocationByState(observation.state);

  return {
    id: `${observation.cropKey}-${normalizeText(observation.market)}-${normalizeText(observation.date)}`,
    crop: observation.cropName,
    market: observation.market,
    district: observation.district,
    location: observation.district,
    state: stateLocation?.state ?? normalizeStateName(observation.state),
    latitude: stateLocation?.latitude ?? null,
    longitude: stateLocation?.longitude ?? null,
    price: observation.price,
    previousPrice: observation.previousPrice,
    demand: recordDemand(observation.price, observation.previousPrice),
    source: observation.source,
    sourceMode: "historical-dataset",
    isLive: false,
    updatedAt: observation.date,
    unit: "kg",
    dataLabel: "Latest available dataset price",
  };
}

function findLocalRecords(query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return localSnapshotRecords;
  }

  return localSnapshotRecords.filter((record) => {
    const recordKey = matchCropKey(record.crop) ?? normalizeText(record.crop);
    return recordKey.includes(normalizedQuery) || normalizeText(record.crop).includes(normalizedQuery);
  });
}

function findHistoricalRecords(query: string) {
  const cropKey = matchCropKey(query);
  if (!cropKey) {
    return [];
  }

  return (getHistoricalStore().latestRecords.get(cropKey) ?? []).map(toHistoricalRecord);
}

function getLatestUpdatedAt(records: MarketRecord[]) {
  return records.reduce((latest, record) => {
    return new Date(record.updatedAt) > new Date(latest) ? record.updatedAt : latest;
  }, records[0]?.updatedAt ?? "2026-03-19T08:00:00+05:30");
}

function compareMarketsByBestOption(left: MarketRecordWithInsights, right: MarketRecordWithInsights) {
  if (right.price !== left.price) {
    return right.price - left.price;
  }

  return (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY);
}

function recordMatchesSelectedState(record: MarketRecord, selectedState: string | null) {
  if (!selectedState) {
    return false;
  }

  return normalizeText(normalizeStateName(record.state)) === normalizeText(normalizeStateName(selectedState));
}

function getScopedMarketSelection(
  records: MarketRecordWithInsights[],
  selectedState: string | null,
  radiusKm: number,
) {
  if (!selectedState) {
    return {
      scope: "all-india" as MarketQueryScope,
      scopedRecords: records,
      nearbyMarkets: records.slice(0, 8),
    };
  }

  const sameStateRecords = records.filter((record) =>
    recordMatchesSelectedState(record, selectedState),
  );

  if (sameStateRecords.length > 0) {
    return {
      scope: "state" as MarketQueryScope,
      scopedRecords: sameStateRecords,
      nearbyMarkets: sameStateRecords,
    };
  }

  const nearbyRecords = records
    .filter((record) => record.distanceKm !== null && record.distanceKm <= radiusKm)
    .sort(compareMarketsByBestOption);

  if (nearbyRecords.length > 0) {
    return {
      scope: "radius" as MarketQueryScope,
      scopedRecords: nearbyRecords,
      nearbyMarkets: nearbyRecords,
    };
  }

  return {
    scope: "fallback" as MarketQueryScope,
    scopedRecords: [], // Return empty when a location is selected but no matches found
    nearbyMarkets: [],
  };
}

function buildPrediction(query: string, recordPool: MarketRecord[]): MarketPrediction | null {
  const cropKey = matchCropKey(query);
  const series = cropKey ? getHistoricalStore().series.get(cropKey) ?? [] : [];

  if (series.length >= 5) {
    const recent = series.slice(-12);
    const firstTimestamp = recent[0].timestamp;
    const points = recent.map((point) => ({
      x: (point.timestamp - firstTimestamp) / 86400000,
      y: point.price,
    }));
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;

    let numerator = 0;
    let denominator = 0;
    for (const point of points) {
      numerator += (point.x - meanX) * (point.y - meanY);
      denominator += (point.x - meanX) ** 2;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;
    const nextX = points.at(-1)!.x + 7;
    const nextWeekPrice = Number(Math.max(0, intercept + slope * nextX).toFixed(1));
    const currentPrice = points.at(-1)!.y;
    const projectedChangePercent =
      currentPrice > 0 ? Number((((nextWeekPrice - currentPrice) / currentPrice) * 100).toFixed(1)) : 0;

    return {
      nextWeekPrice,
      projectedChangePercent,
      model: "Linear regression on recent historical dataset prices",
      confidence: recent.length >= 10 ? "High" : "Medium",
      basis: `Built from the latest ${recent.length} historical price points stored in the local dataset.`,
    };
  }

  if (recordPool.length > 0) {
    const averagePrice = recordPool.reduce((sum, record) => sum + record.price, 0) / recordPool.length;
    const averagePrevious =
      recordPool.reduce((sum, record) => sum + record.previousPrice, 0) / recordPool.length;
    const change = averagePrice - averagePrevious;
    const nextWeekPrice = Number(Math.max(0, averagePrice + change).toFixed(1));
    const projectedChangePercent =
      averagePrice > 0 ? Number((((nextWeekPrice - averagePrice) / averagePrice) * 100).toFixed(1)) : 0;

    return {
      nextWeekPrice,
      projectedChangePercent,
      model: "Short-term trend projection from cached market snapshot",
      confidence: "Low",
      basis: "No deeper history was available for this crop, so the app used the latest cached price trend.",
    };
  }

  return null;
}

function buildAlerts(
  bestMarket: MarketRecordWithInsights | null,
  prediction: MarketPrediction | null,
): MarketAlert[] {
  const alerts: MarketAlert[] = [];

  if (bestMarket && bestMarket.changePercent >= 10) {
    alerts.push({
      id: "price-jump",
      title: "Price increased by 10%+",
      message: `${bestMarket.market} is up ${bestMarket.changePercent}% versus the previous reference price.`,
      tone: "positive",
    });
  }

  if (prediction && prediction.projectedChangePercent >= 5) {
    alerts.push({
      id: "sell-window",
      title: "Best time to sell may be next week",
      message: `The forecast points to roughly ${prediction.projectedChangePercent}% upside over the next 7 days.`,
      tone: "positive",
    });
  }

  if (prediction && prediction.projectedChangePercent <= -5) {
    alerts.push({
      id: "softening",
      title: "Selling sooner may protect margins",
      message: `The forecast shows a possible ${Math.abs(prediction.projectedChangePercent)}% softening next week.`,
      tone: "caution",
    });
  }

  if (alerts.length === 0 && bestMarket) {
    alerts.push({
      id: "watch",
      title: "Price movement is stable",
      message: `Current market movement around ${bestMarket.market} is steady, so check demand and transport cost before selling.`,
      tone: "neutral",
    });
  }

  return alerts;
}

function buildProfitSuggestion(
  crop: string,
  profile: CropProfile,
  bestMarket: MarketRecordWithInsights | null,
  prediction: MarketPrediction | null,
): ProfitSuggestion | null {
  if (!bestMarket) {
    return null;
  }

  const expectedProfitPerAcre = Math.round(bestMarket.price * profile.baseYieldPerAcreKg - profile.estimatedCostPerAcre);

  return {
    crop,
    market: bestMarket.market,
    location: `${bestMarket.location}, ${bestMarket.state}`,
    price: bestMarket.price,
    projectedNextWeekPrice: prediction?.nextWeekPrice ?? null,
    unit: bestMarket.unit,
    expectedProfitPerAcre,
    priceSource: bestMarket.dataLabel,
    recordedAt: bestMarket.updatedAt,
    isLive: false,
    explanation: `Expected profit assumes about ${profile.baseYieldPerAcreKg.toLocaleString("en-IN")} kg per acre and a cost baseline of Rs. ${profile.estimatedCostPerAcre.toLocaleString("en-IN")} for ${profile.name}.`,
  };
}

function enrichRecords(records: MarketRecord[], selectedLocationName: string) {
  const selectedState = getSelectedState(selectedLocationName);
  const selectedLocation = selectedState ? getLocationByState(selectedState) : null;

  return records
    .map((record) => {
      const trendState = getTrend(record);
      const distanceKm =
        selectedLocation && record.latitude !== null && record.longitude !== null
          ? haversineDistanceKm(
              selectedLocation.latitude,
              selectedLocation.longitude,
              record.latitude,
              record.longitude,
            )
          : null;

      return {
        ...record,
        ...trendState,
        distanceKm,
      } satisfies MarketRecordWithInsights;
    })
    .sort(compareMarketsByBestOption);
}

export function getMarketDashboardData({
  crop = "",
  location = ALL_INDIA_LOCATION_NAME,
  radiusKm = 120,
}: {
  crop?: string;
  location?: string;
  radiusKm?: number;
}): MarketDashboardResponse {
  const trimmedCrop = crop.trim();
  const selectedState = getSelectedState(location);
  const localRecords = findLocalRecords(trimmedCrop);
  const historicalRecords = findHistoricalRecords(trimmedCrop);
  const mergedRecords = enrichRecords(
    [...localRecords, ...historicalRecords].filter(
      (record, index, records) =>
        records.findIndex((candidate) => candidate.id === record.id) === index,
    ),
    location,
  );
  const { scope, scopedRecords, nearbyMarkets } = getScopedMarketSelection(
    mergedRecords,
    selectedState,
    radiusKm,
  );

  const bestMarket = scopedRecords[0] ?? null;
  const bestNearbyMarket = nearbyMarkets[0] ?? bestMarket;

  const prediction = buildPrediction(trimmedCrop, scopedRecords);
  const cropKey = matchCropKey(trimmedCrop);
  const profile = cropKey ? cropProfileMap.get(cropKey) ?? null : null;

  const summarySourceMode =
    localRecords.length > 0 && historicalRecords.length > 0
      ? "hybrid"
      : historicalRecords.length > 0
        ? "historical-dataset"
        : "demo-snapshot";

  const totalRecords = scopedRecords.length;
  const averagePrice =
    totalRecords > 0
      ? Number(
          (
            scopedRecords.reduce((total, record) => total + record.price, 0) / totalRecords
          ).toFixed(1),
        )
      : 0;
  const scopeExplanation =
    scope === "all-india"
      ? "Showing the best matching market options across India."
      : scope === "state"
        ? `Showing markets in ${selectedState!} first so the best option changes with your selected state or UT.`
        : scope === "radius"
          ? `No matching markets were found inside ${selectedState!}, so the dashboard fell back to the best options within about ${radiusKm} km.`
          : "No selected-state markets were available, so the dashboard fell back to the best matching options across India.";

  return {
    query: {
      crop,
      location: selectedState ?? ALL_INDIA_LOCATION_NAME,
      radiusKm,
      scope,
    },
    summary: {
      totalRecords,
      averagePrice,
      highestPrice: bestMarket?.price ?? 0,
      risingMarkets: scopedRecords.filter((record) => record.trend === "up").length,
      source:
        summarySourceMode === "hybrid"
          ? "Hybrid source: local demo snapshot plus bundled historical datasets"
          : summarySourceMode === "historical-dataset"
            ? "Bundled historical price datasets"
            : "Local demo snapshot",
      updatedAt: getLatestUpdatedAt(scopedRecords),
      sourceMode: summarySourceMode,
      isLive: false,
      latestPriceLabel:
        summarySourceMode === "demo-snapshot" ? "Latest cached snapshot" : "Latest available dataset price",
      explanation:
        summarySourceMode === "demo-snapshot"
          ? `These prices are cached inside the project and dated March 19, 2026. They are not live market API quotes. ${scopeExplanation}`
          : `These prices come from the latest dates available in the bundled datasets. They are not live prices for March 19, 2026. ${scopeExplanation}`,
    },
    records: scopedRecords,
    nearbyMarkets,
    bestMarket,
    bestNearbyMarket,
    prediction,
    alerts: buildAlerts(bestNearbyMarket ?? bestMarket, prediction),
    profitSuggestion: profile
      ? buildProfitSuggestion(
          profile.name,
          profile,
          bestNearbyMarket ?? bestMarket,
          prediction,
        )
      : null,
    integration: {
      status: summarySourceMode,
      priority: "Connect a live AGMARKNET or eNAM feed when real-time pricing is required.",
      sources: ["Local demo snapshot", "AGMARKNET historical dataset", "Legacy market dataset"],
      architecture: [
        "CSV datasets and demo cache",
        "Server market service",
        "Next.js API route",
        "Market dashboard",
      ],
    },
  };
}

export function getProfitSuggestionForCrop(
  cropName: string,
  profile: CropProfile,
  location: string,
): ProfitSuggestion | null {
  const dashboard = getMarketDashboardData({
    crop: cropName,
    location,
    radiusKm: 120,
  });

  return buildProfitSuggestion(
    cropName,
    profile,
    dashboard.bestNearbyMarket ?? dashboard.bestMarket,
    dashboard.prediction,
  );
}

