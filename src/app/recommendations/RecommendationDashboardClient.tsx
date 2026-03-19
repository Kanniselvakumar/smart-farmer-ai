"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  BarChart3,
  BrainCircuit,
  CloudRain,
  Droplets,
  ImageUp,
  IndianRupee,
  Leaf,
  LoaderCircle,
  MapPin,
  RotateCcw,
  ScanSearch,
  ThermometerSun,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  defaultRecommendationInput,
  farmerLocations,
  soilTypeDetails,
} from "@/lib/recommendation-data";
import {
  seasons,
  type SoilClassificationResponse,
  waterAvailabilityLevels,
  type RecommendationInput,
  type RecommendationResponse,
} from "@/lib/types";

function getFitColors(label: string) {
  if (label === "Excellent Match") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (label === "Good Match") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-200 text-slate-700";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLocationLabel(locationName: string) {
  const location = farmerLocations.find((item) => item.name === locationName);
  if (!location) {
    return locationName;
  }

  return location.name === location.state ? location.name : `${location.name}, ${location.state}`;
}

export function RecommendationDashboardClient() {
  const [form, setForm] = useState(defaultRecommendationInput);
  const [response, setResponse] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [soilPhoto, setSoilPhoto] = useState<File | null>(null);
  const [soilPreviewUrl, setSoilPreviewUrl] = useState<string | null>(null);
  const [soilPrediction, setSoilPrediction] = useState<SoilClassificationResponse | null>(null);
  const [soilError, setSoilError] = useState<string | null>(null);
  const [isClassifyingSoil, setIsClassifyingSoil] = useState(false);
  const [soilInputKey, setSoilInputKey] = useState(0);
  const soilInputRef = useRef<HTMLInputElement | null>(null);

  async function classifySoil(file: File) {
    setIsClassifyingSoil(true);
    setSoilError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const result = await fetch("/api/soil", {
        method: "POST",
        body: formData,
      });

      const payload = (await result.json()) as SoilClassificationResponse & { error?: string };
      if (!result.ok) {
        throw new Error(payload.error ?? "Unable to classify the soil image right now.");
      }

      const nextForm = {
        ...form,
        soilType: payload.soilType,
      } satisfies RecommendationInput;

      setSoilPrediction(payload);
      setForm(nextForm);
      await loadRecommendations(nextForm);
    } catch (classificationError) {
      setSoilError(
        classificationError instanceof Error
          ? classificationError.message
          : "Unable to classify the soil image right now. Please try a different photo or check your connection.",
      );
    } finally {
      setIsClassifyingSoil(false);
    }
  }

  async function loadRecommendations(nextForm: RecommendationInput) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextForm),
      });

      if (!result.ok) {
        throw new Error("Unable to generate recommendations right now.");
      }

      const payload = (await result.json()) as RecommendationResponse;
      setResponse(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to generate recommendations right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecommendations(defaultRecommendationInput);
  }, []);

  useEffect(() => {
    if (!soilPhoto) {
      setSoilPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(soilPhoto);
    setSoilPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [soilPhoto]);

  function updateField<Key extends keyof RecommendationInput>(
    key: Key,
    value: RecommendationInput[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadRecommendations(form);
  }

  function handleReset() {
    setForm(defaultRecommendationInput);
    setSoilPhoto(null);
    setSoilPreviewUrl(null);
    setSoilPrediction(null);
    setSoilError(null);
    setSoilInputKey((current) => current + 1);
    if (soilInputRef.current) {
      soilInputRef.current.value = "";
    }
    void loadRecommendations(defaultRecommendationInput);
  }

  function handleSoilPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSoilPhoto(file);
    setSoilPrediction(null);
    setSoilError(null);

    if (file) {
      void classifySoil(file);
    }

    // Reset the target value to ensure selecting the same file again triggers the event.
    event.target.value = "";
  }

  function handleChooseSoilPhoto() {
    soilInputRef.current?.click();
  }

  function handleClearSoilPhoto() {
    setSoilPhoto(null);
    setSoilPreviewUrl(null);
    setSoilPrediction(null);
    setSoilError(null);
    setSoilInputKey((current) => current + 1);
    if (soilInputRef.current) {
      soilInputRef.current.value = "";
    }
  }

  async function handleDetectSoil() {
    if (!soilPhoto) {
      setSoilError("Upload a soil photo first.");
      return;
    }
    await classifySoil(soilPhoto);
  }

  const topMatch = response?.recommendations[0];
  const soilDetail = soilTypeDetails.find((soilType) => soilType.value === form.soilType);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#204b39_0%,#2d6a4f_46%,#d0a142_100%)] p-8 text-white shadow-[0_30px_80px_rgba(32,75,57,0.28)]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur">
            <BrainCircuit className="h-4 w-4" />
            Soil photo + crop engine
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Upload a soil image, detect the soil type, and rank the best crops for Indian field conditions.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50/90 sm:text-lg">
            Soil photos are compared against the bundled soil dataset, mapped into a crop-ready soil type,
            and then pushed into the recommendation model automatically.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/15 bg-black/10 p-4">
              <p className="text-sm text-emerald-100/80">AI soil output</p>
              <p className="mt-2 text-2xl font-semibold text-balance">
                {soilPrediction ? `${soilPrediction.soilType} (${soilPrediction.confidence}%)` : "Waiting for upload"}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 bg-black/10 p-4">
              <p className="text-sm text-emerald-100/80">Crop model</p>
              <p className="mt-2 text-2xl font-semibold text-balance">{response?.meta.model ?? "Loading..."}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 bg-black/10 p-4">
              <p className="text-sm text-emerald-100/80">Location scope</p>
              <p className="mt-2 text-2xl font-semibold">All India</p>
            </div>
          </div>
        </div>

        <Card className="rounded-[2rem] border-emerald-100 bg-white/90">
          {isLoading && !topMatch ? (
            <div className="flex min-h-[19rem] items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-emerald-700" />
            </div>
          ) : topMatch ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700/80">
                    Top match
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-900">{topMatch.name}</h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getFitColors(topMatch.fitLabel)}`}
                >
                  {topMatch.fitLabel}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">{topMatch.summary}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-700/80">Confidence</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {topMatch.confidence}%
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-700/80">Water need</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{topMatch.waterNeed}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-sky-700/80">Growing window</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {topMatch.growingWindow}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Why it ranks first</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {topMatch.reasons.map((reason) => (
                    <li key={reason}>- {reason}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              Recommendation results will appear here after the model responds.
            </p>
          )}
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/88">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Field details</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Upload a soil image or enter field conditions manually to refresh the crop shortlist.
            </p>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50/70 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-3 text-emerald-700 shadow-sm">
                  <ImageUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Soil image detection</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Upload a soil photo. The app checks it against the local soil dataset and maps the
                    result into a crop-ready soil type such as Loamy, Sandy, or Clay.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr,1.05fr]">
                <div className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Soil photo</span>
                  <input
                    ref={soilInputRef}
                    key={soilInputKey}
                    className="hidden"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    suppressHydrationWarning
                    onChange={handleSoilPhotoChange}
                  />
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-200"
                        suppressHydrationWarning
                        type="button"
                        onClick={handleChooseSoilPhoto}
                      >
                        <ImageUp className="h-4 w-4" />
                        Choose soil photo
                      </button>

                      {soilPhoto ? (
                        <button
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          suppressHydrationWarning
                          type="button"
                          onClick={handleClearSoilPhoto}
                        >
                          Clear file
                        </button>
                      ) : null}
                    </div>

                    <p className="mt-3 text-sm text-slate-700">
                      {soilPhoto ? soilPhoto.name : "No file chosen"}
                    </p>
                  </div>
                  <span className="text-xs leading-5 text-slate-500">
                    Tip: use a close, well-lit soil image without heavy shadows.
                  </span>
                </div>

                <div className="overflow-hidden rounded-[1.5rem] border border-dashed border-slate-200 bg-white/80">
                  {soilPreviewUrl ? (
                    <Image
                      src={soilPreviewUrl}
                      alt="Uploaded soil preview"
                      className="h-48 w-full object-cover"
                      width={640}
                      height={320}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center px-6 text-center text-sm leading-6 text-slate-500">
                      Soil preview will appear here after upload.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  suppressHydrationWarning
                  type="button"
                  onClick={handleDetectSoil}
                  disabled={!soilPhoto || isClassifyingSoil}
                >
                  {isClassifyingSoil ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanSearch className="h-4 w-4" />
                  )}
                  {isClassifyingSoil ? "Detecting soil..." : "Detect soil from photo"}
                </button>

                {soilPrediction ? (
                  <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-900">
                    Soil Type: {soilPrediction.soilType} | Confidence: {soilPrediction.confidence}%
                  </span>
                ) : null}
              </div>

              {soilPrediction ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Detected soil</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{soilPrediction.soilType}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Confidence</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{soilPrediction.confidence}%</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Dataset family</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{soilPrediction.datasetFamily}</p>
                  </div>
                </div>
              ) : null}

              {soilPrediction?.alternatives.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {soilPrediction.alternatives.map((alternative) => (
                    <span
                      key={`${alternative.soilType}-${alternative.confidence}`}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {alternative.soilType} {alternative.confidence}%
                    </span>
                  ))}
                </div>
              ) : null}

              {soilError ? (
                <p className="mt-4 text-sm font-medium text-rose-700">{soilError}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Soil type
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
                  suppressHydrationWarning
                  value={form.soilType}
                  onChange={(event) =>
                    updateField("soilType", event.target.value as RecommendationInput["soilType"])
                  }
                >
                  {soilTypeDetails.map((soilType) => (
                    <option key={soilType.value} value={soilType.value}>
                      {soilType.label} - {soilType.description}
                    </option>
                  ))}
                </select>
                {soilDetail ? (
                  <span className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-900">
                    Example: {soilDetail.fieldExample}
                  </span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Season
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
                  suppressHydrationWarning
                  value={form.season}
                  onChange={(event) =>
                    updateField("season", event.target.value as RecommendationInput["season"])
                  }
                >
                  {seasons.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Temperature (C)
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
                  type="number"
                  min={10}
                  max={45}
                  suppressHydrationWarning
                  value={form.temperature}
                  onChange={(event) => updateField("temperature", Number(event.target.value))}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Rainfall (mm)
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
                  type="number"
                  min={0}
                  max={2000}
                  suppressHydrationWarning
                  value={form.rainfall}
                  onChange={(event) => updateField("rainfall", Number(event.target.value))}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Humidity (%)
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
                  type="number"
                  min={20}
                  max={100}
                  suppressHydrationWarning
                  value={form.humidity}
                  onChange={(event) => updateField("humidity", Number(event.target.value))}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Water availability
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
                  suppressHydrationWarning
                  value={form.waterAvailability}
                  onChange={(event) =>
                    updateField(
                      "waterAvailability",
                      event.target.value as RecommendationInput["waterAvailability"],
                    )
                  }
                >
                  {waterAvailabilityLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Farmer location
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
                suppressHydrationWarning
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
              >
                {farmerLocations.map((location) => (
                  <option key={`${location.name}-${location.state}`} value={location.name}>
                    {formatLocationLabel(location.name)}
                  </option>
                ))}
              </select>
              <span className="text-xs leading-5 text-slate-500">
                Selected location: {formatLocationLabel(form.location)}
              </span>
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                suppressHydrationWarning
                type="submit"
              >
                {isLoading ? "Running model..." : "Generate recommendations"}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                suppressHydrationWarning
                type="button"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4" />
                Reset defaults
              </button>
            </div>
          </form>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-[2rem] border-white/70 bg-white/88">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Confidence chart</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Top 3 crops ranked by the blended model-and-agronomy confidence score.
                </p>
              </div>
              {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" /> : null}
            </div>

            <div className="mt-6 space-y-4">
              {(response?.chart ?? []).map((point) => (
                <div key={point.name}>
                  <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>{point.name}</span>
                    <span>{point.confidence}%</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#2d6a4f_0%,#74c69d_55%,#f4a340_100%)]"
                      style={{ width: `${point.confidence}%` }}
                    />
                  </div>
                </div>
              ))}

              {!isLoading && (response?.chart.length ?? 0) === 0 ? (
                <p className="text-sm leading-6 text-slate-600">No chart data is available yet.</p>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-[2rem] border-white/70 bg-white/88">
            <div className="flex items-center gap-3">
              <IndianRupee className="h-5 w-5 text-amber-700" />
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Profit suggestion</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Combined view from crop fit plus the best market price the app currently knows.
                </p>
              </div>
            </div>

            {response?.topInsight ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-sm font-semibold text-emerald-900">
                    Recommended crop: {response.topInsight.crop}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                    Best market found: {response.topInsight.market}
                  </p>
                  <p className="mt-1 text-sm text-emerald-900/80">{response.topInsight.location}</p>
                </div>
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-semibold text-amber-900">Estimated profit per acre</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">
                    {formatCurrency(response.topInsight.expectedProfitPerAcre)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-900/80">
                    Price basis: {response.topInsight.priceSource}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 md:col-span-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Latest known price: {formatCurrency(response.topInsight.price)}/{response.topInsight.unit}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {response.topInsight.explanation}
                  </p>
                  {response.topInsight.projectedNextWeekPrice !== null ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Next-week projection: {formatCurrency(response.topInsight.projectedNextWeekPrice)}/
                      {response.topInsight.unit}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm leading-6 text-slate-600">
                A profit card appears when the app has a matching market price source for the top crop.
              </p>
            )}
          </Card>
        </div>
      </section>

      {error ? (
        <Card className="mt-6 rounded-[1.75rem] border-rose-200 bg-rose-50">
          <p className="text-sm font-semibold text-rose-900">Recommendation engine is unavailable</p>
          <p className="mt-2 text-sm leading-6 text-rose-800/80">{error}</p>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-4">
        {(response?.recommendations ?? []).map((result, index) => (
          <Card key={result.id} className="rounded-[2rem] border-white/70 bg-white/88">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Option {index + 1}
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">{result.name}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{result.summary}</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getFitColors(result.fitLabel)}`}
                >
                  {result.fitLabel}
                </span>
                <p className="text-3xl font-semibold text-slate-900">{result.confidence}%</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Model confidence</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{result.modelConfidence}%</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Agronomy fit</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{result.agronomyFit}/100</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Water need</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{result.waterNeed}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Market outlook</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{result.marketOutlook}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr,0.95fr]">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Why this crop fits</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {result.reasons.map((reason) => (
                    <li key={reason}>- {reason}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">Watchout</p>
                <p className="mt-3 text-sm leading-6 text-amber-900/80">{result.caution}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.supportingSignals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {result.marketInsight ? (
              <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-semibold text-emerald-900">Best selling option</p>
                <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                  {result.marketInsight.market} in {result.marketInsight.location} is the best known
                  selling point for this crop right now, at
                  {" "}{formatCurrency(result.marketInsight.price)}/{result.marketInsight.unit}.
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Expected profit: {formatCurrency(result.marketInsight.expectedProfitPerAcre)} per acre
                </p>
              </div>
            ) : null}
          </Card>
        ))}
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <div className="flex items-center gap-3">
            <ScanSearch className="h-5 w-5 text-emerald-700" />
            <p className="text-sm font-semibold text-slate-900">Soil image detection</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Uploaded photos are matched against the local soil dataset before the crop model runs.
          </p>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-sky-700" />
            <p className="text-sm font-semibold text-slate-900">Short practical shortlist</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Weak crop matches are filtered out so the page stays focused on practical options.
          </p>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <div className="flex items-center gap-3">
            <Droplets className="h-5 w-5 text-cyan-700" />
            <p className="text-sm font-semibold text-slate-900">Farmer-friendly soil help</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Soil choices still include plain-language descriptions for manual override when needed.
          </p>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-amber-700" />
            <p className="text-sm font-semibold text-slate-900">All India locations</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Recommendation defaults now support states and union territories across India.
          </p>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <div className="flex items-center gap-3">
            <ThermometerSun className="h-5 w-5 text-orange-600" />
            <p className="text-sm font-semibold text-slate-900">Temperature signal</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Input temperature is compared against the training ranges that each crop learned from.
          </p>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <div className="flex items-center gap-3">
            <CloudRain className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-semibold text-slate-900">Rainfall signal</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Rainfall is blended with soil, season, and zone to keep the shortlist field-specific.
          </p>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <div className="flex items-center gap-3">
            <Leaf className="h-5 w-5 text-emerald-700" />
            <p className="text-sm font-semibold text-slate-900">AI into recommendation</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The detected soil type is applied directly to the crop recommendation form and reruns the model.
          </p>
        </Card>
      </section>
    </div>
  );
}

