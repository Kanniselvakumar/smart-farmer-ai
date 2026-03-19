import "server-only";

import fs from "node:fs";
import path from "node:path";
import { cropProfiles, farmerLocations } from "@/lib/recommendation-data";
import { getProfitSuggestionForCrop } from "@/lib/market-service";
import type {
  CropProfile,
  CropRecommendation,
  RecommendationInput,
  RecommendationResponse,
  SoilType,
  WaterAvailability,
} from "@/lib/types";

type TrainingRow = {
  features: number[];
  label: string;
};

type LabelStats = {
  temperatureRange: [number, number];
  humidityRange: [number, number];
  rainfallRange: [number, number];
};

type TreeNode = {
  predictionCounts: Record<string, number>;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
};

type RandomForestModel = {
  featureBounds: Array<{ min: number; max: number }>;
  labels: string[];
  labelStats: Record<string, LabelStats>;
  sampleCount: number;
  treeCount: number;
  trees: TreeNode[];
};

const FEATURE_COUNT = 7;
const TREE_COUNT = 15;
const MAX_DEPTH = 8;
const MIN_SAMPLES_PER_LEAF = 12;
const FEATURE_SUBSET_SIZE = 3;

const waterRank: Record<WaterAvailability, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const soilFeatureBaseline: Record<SoilType, { n: number; p: number; k: number; ph: number }> = {
  Alluvial: { n: 72, p: 42, k: 40, ph: 6.8 },
  Black: { n: 58, p: 34, k: 56, ph: 7.2 },
  Red: { n: 42, p: 26, k: 34, ph: 6.4 },
  Loamy: { n: 62, p: 39, k: 46, ph: 6.7 },
  Clay: { n: 68, p: 37, k: 52, ph: 7.0 },
  Sandy: { n: 32, p: 18, k: 25, ph: 6.1 },
};

const seasonAdjustment = {
  Kharif: { n: 10, p: 4, k: 5, ph: -0.05 },
  Rabi: { n: 2, p: 6, k: 3, ph: 0.1 },
  Summer: { n: -4, p: 1, k: 2, ph: 0 },
} as const;

const waterAdjustment: Record<WaterAvailability, { n: number; p: number; k: number; ph: number }> = {
  Low: { n: -6, p: -3, k: -4, ph: 0.05 },
  Medium: { n: 0, p: 0, k: 0, ph: 0 },
  High: { n: 4, p: 2, k: 5, ph: -0.05 },
};

const zoneAdjustment: Record<string, { n: number; p: number; k: number; ph: number }> = {
  coastal: { n: 2, p: 2, k: 4, ph: -0.15 },
  delta: { n: 8, p: 4, k: 4, ph: -0.05 },
  dryland: { n: -5, p: -2, k: -3, ph: 0.2 },
  western: { n: 1, p: 1, k: 3, ph: 0.1 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

function percentile(values: number[], ratio: number) {
  const sorted = values.slice().sort((left, right) => left - right);
  const index = Math.floor((sorted.length - 1) * ratio);
  return sorted[index];
}

function giniFromCounts(counts: Record<string, number>) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return 0;
  }

  let score = 1;
  for (const count of Object.values(counts)) {
    const probability = count / total;
    score -= probability * probability;
  }

  return score;
}

function labelCounts(samples: TrainingRow[]) {
  return samples.reduce<Record<string, number>>((counts, sample) => {
    counts[sample.label] = (counts[sample.label] ?? 0) + 1;
    return counts;
  }, {});
}

function isPure(samples: TrainingRow[]) {
  return new Set(samples.map((sample) => sample.label)).size <= 1;
}

function pickFeatureSubset(random: () => number, size: number) {
  const features = Array.from({ length: FEATURE_COUNT }, (_, index) => index);
  for (let index = features.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [features[index], features[swapIndex]] = [features[swapIndex], features[index]];
  }
  return features.slice(0, size);
}

function getCandidateThresholds(samples: TrainingRow[], featureIndex: number) {
  const sortedValues = samples
    .map((sample) => sample.features[featureIndex])
    .sort((left, right) => left - right);

  if (sortedValues.length <= 2) {
    return [];
  }

  const candidateCount = Math.min(10, sortedValues.length - 1);
  const thresholds = new Set<number>();

  for (let index = 1; index <= candidateCount; index += 1) {
    const sampleIndex = Math.floor((index / (candidateCount + 1)) * (sortedValues.length - 1));
    const left = sortedValues[sampleIndex];
    const right = sortedValues[Math.min(sampleIndex + 1, sortedValues.length - 1)];
    if (left !== right) {
      thresholds.add((left + right) / 2);
    }
  }

  return [...thresholds];
}

function evaluateSplit(samples: TrainingRow[], featureIndex: number, threshold: number) {
  const left: TrainingRow[] = [];
  const right: TrainingRow[] = [];

  for (const sample of samples) {
    if (sample.features[featureIndex] <= threshold) {
      left.push(sample);
    } else {
      right.push(sample);
    }
  }

  if (left.length < MIN_SAMPLES_PER_LEAF || right.length < MIN_SAMPLES_PER_LEAF) {
    return null;
  }

  const leftCounts = labelCounts(left);
  const rightCounts = labelCounts(right);
  const total = samples.length;
  const impurity =
    (left.length / total) * giniFromCounts(leftCounts) +
    (right.length / total) * giniFromCounts(rightCounts);

  return { impurity, left, right };
}

function buildTree(samples: TrainingRow[], random: () => number, depth = 0): TreeNode {
  const predictionCounts = labelCounts(samples);

  if (depth >= MAX_DEPTH || samples.length <= MIN_SAMPLES_PER_LEAF * 2 || isPure(samples)) {
    return { predictionCounts };
  }

  const parentImpurity = giniFromCounts(predictionCounts);
  let bestSplit:
    | {
        featureIndex: number;
        threshold: number;
        impurity: number;
        left: TrainingRow[];
        right: TrainingRow[];
      }
    | null = null;

  for (const featureIndex of pickFeatureSubset(random, FEATURE_SUBSET_SIZE)) {
    for (const threshold of getCandidateThresholds(samples, featureIndex)) {
      const split = evaluateSplit(samples, featureIndex, threshold);
      if (!split) {
        continue;
      }

      if (bestSplit === null || split.impurity < bestSplit.impurity) {
        bestSplit = {
          featureIndex,
          threshold,
          impurity: split.impurity,
          left: split.left,
          right: split.right,
        };
      }
    }
  }

  if (!bestSplit || bestSplit.impurity >= parentImpurity) {
    return { predictionCounts };
  }

  return {
    predictionCounts,
    featureIndex: bestSplit.featureIndex,
    threshold: bestSplit.threshold,
    left: buildTree(bestSplit.left, random, depth + 1),
    right: buildTree(bestSplit.right, random, depth + 1),
  };
}

function bootstrapSamples(samples: TrainingRow[], random: () => number) {
  return Array.from({ length: samples.length }, () => {
    const index = Math.floor(random() * samples.length);
    return samples[index];
  });
}

function trainRandomForest(): RandomForestModel {
  const datasetPath = path.join(process.cwd(), "crop_dataset", "Crop_recommendation.csv");
  const fileContent = fs.readFileSync(datasetPath, "utf8");
  const lines = fileContent.split(/\r?\n/).filter(Boolean);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));

  const featureBounds = Array.from({ length: FEATURE_COUNT }, () => ({
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
  }));

  const labelCollections = new Map<string, { temperature: number[]; humidity: number[]; rainfall: number[] }>();
  const samples: TrainingRow[] = rows.map((columns) => {
    const features = [
      Number(columns[0]),
      Number(columns[1]),
      Number(columns[2]),
      Number(columns[3]),
      Number(columns[4]),
      Number(columns[5]),
      Number(columns[6]),
    ];
    const label = columns[7];

    features.forEach((value, featureIndex) => {
      featureBounds[featureIndex].min = Math.min(featureBounds[featureIndex].min, value);
      featureBounds[featureIndex].max = Math.max(featureBounds[featureIndex].max, value);
    });

    const collection = labelCollections.get(label) ?? {
      temperature: [],
      humidity: [],
      rainfall: [],
    };
    collection.temperature.push(features[3]);
    collection.humidity.push(features[4]);
    collection.rainfall.push(features[6]);
    labelCollections.set(label, collection);

    return { features, label };
  });

  const labelStats = Object.fromEntries(
    [...labelCollections.entries()].map(([label, values]) => [
      label,
      {
        temperatureRange: [percentile(values.temperature, 0.15), percentile(values.temperature, 0.85)],
        humidityRange: [percentile(values.humidity, 0.15), percentile(values.humidity, 0.85)],
        rainfallRange: [percentile(values.rainfall, 0.15), percentile(values.rainfall, 0.85)],
      } satisfies LabelStats,
    ]),
  );

  const random = mulberry32(20260319);
  const trees = Array.from({ length: TREE_COUNT }, () => buildTree(bootstrapSamples(samples, random), random));

  return {
    featureBounds,
    labels: [...new Set(samples.map((sample) => sample.label))],
    labelStats,
    sampleCount: samples.length,
    treeCount: TREE_COUNT,
    trees,
  };
}

let cachedModel: RandomForestModel | null = null;

function getModel() {
  cachedModel ??= trainRandomForest();
  return cachedModel;
}

function walkTree(node: TreeNode, features: number[]): Record<string, number> {
  if (typeof node.featureIndex !== "number" || typeof node.threshold !== "number" || !node.left || !node.right) {
    return node.predictionCounts;
  }

  return features[node.featureIndex] <= node.threshold
    ? walkTree(node.left, features)
    : walkTree(node.right, features);
}

function predictProbabilities(model: RandomForestModel, features: number[]) {
  const totalCounts: Record<string, number> = {};

  for (const tree of model.trees) {
    const counts = walkTree(tree, features);
    const leafTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
    if (leafTotal === 0) {
      continue;
    }

    for (const [label, count] of Object.entries(counts)) {
      totalCounts[label] = (totalCounts[label] ?? 0) + count / leafTotal;
    }
  }

  const total = Object.values(totalCounts).reduce((sum, count) => sum + count, 0);
  return Object.fromEntries(
    model.labels.map((label) => [label, total > 0 ? (totalCounts[label] ?? 0) / total : 0]),
  );
}

function getLocationZone(locationName: string) {
  return farmerLocations.find((location) => location.name === locationName)?.zone ?? "dryland";
}

function estimateInputFeatures(input: RecommendationInput, model: RandomForestModel) {
  const zone = getLocationZone(input.location);
  const soil = soilFeatureBaseline[input.soilType];
  const season = seasonAdjustment[input.season];
  const water = waterAdjustment[input.waterAvailability];
  const zoneDelta = zoneAdjustment[zone] ?? { n: 0, p: 0, k: 0, ph: 0 };

  const rawFeatures = [
    soil.n + season.n + water.n + zoneDelta.n,
    soil.p + season.p + water.p + zoneDelta.p,
    soil.k + season.k + water.k + zoneDelta.k,
    input.temperature,
    input.humidity,
    soil.ph + season.ph + water.ph + zoneDelta.ph,
    input.rainfall,
  ];

  return rawFeatures.map((value, featureIndex) =>
    clamp(value, model.featureBounds[featureIndex].min, model.featureBounds[featureIndex].max),
  );
}

function rangeScore(value: number, [min, max]: [number, number], tolerance: number, points: number) {
  if (value >= min && value <= max) {
    return points;
  }

  if (value >= min - tolerance && value <= max + tolerance) {
    return Math.round(points * 0.5);
  }

  return 0;
}

function scoreAgronomyFit(
  input: RecommendationInput,
  profile: CropProfile,
  stats: LabelStats | undefined,
  zone: string,
) {
  let score = 0;

  score += profile.soilTypes.includes(input.soilType) ? 32 : 10;
  score += profile.seasons.includes(input.season) ? 22 : 6;
  score += waterRank[input.waterAvailability] >= waterRank[profile.waterNeed] ? 18 : 6;
  score += profile.zones.includes(zone) ? 12 : 4;

  if (stats) {
    score += rangeScore(input.temperature, stats.temperatureRange, 3, 6);
    score += rangeScore(input.humidity, stats.humidityRange, 10, 5);
    score += rangeScore(input.rainfall, stats.rainfallRange, 120, 5);
  }

  return clamp(score, 0, 100);
}

function getFitLabel(score: number): CropRecommendation["fitLabel"] {
  if (score >= 80) {
    return "Excellent Match";
  }

  if (score >= 62) {
    return "Good Match";
  }

  return "Trial Option";
}

function isPracticalRecommendation(
  input: RecommendationInput,
  profile: CropProfile,
  agronomyFit: number,
  modelConfidence: number,
  zone: string,
) {
  let mismatchCount = 0;

  if (!profile.soilTypes.includes(input.soilType)) {
    mismatchCount += 1;
  }

  if (!profile.seasons.includes(input.season)) {
    mismatchCount += 1;
  }

  if (waterRank[input.waterAvailability] < waterRank[profile.waterNeed]) {
    mismatchCount += 1;
  }

  if (!profile.zones.includes(zone)) {
    mismatchCount += 1;
  }

  if (agronomyFit < 48) {
    return false;
  }

  if (mismatchCount >= 3) {
    return false;
  }

  if (mismatchCount >= 2 && modelConfidence < 4) {
    return false;
  }

  return true;
}

function buildReasons(
  input: RecommendationInput,
  profile: CropProfile,
  modelConfidence: number,
  agronomyFit: number,
  stats: LabelStats | undefined,
  zone: string,
) {
  const reasons = [
    `The random forest gave ${modelConfidence}% confidence from climate patterns close to ${profile.name.toLowerCase()} training samples.`,
    profile.soilTypes.includes(input.soilType)
      ? `${input.soilType} soil is a good field match for this crop.`
      : `${input.soilType} soil is workable, but this crop is usually stronger in ${profile.soilTypes
          .slice(0, 2)
          .join(" or ")
          .toLowerCase()} soils.`,
    profile.seasons.includes(input.season)
      ? `${input.season} is a suitable season window for this crop.`
      : `${input.season} is not the strongest sowing window, so timing should be watched.`,
    waterRank[input.waterAvailability] >= waterRank[profile.waterNeed]
      ? `${input.waterAvailability} water availability is enough for the crop's usual requirement.`
      : `${profile.name} usually prefers stronger moisture support than the selected water level.`,
  ];

  if (stats) {
    reasons.push(
      `Typical training rows sat around ${Math.round(stats.temperatureRange[0])}-${Math.round(
        stats.temperatureRange[1],
      )} C, ${Math.round(stats.humidityRange[0])}-${Math.round(stats.humidityRange[1])}% humidity, and ${Math.round(
        stats.rainfallRange[0],
      )}-${Math.round(stats.rainfallRange[1])} mm rainfall.`,
    );
  }

  if (!profile.zones.includes(zone)) {
    reasons.push(`It is less common in the ${zone} belt, so field monitoring matters more after sowing.`);
  }

  reasons.push(`Agronomy fit score: ${agronomyFit}/100 after soil, season, water, and zone adjustments.`);

  return reasons.slice(0, 4);
}

function buildSupportingSignals(
  input: RecommendationInput,
  profile: CropProfile,
  modelConfidence: number,
  zone: string,
) {
  return [
    `Model signal ${modelConfidence}%`,
    `Water need ${profile.waterNeed}`,
    `${input.soilType} soil selected`,
    `${zone} zone`,
  ];
}

function getProfileMap() {
  return new Map(cropProfiles.map((profile) => [profile.id, profile]));
}

export function getCropRecommendations(input: RecommendationInput): RecommendationResponse {
  const model = getModel();
  const profileMap = getProfileMap();
  const zone = getLocationZone(input.location);
  const featureVector = estimateInputFeatures(input, model);
  const probabilities = predictProbabilities(model, featureVector);

  const rankedRecommendations = Object.entries(probabilities)
    .map(([label, probability]) => {
      const profile = profileMap.get(label);
      if (!profile) {
        return null;
      }

      const modelConfidence = Math.round(probability * 100);
      const agronomyFit = scoreAgronomyFit(input, profile, model.labelStats[label], zone);
      const confidence = clamp(Math.round(modelConfidence * 0.72 + agronomyFit * 0.28), 1, 99);
      const marketInsight = getProfitSuggestionForCrop(profile.name, profile, input.location);

      return {
        id: profile.id,
        name: profile.name,
        score: confidence,
        confidence,
        modelConfidence,
        agronomyFit,
        fitLabel: getFitLabel(confidence),
        reasons: buildReasons(input, profile, modelConfidence, agronomyFit, model.labelStats[label], zone),
        caution: profile.caution,
        growingWindow: profile.growingWindow,
        marketOutlook: profile.marketOutlook,
        waterNeed: profile.waterNeed,
        summary: profile.summary,
        supportingSignals: buildSupportingSignals(input, profile, modelConfidence, zone),
        marketInsight,
      } satisfies CropRecommendation;
    })
    .filter((recommendation): recommendation is CropRecommendation => recommendation !== null)
    .sort((left, right) => {
      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence;
      }

      return right.modelConfidence - left.modelConfidence;
    });

  const recommendations = (
    rankedRecommendations.filter((recommendation) =>
      isPracticalRecommendation(
        input,
        profileMap.get(recommendation.id)!,
        recommendation.agronomyFit,
        recommendation.modelConfidence,
        zone,
      ),
    ).length >= 3
      ? rankedRecommendations.filter((recommendation) =>
          isPracticalRecommendation(
            input,
            profileMap.get(recommendation.id)!,
            recommendation.agronomyFit,
            recommendation.modelConfidence,
            zone,
          ),
        )
      : rankedRecommendations
  ).slice(0, 4);

  return {
    meta: {
      model: `Random Forest (${model.treeCount} decision trees)`,
      trainingSource: "crop_dataset/Crop_recommendation.csv",
      trainedSampleCount: model.sampleCount,
      availableCropCount: model.labels.length,
    },
    chart: recommendations.slice(0, 3).map((recommendation) => ({
      name: recommendation.name,
      confidence: recommendation.confidence,
    })),
    recommendations,
    topInsight: recommendations[0]?.marketInsight ?? null,
  };
}
