import { createFileRoute, Link } from "@tanstack/react-router";
import { useMode } from "@/lib/mode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResultDoctor — Understand your results. Know your next step." },
      {
        name: "description",
        content:
          "Convert NHS clinical guidelines into interactive step-by-step decision tools. Enter your blood test results and find out exactly what should happen next.",
      },
      { property: "og:title", content: "ResultDoctor — Understand your results." },
      {
        property: "og:description",
        content: "Interactive NHS clinical pathways for patients and clinicians.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { mode } = useMode();

  return (
    <div className="w-full max-w-[1280px] mx-auto px-5 sm:px-8">
      {/* Hero */}
      <section className="pt-12 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        <div className="lg:col-span-7 flex flex-col gap-7 max-w-[640px]">
          <div className="inline-flex items-center gap-2 self-start text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full ring-1 ring-primary/15">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Built on NHS NW London pathways
          </div>
          <h1 className="text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.05] text-foreground text-balance">
            {mode === "patient"
              ? "Got a blood test result? Let's make sense of it."
              : "Navigate clinical pathways. Fast. Without error."}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-[50ch]">
            Powered by NW London NHS clinical guidelines.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <Link
              to="/pathways"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-7 py-3.5 rounded-[12px] font-semibold text-base shadow-amber hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgb(245_166_35_/_0.55)] transition-all"
            >
              Get Started
              <span aria-hidden>→</span>
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </Link>
          </div>
        </div>

        {/* Right: source cards */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em] pb-2 border-b border-border/70">
            Select your guideline source
          </h2>

          <Link
            to="/pathways"
            className="bg-card rounded-[14px] p-5 ring-2 ring-primary shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm ring-1 ring-inset ring-primary/20">
                NW
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg text-foreground tracking-tight">
                  NW London ICB
                </h3>
                <p className="text-sm text-muted-foreground">
                  Haematology · 20 pathways
                </p>
              </div>
            </div>
            <div className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              →
            </div>
          </Link>

          {[
            { code: "IC", title: "Your ICB", sub: "Upload your own guidelines" },
            { code: "TR", title: "Your Hospital Trust", sub: "Trust-specific pathways" },
          ].map((c) => (
            <div
              key={c.code}
              className="bg-card/40 rounded-[14px] p-5 ring-1 ring-dashed ring-border flex items-center justify-between cursor-not-allowed"
            >
              <div className="flex items-center gap-4 opacity-50">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm">
                  {c.code}
                </div>
                <div>
                  <h3 className="font-medium text-base sm:text-lg text-foreground tracking-tight">
                    {c.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{c.sub}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground bg-card px-2.5 py-1 rounded-md ring-1 ring-border tracking-wide uppercase">
                Soon
              </span>
            </div>
          ))}

          <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
            Are you an ICB, Trust or clinic?
            <br />
            Contact us to list your guidelines →{" "}
            <a
              href="mailto:partner@resultdoctor.com"
              className="text-primary font-medium hover:underline"
            >
              partner@resultdoctor.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
