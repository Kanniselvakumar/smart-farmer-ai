import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const DATASET_DIR = path.join(process.cwd(), "price_dataset");
const OUTPUT_PATH = path.join(process.cwd(), "data", "market-trained-data.json");
const MAX_LATEST_RECORDS_PER_CROP = 120;

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
};

const headerAliases = {
  state: ["State", "State Name", "state_name"],
  district: ["District", "District Name", "district_name"],
  market: ["Market", "Market Name", "Market Center Name", "market_center_name"],
  crop: ["Commodity", "commodity", "Variety"],
  date: ["Arrival_Date", "Price Date", "date_arrival"],
  modal: ["Modal_Price", "Modal Price (Rs./Quintal)", "MODAL"],
};

const monthIndex = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeCell(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeHeader(value) {
  return normalizeText(value);
}

function parseCsvLine(line) {
  const values = [];
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

function safeNumber(value) {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const namedMonthMatch = /^(\d{1,2})[- ]([A-Za-z]{3,})[- ](\d{2,4})$/.exec(trimmed);
  if (namedMonthMatch) {
    const [, dayValue, monthValue, yearValue] = namedMonthMatch;
    const month = monthIndex[monthValue.slice(0, 3).toLowerCase()];
    if (month !== undefined) {
      const yearNumber = Number(yearValue.length === 2 ? `20${yearValue}` : yearValue);
      return new Date(Date.UTC(yearNumber, month, Number(dayValue)));
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function matchCropKey(value) {
  const normalized = normalizeText(value);

  for (const [cropKey, aliases] of Object.entries(cropAliases)) {
    if (aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      return cropKey;
    }
  }

  return null;
}

function getSourceFiles() {
  const entries = fs
    .readdirSync(DATASET_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv"))
    .map((entry) => entry.name);

  const yearlyFiles = entries.filter((name) => /^\d{4}\.csv$/i.test(name)).sort();
  if (yearlyFiles.length > 0) {
    return yearlyFiles;
  }

  return entries.sort();
}

function findHeaderIndex(headers, candidates) {
  const normalizedCandidates = candidates.map(normalizeHeader);
  return headers.findIndex((header) => normalizedCandidates.includes(header));
}

function resolveSchema(headerLine) {
  const headers = parseCsvLine(headerLine).map(normalizeHeader);
  const stateIndex = findHeaderIndex(headers, headerAliases.state);
  const districtIndex = findHeaderIndex(headers, headerAliases.district);
  const marketIndex = findHeaderIndex(headers, headerAliases.market);
  const cropIndex = findHeaderIndex(headers, headerAliases.crop);
  const dateIndex = findHeaderIndex(headers, headerAliases.date);
  const modalPriceIndex = findHeaderIndex(headers, headerAliases.modal);

  if (
    stateIndex < 0 ||
    districtIndex < 0 ||
    marketIndex < 0 ||
    cropIndex < 0 ||
    dateIndex < 0 ||
    modalPriceIndex < 0
  ) {
    return null;
  }

  return {
    stateIndex,
    districtIndex,
    marketIndex,
    cropIndex,
    dateIndex,
    modalPriceIndex,
  };
}

function updateMarketHistory(store, marketKey, candidate) {
  const current = store.get(marketKey);
  if (!current) {
    store.set(marketKey, { latest: candidate, previous: null });
    return;
  }

  const shouldReplaceLatest =
    candidate.timestamp > current.latest.timestamp ||
    (candidate.timestamp === current.latest.timestamp && candidate.price > current.latest.price);

  if (shouldReplaceLatest) {
    store.set(marketKey, {
      latest: candidate,
      previous: current.latest,
    });
    return;
  }

  const shouldReplacePrevious =
    !current.previous ||
    candidate.timestamp > current.previous.timestamp ||
    (candidate.timestamp === current.previous.timestamp && candidate.price > current.previous.price);

  if (shouldReplacePrevious) {
    store.set(marketKey, {
      latest: current.latest,
      previous: candidate,
    });
  }
}

async function trainMarketModel() {
  const sourceFiles = getSourceFiles();
  if (sourceFiles.length === 0) {
    throw new Error(`No CSV files were found in ${DATASET_DIR}.`);
  }

  const dailySeriesByCrop = new Map();
  const latestByCropMarket = new Map();
  let rowsScanned = 0;
  let matchedRows = 0;
  let coverageStart = null;
  let coverageEnd = null;

  console.log(`[train:market] Training from ${sourceFiles.length} CSV files...`);

  for (const fileName of sourceFiles) {
    console.log(`[train:market] Processing ${fileName}`);
    const filePath = path.join(DATASET_DIR, fileName);
    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
    const reader = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    let schema = null;
    let isHeader = true;

    for await (const line of reader) {
      if (!line.trim()) {
        continue;
      }

      if (isHeader) {
        schema = resolveSchema(line);
        isHeader = false;
        if (!schema) {
          console.warn(`[train:market] Skipping ${fileName} because its header could not be mapped.`);
          reader.close();
        }
        continue;
      }

      if (!schema) {
        continue;
      }

      rowsScanned += 1;
      const columns = parseCsvLine(line);
      const cropName = normalizeCell(columns[schema.cropIndex] ?? "");
      const cropKey = matchCropKey(cropName);
      const modalPrice = safeNumber(columns[schema.modalPriceIndex] ?? "");
      const date = parseDate(columns[schema.dateIndex] ?? "");

      if (!cropKey || modalPrice === null || !date || Number.isNaN(date.getTime())) {
        continue;
      }

      const state = normalizeCell(columns[schema.stateIndex] ?? "");
      const district = normalizeCell(columns[schema.districtIndex] ?? "");
      const market = normalizeCell(columns[schema.marketIndex] ?? "");
      if (!state || !district || !market) {
        continue;
      }

      matchedRows += 1;
      const price = Number((modalPrice / 100).toFixed(1));
      const timestamp = date.getTime();
      const dateString = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      ).toISOString();
      const dateKey = dateString.slice(0, 7); // Aggregate monthly (YYYY-MM)
      const monthlyDateString = `${dateKey}-01T00:00:00.000Z`;

      if (!coverageStart || timestamp < Date.parse(coverageStart)) {
        coverageStart = dateString;
      }
      if (!coverageEnd || timestamp > Date.parse(coverageEnd)) {
        coverageEnd = dateString;
      }

      const cropSeries = dailySeriesByCrop.get(cropKey) ?? new Map();
      const dailyPoint = cropSeries.get(dateKey) ?? {
        date: monthlyDateString,
        timestamp: Date.parse(monthlyDateString),
        sum: 0,
        count: 0,
      };
      dailyPoint.sum += price;
      dailyPoint.count += 1;
      cropSeries.set(dateKey, dailyPoint);
      dailySeriesByCrop.set(cropKey, cropSeries);

      const marketKey = [
        cropKey,
        normalizeText(state),
        normalizeText(district),
        normalizeText(market),
      ].join(":");

      updateMarketHistory(latestByCropMarket, marketKey, {
        cropKey,
        cropName,
        market,
        district,
        state,
        price,
        date: dateString,
        timestamp,
        source: `Trained from bundled market dataset (${fileName})`,
      });
    }
  }

  const latestRecords = new Map();
  for (const { latest, previous } of latestByCropMarket.values()) {
    const bucket = latestRecords.get(latest.cropKey) ?? [];
    bucket.push({
      cropKey: latest.cropKey,
      cropName: latest.cropName,
      market: latest.market,
      district: latest.district,
      state: latest.state,
      price: latest.price,
      previousPrice: previous?.price ?? latest.price,
      date: latest.date,
      source: latest.source,
    });
    latestRecords.set(latest.cropKey, bucket);
  }

  const latestRecordsObject = Object.fromEntries(
    [...latestRecords.entries()].map(([cropKey, records]) => [
      cropKey,
      records
        .sort((left, right) => {
          if (right.price !== left.price) {
            return right.price - left.price;
          }
          return Date.parse(right.date) - Date.parse(left.date);
        })
        .slice(0, MAX_LATEST_RECORDS_PER_CROP),
    ]),
  );

  const seriesObject = Object.fromEntries(
    [...dailySeriesByCrop.entries()].map(([cropKey, cropSeries]) => [
      cropKey,
      [...cropSeries.values()]
        .sort((left, right) => left.timestamp - right.timestamp)
        .map((point) => ({
          date: point.date,
          timestamp: point.timestamp,
          price: Number((point.sum / point.count).toFixed(1)),
        })),
    ]),
  );

  const artifact = {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceFiles,
      rowsScanned,
      matchedRows,
      coverageStart,
      coverageEnd,
      sourceDescription:
        sourceFiles.length > 0 && sourceFiles.every((fileName) => /^\d{4}\.csv$/i.test(fileName))
          ? "Trained yearly historical market datasets"
          : "Trained historical market datasets",
    },
    latestRecords: latestRecordsObject,
    series: seriesObject,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  console.log(`[train:market] Saved trained market data to ${OUTPUT_PATH}`);
  console.log(`[train:market] Rows scanned: ${rowsScanned.toLocaleString("en-IN")}`);
  console.log(`[train:market] Matching rows used: ${matchedRows.toLocaleString("en-IN")}`);
  if (coverageStart && coverageEnd) {
    console.log(
      `[train:market] Historical coverage: ${coverageStart.slice(0, 10)} to ${coverageEnd.slice(0, 10)}`,
    );
  }
}

trainMarketModel().catch((error) => {
  console.error("[train:market] Training failed.");
  console.error(error);
  process.exitCode = 1;
});
