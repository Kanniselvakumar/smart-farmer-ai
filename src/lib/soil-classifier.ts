import "server-only";

import sharp from "sharp";
import soilReferenceIndex from "@/lib/soil-reference-index.json";
import {
  soilDatasetFamilies,
  soilDatasetToRecommendationSoil,
} from "@/lib/recommendation-data";
import {
  type SoilClassificationResponse,
  type SoilDatasetClass,
} from "@/lib/types";

type SoilSignature = {
  label: SoilDatasetClass;
  vector: number[];
};

type SoilReferenceIndex = {
  signatures: SoilSignature[];
  sampleCountByLabel: Record<SoilDatasetClass, number>;
};

const IMAGE_SIZE = 32;
const K_NEAREST = 9;
const referenceIndex = soilReferenceIndex as SoilReferenceIndex;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHue(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) {
    return 0;
  }

  if (max === r) {
    return ((g - b) / delta + (g < b ? 6 : 0)) * 60;
  }

  if (max === g) {
    return ((b - r) / delta + 2) * 60;
  }

  return ((r - g) / delta + 4) * 60;
}

async function extractImageVector(source: Buffer | string) {
  const { data, info } = await sharp(source)
    .rotate()
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: "cover", position: "attention" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  const hueBins = Array.from({ length: 6 }, () => 0);
  const brightnessBins = Array.from({ length: 4 }, () => 0);
  const grayscale = new Float32Array(pixelCount);

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumSquaredR = 0;
  let sumSquaredG = 0;
  let sumSquaredB = 0;
  let sumBrightness = 0;
  let sumSquaredBrightness = 0;
  let sumSaturation = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * info.channels;
    const r = data[offset] / 255;
    const g = data[offset + 1] / 255;
    const b = data[offset + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const brightness = (r + g + b) / 3;

    sumR += r;
    sumG += g;
    sumB += b;
    sumSquaredR += r * r;
    sumSquaredG += g * g;
    sumSquaredB += b * b;
    sumBrightness += brightness;
    sumSquaredBrightness += brightness * brightness;
    sumSaturation += saturation;

    const hue = rgbToHue(r, g, b);
    hueBins[Math.min(hueBins.length - 1, Math.floor(hue / 60))] += 1;
    brightnessBins[Math.min(brightnessBins.length - 1, Math.floor(brightness * brightnessBins.length))] += 1;
    grayscale[index] = brightness;
  }

  let edgeTotal = 0;
  let edgeCount = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = y * info.width + x;
      const current = grayscale[index];

      if (x + 1 < info.width) {
        edgeTotal += Math.abs(current - grayscale[index + 1]);
        edgeCount += 1;
      }

      if (y + 1 < info.height) {
        edgeTotal += Math.abs(current - grayscale[index + info.width]);
        edgeCount += 1;
      }
    }
  }

  const meanR = sumR / pixelCount;
  const meanG = sumG / pixelCount;
  const meanB = sumB / pixelCount;
  const meanBrightness = sumBrightness / pixelCount;

  const stdR = Math.sqrt(Math.max(0, sumSquaredR / pixelCount - meanR * meanR));
  const stdG = Math.sqrt(Math.max(0, sumSquaredG / pixelCount - meanG * meanG));
  const stdB = Math.sqrt(Math.max(0, sumSquaredB / pixelCount - meanB * meanB));
  const stdBrightness = Math.sqrt(
    Math.max(0, sumSquaredBrightness / pixelCount - meanBrightness * meanBrightness),
  );

  return [
    meanR,
    meanG,
    meanB,
    stdR,
    stdG,
    stdB,
    meanBrightness,
    stdBrightness,
    sumSaturation / pixelCount,
    (meanR - meanG + 1) / 2,
    (meanG - meanB + 1) / 2,
    ...hueBins.map((value) => value / pixelCount),
    ...brightnessBins.map((value) => value / pixelCount),
    edgeCount > 0 ? edgeTotal / edgeCount : 0,
  ];
}

function euclideanDistance(left: number[], right: number[]) {
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    const delta = left[index] - right[index];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

export async function classifySoilImage(imageBuffer: Buffer): Promise<SoilClassificationResponse> {
  if (referenceIndex.signatures.length === 0) {
    throw new Error("Soil reference index is empty. Run `npm run generate:soil-index`.");
  }

  const queryVector = await extractImageVector(imageBuffer);

  const nearest = referenceIndex.signatures
    .map((signature) => ({
      label: signature.label,
      distance: euclideanDistance(queryVector, signature.vector),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, K_NEAREST);

  const datasetVotes = new Map<SoilDatasetClass, number>();
  const soilVotes = new Map<SoilClassificationResponse["soilType"], number>();

  for (const match of nearest) {
    const weight = 1 / (match.distance + 0.001);
    const mappedSoil = soilDatasetToRecommendationSoil[match.label];
    datasetVotes.set(match.label, (datasetVotes.get(match.label) ?? 0) + weight);
    soilVotes.set(mappedSoil, (soilVotes.get(mappedSoil) ?? 0) + weight);
  }

  const sortedDatasetVotes = [...datasetVotes.entries()].sort((left, right) => right[1] - left[1]);
  const sortedSoilVotes = [...soilVotes.entries()].sort((left, right) => right[1] - left[1]);

  const [topDatasetLabel] = sortedDatasetVotes[0];
  const [topSoilType, topSoilWeight] = sortedSoilVotes[0];

  if (!topDatasetLabel || !topSoilType) {
    throw new Error("Soil classification could not find a matching reference sample.");
  }

  const secondSoilWeight = sortedSoilVotes[1]?.[1] ?? 0;
  const totalSoilWeight = sortedSoilVotes.reduce((sum, [, weight]) => sum + weight, 0);
  const averageDistance =
    nearest.reduce((sum, match) => sum + match.distance, 0) / Math.max(1, nearest.length);
  const voteShare = totalSoilWeight > 0 ? topSoilWeight / totalSoilWeight : 0;
  const margin = totalSoilWeight > 0 ? (topSoilWeight - secondSoilWeight) / totalSoilWeight : 0;
  const closeness = 1 / (1 + averageDistance * 10);
  const confidence = clamp(
    Math.round((voteShare * 0.62 + Math.max(0, margin) * 0.18 + closeness * 0.2) * 100),
    52,
    98,
  );

  return {
    soilType: topSoilType,
    confidence,
    datasetLabel: topDatasetLabel,
    datasetFamily: soilDatasetFamilies[topDatasetLabel],
    sampleCount: referenceIndex.sampleCountByLabel[topDatasetLabel],
    alternatives: sortedSoilVotes.slice(0, 3).map(([soilType, weight]) => ({
      soilType,
      confidence: clamp(Math.round((weight / totalSoilWeight) * 100), 1, 99),
    })),
  };
}
