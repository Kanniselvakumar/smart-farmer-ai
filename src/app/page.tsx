import Link from "next/link";
import { ArrowRight, DatabaseZap, MapPinned, Sprout, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,#264f3f_0%,#2e6a4d_50%,#cf9a3f_100%)] p-8 text-white shadow-[0_30px_80px_rgba(38,79,63,0.28)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur">
            <Sprout className="h-4 w-4" />
            Smart Farmer AI
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
            Build cultivation and selling decisions around clear signals.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50/90 sm:text-lg">
            This project focuses on two practical modules: crop recommendations for planning and a
            market dashboard for price visibility, trend tracking, and best-market suggestions.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/recommendations"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
            >
              Open crop recommendations
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/market"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Open market dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <Card className="rounded-[2rem] border-white/70 bg-white/88">
            <div className="flex items-center gap-3">
              <Sprout className="h-5 w-5 text-emerald-700" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
                Module one
              </p>
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900">Crop Recommendations</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Upload a soil photo, detect the soil type, and rank crops using season, rainfall,
              humidity, water availability, and India-wide growing zones.
            </p>
            <Link
              href="/recommendations"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"
            >
              Explore recommendation engine
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>

          <Card className="rounded-[2rem] border-white/70 bg-white/88">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-amber-700" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700/80">
                Module two
              </p>
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900">Market Price Dashboard</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Search crops, compare nearby markets, review price trends, and prepare the data layer
              for real AGMARKNET integration.
            </p>
            <Link
              href="/market"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-700"
            >
              Explore market dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <div className="flex items-center gap-3">
            <DatabaseZap className="h-5 w-5 text-emerald-700" />
            <p className="text-sm font-semibold text-slate-900">API-ready market layer</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The market page is already wired through a Next.js API route so it can evolve from a
            local cache to real market feeds cleanly.
          </p>
        </Card>

        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <div className="flex items-center gap-3">
            <MapPinned className="h-5 w-5 text-sky-700" />
            <p className="text-sm font-semibold text-slate-900">Location-aware selling</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Nearby-market ranking helps farmers compare price opportunities without scanning every
            market manually.
          </p>
        </Card>

        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <div className="flex items-center gap-3">
            <Sprout className="h-5 w-5 text-amber-700" />
            <p className="text-sm font-semibold text-slate-900">Planning before planting</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Recommendation scoring gives farmers a short, practical crop shortlist instead of a
            confusing open-ended result.
          </p>
        </Card>
      </section>
    </div>
  );
}
