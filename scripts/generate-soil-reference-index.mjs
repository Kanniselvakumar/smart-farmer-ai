import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const soilDatasetClasses = [
  "Alluvial_Soil",
  "Arid_Soil",
  "Black_Soil",
  "Laterite_Soil",
  "Mountain_Soil",
  "Red_Soil",
  "Yellow_Soil",
];

const DATASET_ROOT = path.join(process.cwd(), "soil_dataset", "CyAUG-Dataset");
const OUTPUT_PATH = path.join(process.cwd(), "src", "lib", "soil-reference-index.json");
const IMAGE_SIZE = 32;
const MAX_IMAGES_PER_CLASS = 60;

function sampleEvenly(items, limit) {
  if (items.length <= limit) {
    return items;
  }

  return Array.from({ length: limit }, (_, index) => {
    const itemIndex = Math.floor((index * items.length) / limit);
    return items[itemIndex];
  });
}

function getImageFiles(label) {
  const labelDirectory = path.join(DATASET_ROOT, label);
  const entries = fs.readdirSync(labelDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(jpe?g|png)$/i.test(entry.name))
    .map((entry) => path.join(labelDirectory, entry.name))
    .sort();
}

function rgbToHue(r, g, b) {
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

async function extractImageVector(source) {
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

  const vector = [
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

  return vector.map((value) => Number(value.toFixed(6)));
}

async function buildReferenceIndex() {
  const sampleCountByLabel = {};
  const signatures = [];

  for (const label of soilDatasetClasses) {
    const sampledFiles = sampleEvenly(getImageFiles(label), MAX_IMAGES_PER_CLASS);
    sampleCountByLabel[label] = sampledFiles.length;

    for (const filePath of sampledFiles) {
      const vector = await extractImageVector(filePath);
      signatures.push({ label, vector });
    }
  }

  return {
    signatures,
    sampleCountByLabel,
  };
}

async function main() {
  const referenceIndex = await buildReferenceIndex();
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(referenceIndex, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${referenceIndex.signatures.length} soil signatures to ${path.relative(process.cwd(), OUTPUT_PATH)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
