import { createFileRoute, Link } from "@tanstack/react-router";
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

function PathwaysPage() {
  const { mode } = useMode();
  const [filter, setFilter] = useState<"All" | PathwayCategory>("All");

  const filtered = useMemo(
    () => (filter === "All" ? pathways : pathways.filter((p) => p.category === filter)),
    [filter]
  );

  return (
    <div className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full ring-1 ring-primary/15 w-fit mb-5">
        <span className="size-1.5 rounded-full bg-primary" />
        NW London ICB
      </div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
        Haematology Pathways
      </h1>
      <p className="mt-2 text-base sm:text-lg text-muted-foreground">
        Select the condition you want to explore
      </p>

      {/* Filter pills */}
      <div className="mt-8 -mx-5 sm:mx-0 px-5 sm:px-0 overflow-x-auto">
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
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {p.description}
              </p>
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
