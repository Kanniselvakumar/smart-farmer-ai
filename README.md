# Smart Farmer AI

Smart Farmer AI is a Next.js project focused on only two modules:

- `Crop Recommendation`
- `Market Price Analysis`

The project does not include other product features in its active scope.

## Modules

### 1. Crop Recommendation

This module helps farmers choose suitable crops based on field and climate conditions.

Inputs used in the app:

- soil image upload
- soil type
- season
- temperature
- rainfall
- humidity
- water availability
- farmer location

Output shown in the app:

- detected soil type and confidence
- top crop match
- suitability score
- reasons for recommendation
- water need
- market outlook
- growing window

Main files:

- `src/app/recommendations/page.tsx`
- `src/components/recommendations/RecommendationDashboard.tsx`
- `src/lib/recommendations.ts`
- `src/lib/recommendation-data.ts`

### 2. Market Price Analysis

This module helps farmers analyze crop prices across markets and identify the best selling option.

Features included in the app:

- crop search
- current price display
- price trend analysis
- nearby market comparison
- best market recommendation
- location-based market suggestions
- API-ready data flow for future AGMARKNET integration

Main files:

- `src/app/market/page.tsx`
- `src/components/market/MarketDashboard.tsx`
- `src/app/api/market/route.ts`
- `src/lib/market-data.ts`

## Datasets

The project workspace already contains dataset folders for these two modules:

- `crop_dataset/`
- `price_dataset/`
- `soil_dataset/`

Detected files:

- `crop_dataset/Crop_recommendation.csv`
- `crop_dataset/crop_recommendation (1).csv`
- `price_dataset/agmarknet_india_historical_prices_2024_2025.csv`
- `price_dataset/market data.csv`
- `soil_dataset/CyAUG-Dataset/`

## Tech Stack

| Component | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| UI Icons | Lucide React |
| App Data Layer | Local TypeScript data modules + Next.js API route |

## Running The Project

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Active Routes

- `/`
- `/recommendations`
- `/market`
- `/api/market`

## Project Structure

```txt
src/app/
  api/market/
  market/
  recommendations/
src/components/
  layout/
  market/
  recommendations/
  ui/
src/lib/
  market-data.ts
  recommendation-data.ts
  recommendations.ts
  types.ts
crop_dataset/
price_dataset/
```

## Current Status

The project is now scoped only to crop recommendation and market price analysis. Extra routes and unrelated feature pages have been removed from the app.
