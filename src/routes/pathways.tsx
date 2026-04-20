import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { categories, pathways, type PathwayCategory } from "@/lib/pathways";
import { useMode } from "@/lib/mode";

export const Route = createFileRoute("/pathways")({
  head: () => ({
    meta: [
      { title: "Haematology Pathways — NW London ICB | ResultDoctor" },
      {
        name: "description",
        content:
          "Browse 20 NW London ICB haematology pathways. Anaemia, iron deficiency, white cells, platelets and more.",
      },
      { property: "og:title", content: "NW London ICB Haematology Pathways" },
    ],
  }),
  component: PathwaysPage,
});

// ─── Quick-entry widget ───────────────────────────────────────
//
// Maps test IDs → which pathway slug to route to.
// Expandable as more pathways become available.
const TEST_ROUTING: Record<string, { slug: string; label: string; unit: string; min: number; max: number }> = {
  hb: {
    slug: "anaemia",
    label: "Haemoglobin (Hb)",
    unit: "g/L",
    min: 50,
    max: 200,
  },
  ferritin: {
    slug: "anaemia",
    label: "Ferritin",
    unit: "ug/L",
    min: 1,
    max: 1000,
  },
  mcv: {
    slug: "anaemia",
    label: "MCV",
    unit: "fL",
    min: 40,
    max: 150,
  },
};

const TEST_OPTIONS = Object.entries(TEST_ROUTING).map(([id, cfg]) => ({
  id,
  label: cfg.label,
  unit: cfg.unit,
}));

function QuickEntryWidget() {
  const { mode } = useMode();
  const navigate = useNavigate();
  const [selectedTest, setSelectedTest] = useState<string>("hb");
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<string>("");

  const testCfg = TEST_ROUTING[selectedTest];
  const numValue = parseFloat(value);
  const isValid = value !== "" && !isNaN(numValue) && numValue >= testCfg.min && numValue <= testCfg.max;

  function handleGo() {
    if (!isValid) {
      setError(`Please enter a value between ${testCfg.min} and ${testCfg.max} ${testCfg.unit}`);
      return;
    }
    setError("");
    // Navigate to the pathway — the pathway reads state from the URL or session
    // For now, navigate directly. Future: pass result as search params.
    navigate({ to: `/pathway/${testCfg.slug}` as any });
  }

  function handleTestChange(id: string) {
    setSelectedTest(id);
    setValue("");
    setError("");
  }

  return (
    <div className="bg-card rounded-[18px] ring-2 ring-primary/20 p-6 sm:p-8 shadow-card mb-10">
      <div className="flex items-center gap-2 mb-1">
        <span className="size-2 rounded-full bg-primary animate-pulse" />
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Quick result lookup
        </p>
      </div>
      <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground mb-1">
        {mode === "patient"
          ? "Have a result? Enter it here."
          : "Enter a result to navigate directly to its pathway."}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {mode === "patient"
          ? "Select the test from your blood report and type in the number."
          : "Routes automatically to the correct decision engine."}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        {/* Test selector */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Test
          </label>
          <select
            value={selectedTest}
            onChange={(e) => handleTestChange(e.target.value)}
            className="h-12 bg-background rounded-[10px] ring-1 ring-border px-3 text-sm font-medium text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-primary transition-colors"
          >
            {TEST_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.unit})
              </option>
            ))}
          </select>
        </div>

        {/* Value input */}
        <div className="flex flex-col gap-1.5 w-40 shrink-0">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Result value
          </label>
          <div className="flex items-center h-12 bg-background rounded-[10px] ring-1 ring-border focus-within:ring-primary px-3 gap-2 transition-colors">
            <input
              type="number"
              inputMode="decimal"
              min={testCfg.min}
              max={testCfg.max}
              step="0.1"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleGo()}
              placeholder="0"
              className="flex-1 bg-transparent text-base font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40 min-w-0"
            />
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              {testCfg.unit}
            </span>
          </div>
        </div>

        {/* Go button */}
        <button
          onClick={handleGo}
          className="h-12 px-6 rounded-[10px] bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          Find pathway →
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        More tests coming soon: TSH, LFTs, B12, folate, neutrophils, platelets.
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
function PathwaysPage() {
  const { mode } = useMode();
  const [filter, setFilter] = useState<"All" | PathwayCategory>("All");

  const filtered = useMemo(
    () =>
      filter === "All"
        ? pathways
        : pathways.filter((p) => p.category === filter),
    [filter]
  );

  return (
    <div className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full ring-1 ring-primary/15 w-fit mb-5">
        <span className="size-1.5 rounded-full bg-primary" />
        NW London ICB
      </div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
        Haematology Pathways
      </h1>
      <p className="mt-2 text-base sm:text-lg text-muted-foreground mb-8">
        {mode === "patient"
          ? "Select the condition that matches your blood test result."
          : "Select the condition you want to navigate."}
      </p>

      {/* Quick entry widget */}
      <QuickEntryWidget />

      {/* Filter pills */}
      <div className="mt-2 -mx-5 sm:mx-0 px-5 sm:px-0 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ring-1 ${
                filter === c
                  ? "bg-primary text-primary-foreground ring-primary shadow-sm"
                  : "bg-card text-muted-foreground ring-border hover:text-foreground hover:ring-primary/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const Card = (
            <div
              className={`h-full bg-card rounded-[14px] p-5 ring-1 transition-all flex flex-col ${
                p.available
                  ? "ring-border hover:ring-primary hover:-translate-y-0.5 hover:shadow-card cursor-pointer"
                  : "ring-border/60 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="size-10 rounded-[10px] bg-primary/10 flex items-center justify-center text-primary">
                  <svg viewBox="0 0 24 24" fill="none" className="size-5">
                    <path
                      d="M12 2.5c3 4.5 6 7.5 6 11.5a6 6 0 1 1-12 0c0-4 3-7 6-11.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    p.available
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground ring-1 ring-border"
                  }`}
                >
                  {p.available ? "Available" : "Coming soon"}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-base text-foreground tracking-tight">
                {p.name}
              </h3>
              {mode === "patient" && (
                <p className="mt-0.5 text-xs text-primary/80 font-medium">{p.plain}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
                {p.description}
              </p>
              {p.available && (
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5 text-xs font-semibold text-primary">
                  Open pathway
                  <span>→</span>
                </div>
              )}
            </div>
          );

          return p.available ? (
            <Link key={p.slug} to="/pathway/anaemia" className="block">
              {Card}
            </Link>
          ) : (
            <div key={p.slug}>{Card}</div>
          );
        })}
      </div>
    </div>
  );
}
