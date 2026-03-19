export const soilTypes = ["Alluvial", "Black", "Red", "Loamy", "Clay", "Sandy"] as const;
export type SoilType = (typeof soilTypes)[number];

export const soilDatasetClasses = [
  "Alluvial_Soil",
  "Arid_Soil",
  "Black_Soil",
  "Laterite_Soil",
  "Mountain_Soil",
  "Red_Soil",
  "Yellow_Soil",
] as const;
export type SoilDatasetClass = (typeof soilDatasetClasses)[number];

export const seasons = ["Kharif", "Rabi", "Summer"] as const;
export type Season = (typeof seasons)[number];

export const waterAvailabilityLevels = ["Low", "Medium", "High"] as const;
export type WaterAvailability = (typeof waterAvailabilityLevels)[number];

export type RecommendationInput = {
  soilType: SoilType;
  season: Season;
  temperature: number;
  rainfall: number;
  humidity: number;
  waterAvailability: WaterAvailability;
  location: string;
};

export type SoilTypeInfo = {
  value: SoilType;
  label: string;
  description: string;
  fieldExample: string;
};

export type SoilAlternativePrediction = {
  soilType: SoilType;
  confidence: number;
};

export type SoilClassificationResponse = {
  soilType: SoilType;
  confidence: number;
  datasetLabel: SoilDatasetClass;
  datasetFamily: string;
  sampleCount: number;
  alternatives: SoilAlternativePrediction[];
};

export type CropProfile = {
  id: string;
  name: string;
  summary: string;
  soilTypes: SoilType[];
  seasons: Season[];
  zones: string[];
  waterNeed: WaterAvailability;
  growingWindow: string;
  marketOutlook: "Strong" | "Stable" | "Emerging";
  caution: string;
  baseYieldPerAcreKg: number;
  estimatedCostPerAcre: number;
  marketAliases: string[];
};

export type CropRecommendation = {
  id: string;
  name: string;
  score: number;
  confidence: number;
  modelConfidence: number;
  agronomyFit: number;
  fitLabel: "Excellent Match" | "Good Match" | "Trial Option";
  reasons: string[];
  caution: string;
  growingWindow: string;
  marketOutlook: CropProfile["marketOutlook"];
  waterNeed: WaterAvailability;
  summary: string;
  supportingSignals: string[];
  marketInsight: ProfitSuggestion | null;
};

export type RecommendationChartPoint = {
  name: string;
  confidence: number;
};

export type RecommendationResponse = {
  meta: {
    model: string;
    trainingSource: string;
    trainedSampleCount: number;
    availableCropCount: number;
  };
  chart: RecommendationChartPoint[];
  recommendations: CropRecommendation[];
  topInsight: ProfitSuggestion | null;
};

export type FarmerLocation = {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  zone: string;
};

export type MarketTrend = "up" | "down" | "stable";
export type MarketDataMode = "demo-snapshot" | "historical-dataset" | "hybrid";
export type MarketQueryScope = "all-india" | "state" | "radius" | "fallback";

export type MarketRecord = {
  id: string;
  crop: string;
  market: string;
  district: string;
  location: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  price: number;
  previousPrice: number;
  demand: "High" | "Medium" | "Low";
  source: string;
  sourceMode: MarketDataMode;
  isLive: boolean;
  updatedAt: string;
  unit: string;
  dataLabel: string;
};

export type MarketRecordWithInsights = MarketRecord & {
  trend: MarketTrend;
  trendLabel: string;
  change: number;
  changePercent: number;
  distanceKm: number | null;
};

export type MarketPrediction = {
  nextWeekPrice: number;
  projectedChangePercent: number;
  model: string;
  confidence: "High" | "Medium" | "Low";
  basis: string;
};

export type MarketAlert = {
  id: string;
  title: string;
  message: string;
  tone: "positive" | "neutral" | "caution";
};

export type ProfitSuggestion = {
  crop: string;
  market: string;
  location: string;
  price: number;
  projectedNextWeekPrice: number | null;
  unit: string;
  expectedProfitPerAcre: number;
  priceSource: string;
  recordedAt: string | null;
  isLive: boolean;
  explanation: string;
};

export type MarketDashboardResponse = {
  query: {
    crop: string;
    location: string;
    radiusKm: number;
    scope: MarketQueryScope;
  };
  summary: {
    totalRecords: number;
    averagePrice: number;
    highestPrice: number;
    risingMarkets: number;
    source: string;
    updatedAt: string;
    sourceMode: MarketDataMode;
    isLive: boolean;
    latestPriceLabel: string;
    explanation: string;
  };
  records: MarketRecordWithInsights[];
  nearbyMarkets: MarketRecordWithInsights[];
  bestMarket: MarketRecordWithInsights | null;
  bestNearbyMarket: MarketRecordWithInsights | null;
  prediction: MarketPrediction | null;
  alerts: MarketAlert[];
  profitSuggestion: ProfitSuggestion | null;
  integration: {
    status: string;
    priority: string;
    sources: string[];
    architecture: string[];
  };
};
