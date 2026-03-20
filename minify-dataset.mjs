import fs from "node:fs";

const path = "data/market-trained-data.json";
console.log("Reading data...");
const data = JSON.parse(fs.readFileSync(path, "utf8"));

console.log("Aggregating series...");
for (const crop in data.series) {
  const points = data.series[crop];
  const monthly = new Map();
  for (const pt of points) {
    const monthKey = pt.date.slice(0, 7) + "-01T00:00:00.000Z";
    const cell = monthly.get(monthKey) || { date: monthKey, timestamp: Date.parse(monthKey), sum: 0, count: 0 };
    cell.sum += pt.price;
    cell.count++;
    monthly.set(monthKey, cell);
  }
  data.series[crop] = Array.from(monthly.values())
    .map(c => ({ date: c.date, timestamp: c.timestamp, price: Number((c.sum / c.count).toFixed(1)) }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

console.log("Saving minified data...");
// No formatting spaces to keep it ultra lean!
fs.writeFileSync(path, JSON.stringify(data));
console.log("Done!");
