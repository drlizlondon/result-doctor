import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — ResultDoctor" },
      {
        name: "description",
        content:
          "ResultDoctor turns NHS clinical guidelines into interactive decision tools for patients and clinicians. Learn how it works and how your ICB or Trust can list pathways.",
      },
      { property: "og:title", content: "About ResultDoctor" },
      {
        property: "og:description",
        content: "Bridging the gap between blood test results and clinical pathways.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
      <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full ring-1 ring-primary/15 mb-5">
        About ResultDoctor
      </div>
      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05] text-foreground">
        Understand your results.
        <br />
        Know your next step.
      </h1>

      <Section title="Mission">
        <p>
          ResultDoctor exists to close the gap between a blood test result and a patient who
          understands what it means — and between a clinical guideline and the clinician who
          needs to apply it in 30 seconds.
        </p>
      </Section>

      <Section title="How it works">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose">
          {[
            { n: "01", t: "NHS Guideline PDF", d: "We start with an approved NHS pathway." },
            {
              n: "02",
              t: "ResultDoctor Engine",
              d: "We model the exact decision logic — verbatim, no edits.",
            },
            {
              n: "03",
              t: "A clear next step",
              d: "Patient or clinician gets a plain answer instantly.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="bg-card rounded-[14px] p-5 ring-1 ring-border shadow-card"
            >
              <div className="text-xs font-bold text-primary tracking-widest mb-2">
                {s.n}
              </div>
              <h3 className="font-semibold text-foreground tracking-tight">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="For ICBs, Trusts and Clinics">
        <p>
          Any NHS organisation can list their own clinical guidelines on ResultDoctor. Patients
          and clinicians in your area get a branded, interactive tool — built on your approved
          pathways.
        </p>
        <a
          href="mailto:partner@resultdoctor.com"
          className="not-prose inline-flex items-center gap-2 mt-4 bg-accent text-accent-foreground px-6 py-3 rounded-[12px] font-semibold text-sm shadow-amber hover:-translate-y-0.5 transition-all"
        >
          Get in touch → partner@resultdoctor.com
        </a>
      </Section>

      <Section title="Current coverage">
        <ul>
          <li>
            <strong>MVP:</strong> NW London ICB — Haematology (20 pathways)
          </li>
          <li>
            <strong>In development:</strong> Hepatology, LFTs, Cardiology
          </li>
        </ul>
      </Section>

      <Section title="Built with clinical safety in mind">
        <p>
          ResultDoctor does not generate or modify clinical content. All text is reproduced
          verbatim from NHS-approved guidelines. The tool is a navigation aid, not a diagnostic
          system.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-4">
        {title}
      </h2>
      <div className="prose prose-sm sm:prose-base max-w-none text-foreground leading-relaxed [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
