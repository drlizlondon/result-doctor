import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMode } from "@/lib/mode";

export const Route = createFileRoute("/pathway/anaemia")({
  head: () => ({
    meta: [
      { title: "Anaemia Pathway — NW London ICB | ResultDoctor" },
      {
        name: "description",
        content:
          "Step-by-step interactive Anaemia pathway. Enter Hb, MCV and ferritin to see exactly what the NHS NW London guideline recommends.",
      },
      { property: "og:title", content: "Anaemia Pathway · ResultDoctor" },
    ],
  }),
  component: AnaemiaDecisionEngine,
});

type Sex = "male" | "female";
type YN = "yes" | "no" | "na";

type State = {
  sex?: Sex;
  hb?: number;
  mcv?: number;
  ferritin?: number;
  preMeno?: YN;
  giSymptoms?: YN;
};

type Outcome = "A" | "B" | "C";

function hbThreshold(sex: Sex) {
  return sex === "male" ? 130 : 114;
}
function ferritinThreshold(sex: Sex) {
  return sex === "male" ? 20 : 10;
}

function buildSteps(s: State): Array<keyof State> {
  const steps: Array<keyof State> = ["sex", "hb"];
  if (s.sex && s.hb !== undefined && s.hb < hbThreshold(s.sex)) {
    steps.push("mcv");
    if (s.mcv !== undefined && s.mcv < 83.5) {
      steps.push("ferritin");
      if (
        s.sex &&
        s.ferritin !== undefined &&
        s.ferritin < ferritinThreshold(s.sex)
      ) {
        if (s.sex === "female") {
          steps.push("preMeno");
          if (s.preMeno === "yes") steps.push("giSymptoms");
        }
      }
    }
  }
  return steps;
}

function determineOutcome(s: State): Outcome | null {
  if (!s.sex || s.hb === undefined) return null;
  if (s.hb >= hbThreshold(s.sex)) return "C";
  if (s.mcv === undefined) return null;
  if (s.mcv >= 83.5) return "C";
  if (s.ferritin === undefined) return null;
  if (s.ferritin >= ferritinThreshold(s.sex)) return "C";

  // ferritin below threshold → iron deficiency confirmed
  if (s.sex === "female") {
    if (s.preMeno === undefined) return null;
    if (s.preMeno === "yes") {
      if (s.giSymptoms === undefined) return null;
      return s.giSymptoms === "yes" ? "B" : "A";
    }
    return "B"; // post-menopausal → GI/gynae investigation
  }
  return "B"; // male with iron deficiency → GI investigation
}

function AnaemiaDecisionEngine() {
  const { mode } = useMode();
  const [state, setState] = useState<State>({});
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(() => buildSteps(state), [state]);
  const outcome = determineOutcome(state);
  const totalSteps = steps.length;
  const currentKey = steps[stepIndex];

  const showOutcome = outcome !== null && stepIndex >= steps.length - 1 && isStepComplete(state, currentKey);

  function reset() {
    setState({});
    setStepIndex(0);
  }

  function next() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1 + (outcome ? 1 : 0)));
  }

  function back() {
    if (stepIndex === 0) return;
    setStepIndex((i) => i - 1);
  }

  if (showOutcome && outcome) {
    return <OutcomeView outcome={outcome} state={state} onReset={reset} />;
  }

  const progress = ((stepIndex + 1) / Math.max(totalSteps, 1)) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/pathways"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
            NW London ICB
          </span>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Anaemia Pathway</h1>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          Step {stepIndex + 1} of {totalSteps}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step card */}
      <div className="mt-8 bg-card rounded-[16px] p-6 sm:p-8 ring-1 ring-border shadow-card">
        <StepRenderer
          stepKey={currentKey}
          state={state}
          mode={mode}
          onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
        />
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={back}
          disabled={stepIndex === 0}
          className="px-5 py-2.5 rounded-[12px] text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={next}
          disabled={!isStepComplete(state, currentKey)}
          className="px-7 py-3 rounded-[12px] text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {stepIndex === totalSteps - 1 ? "See result →" : "Continue →"}
        </button>
      </div>
    </div>
  );
}

function isStepComplete(state: State, key: keyof State | undefined): boolean {
  if (!key) return false;
  const v = state[key];
  if (typeof v === "number") return !Number.isNaN(v);
  return v !== undefined;
}

function StepRenderer({
  stepKey,
  state,
  mode,
  onChange,
}: {
  stepKey: keyof State | undefined;
  state: State;
  mode: "patient" | "clinician";
  onChange: (patch: Partial<State>) => void;
}) {
  if (!stepKey) return null;

  switch (stepKey) {
    case "sex":
      return (
        <QuestionCard
          title={
            mode === "clinician"
              ? "What is the patient's sex assigned at birth?"
              : "What is your sex assigned at birth?"
          }
          help={
            mode === "patient"
              ? "This affects the normal range for haemoglobin."
              : undefined
          }
        >
          <div className="grid grid-cols-2 gap-3">
            {(["male", "female"] as Sex[]).map((s) => (
              <button
                key={s}
                onClick={() => onChange({ sex: s })}
                className={`px-5 py-4 rounded-[12px] text-base font-medium capitalize ring-1 transition-all ${
                  state.sex === s
                    ? "bg-primary text-primary-foreground ring-primary shadow-sm"
                    : "bg-card ring-border hover:ring-primary/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </QuestionCard>
      );

    case "hb":
      return (
        <QuestionCard
          title={
            mode === "clinician"
              ? "Enter the patient's haemoglobin (Hb) result"
              : "Enter your haemoglobin (Hb) result"
          }
          help={
            mode === "patient"
              ? "Usually shown on your blood test report. Normal range: 130 g/L or above for men, 114 g/L or above for women."
              : undefined
          }
        >
          <NumberInput
            unit="g/L"
            min={50}
            max={200}
            value={state.hb}
            onChange={(v) => onChange({ hb: v })}
          />
        </QuestionCard>
      );

    case "mcv":
      return (
        <QuestionCard
          title={
            mode === "clinician"
              ? "Enter the patient's MCV result"
              : "Enter your MCV result"
          }
          help={
            mode === "patient"
              ? "Mean Corpuscular Volume — the size of your red blood cells. Normal range is roughly 80–100 fL."
              : undefined
          }
        >
          <NumberInput
            unit="fL"
            min={40}
            max={150}
            value={state.mcv}
            onChange={(v) => onChange({ mcv: v })}
          />
        </QuestionCard>
      );

    case "ferritin":
      return (
        <QuestionCard
          title={
            mode === "clinician"
              ? "Enter the patient's ferritin level"
              : "Enter your ferritin result"
          }
          help={
            mode === "patient"
              ? "A measure of your body's iron stores. Guideline threshold: 10 ug/L for women, 20 ug/L for men."
              : undefined
          }
        >
          <NumberInput
            unit="ug/L"
            min={1}
            max={1000}
            value={state.ferritin}
            onChange={(v) => onChange({ ferritin: v })}
          />
        </QuestionCard>
      );

    case "preMeno":
      return (
        <QuestionCard
          title={
            mode === "clinician"
              ? "Is the patient pre-menopausal?"
              : "Are you pre-menopausal?"
          }
          help={
            mode === "patient" ? "i.e. have you not yet reached menopause." : undefined
          }
        >
          <ChoicePills
            value={state.preMeno}
            onChange={(v) => onChange({ preMeno: v })}
            options={[
              { v: "yes", label: "Yes" },
              { v: "no", label: "No" },
              { v: "na", label: "Not applicable" },
            ]}
          />
        </QuestionCard>
      );

    case "giSymptoms":
      return (
        <QuestionCard
          title={
            mode === "clinician"
              ? "Does the patient have upper GI symptoms or a family history of colorectal cancer?"
              : "Do you have upper digestive symptoms (heartburn, indigestion, difficulty swallowing) or a family history of bowel cancer?"
          }
        >
          <ChoicePills
            value={state.giSymptoms}
            onChange={(v) => onChange({ giSymptoms: v })}
            options={[
              { v: "yes", label: "Yes" },
              { v: "no", label: "No" },
            ]}
          />
        </QuestionCard>
      );
  }
}

function QuestionCard({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground text-balance leading-snug">
          {title}
        </h2>
        {help && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{help}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function NumberInput({
  unit,
  min,
  max,
  value,
  onChange,
}: {
  unit: string;
  min: number;
  max: number;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const invalid =
    value !== undefined && (Number.isNaN(value) || value < min || value > max);
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex items-center gap-2 bg-background rounded-[12px] ring-1 px-4 py-1 transition-colors ${
          invalid ? "ring-urgent" : "ring-border focus-within:ring-primary"
        }`}
      >
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step="0.1"
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") onChange(undefined);
            else onChange(Number(raw));
          }}
          className="flex-1 bg-transparent py-3 text-2xl font-semibold tabular-nums tracking-tight outline-none placeholder:text-muted-foreground/40"
          placeholder="0"
        />
        <span className="text-base font-medium text-muted-foreground">{unit}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Valid range: {min}–{max} {unit}
      </p>
      {invalid && (
        <p className="text-xs text-urgent font-medium">
          Please enter a value between {min} and {max} {unit}
        </p>
      )}
    </div>
  );
}

function ChoicePills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | undefined;
  onChange: (v: T) => void;
  options: Array<{ v: T; label: string }>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-5 py-4 rounded-[12px] text-base font-medium ring-1 transition-all ${
            value === o.v
              ? "bg-primary text-primary-foreground ring-primary shadow-sm"
              : "bg-card ring-border hover:ring-primary/40"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------- OUTCOMES ----------------------------- */

function OutcomeView({
  outcome,
  state: _state,
  onReset,
}: {
  outcome: Outcome;
  state: State;
  onReset: () => void;
}) {
  const { mode } = useMode();

  const config = {
    A: {
      tone: "amber",
      badge: "ROUTINE REFERRAL",
      patientHeadline: "Your results suggest iron deficiency anaemia",
      patientSummary:
        "Based on the NHS guideline for your results, your doctor should consider referring you to a haematology specialist. This is a routine (non-urgent) referral.",
      clinicianHeadline: "Routine referral to haematology indicated",
      verbatim: [
        "Persistent unexplained Fe deficiency",
        "Anaemia persisting despite adequate treatment of iron deficiency",
        "Patient intolerant of oral iron / requiring parenteral iron",
      ],
      verbatimTitle: "Routine referral to haematology",
    },
    B: {
      tone: "urgent",
      badge: "SPECIALIST REFERRAL",
      patientHeadline: "Specialist investigation is recommended",
      patientSummary:
        "Your results suggest you may need to be referred to a specialist (gastroenterology, gynaecology or urology) to investigate the cause of your iron deficiency.",
      clinicianHeadline: "Refer to appropriate speciality",
      verbatim: ["Refer to appropriate speciality (gastro, gynae, and urology)"],
      verbatimTitle: "Specialist referral indicated",
    },
    C: {
      tone: "success",
      badge: "PRIMARY CARE — NO REFERRAL YET",
      patientHeadline: "Further investigation in primary care is recommended",
      patientSummary:
        "Based on the NHS guideline, your results don't currently meet the threshold for specialist referral. Your GP should perform additional background investigations first.",
      clinicianHeadline: "Appropriate investigation in primary care",
      verbatim: [
        "Careful history focussing on duration, symptoms, bleeding, diet, drug and family history",
        "Blood film and reticulocyte count",
        "Ferritin, B12, folate",
        "Immunoglobulins, serum protein electrophoresis, serum free light chains",
        "Renal and liver function",
        "ESR and CRP",
        "Autoimmune screen to exclude chronic inflammation",
      ],
      verbatimTitle: "Background investigations",
    },
  }[outcome];

  const toneClasses = {
    amber: {
      border: "border-l-warning",
      badge: "bg-warning/15 text-amber-900 ring-warning/30",
      icon: "bg-warning/15 text-amber-900",
    },
    urgent: {
      border: "border-l-urgent",
      badge: "bg-urgent/10 text-urgent ring-urgent/30",
      icon: "bg-urgent/10 text-urgent",
    },
    success: {
      border: "border-l-success",
      badge: "bg-success/15 text-success ring-success/30",
      icon: "bg-success/15 text-success",
    },
  }[config.tone as "amber" | "urgent" | "success"];

  return (
    <div className="w-full max-w-2xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/pathways"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All pathways
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
          NW London ICB
        </span>
      </div>

      <div
        className={`bg-card rounded-[16px] p-6 sm:p-8 ring-1 ring-border shadow-card border-l-4 ${toneClasses.border}`}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`size-10 rounded-full flex items-center justify-center ${toneClasses.icon}`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5">
              <path
                d="M9 12.5l2.2 2.2L15.5 10"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ring-1 ${toneClasses.badge}`}
          >
            {config.badge}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
          {mode === "patient" ? config.patientHeadline : config.clinicianHeadline}
        </h1>
        {mode === "patient" && (
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            {config.patientSummary}
          </p>
        )}

        {/* Verbatim block */}
        <div className="mt-6 rounded-[12px] bg-background ring-1 ring-border p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
            <span>📋</span>
            <span>NW London ICB Guideline (V1) — verbatim</span>
          </div>
          <p className="text-sm font-semibold text-foreground mb-2">
            {config.verbatimTitle}:
          </p>
          <ul className="space-y-1.5">
            {config.verbatim.map((line) => (
              <li
                key={line}
                className="text-sm text-foreground leading-relaxed pl-4 relative"
              >
                <span className="absolute left-0 text-primary">•</span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2.5 rounded-[12px] text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            🔄 Start Again
          </button>
          <button
            onClick={() => typeof window !== "undefined" && window.print()}
            className="px-4 py-2.5 rounded-[12px] text-sm font-semibold bg-card ring-1 ring-border hover:ring-primary/40 transition-all"
          >
            🖨 Print / Save
          </button>
          <a
            href={`mailto:?subject=${encodeURIComponent(
              "My ResultDoctor outcome"
            )}&body=${encodeURIComponent(
              `${config.patientHeadline}\n\n${config.verbatimTitle}:\n${config.verbatim
                .map((l) => "• " + l)
                .join("\n")}\n\n— Generated by ResultDoctor`
            )}`}
            className="px-4 py-2.5 rounded-[12px] text-sm font-semibold bg-card ring-1 ring-border hover:ring-primary/40 transition-all"
          >
            📤 Share with GP
          </a>
        </div>
      </div>

      {mode === "patient" && (
        <details className="mt-6 group bg-card rounded-[14px] ring-1 ring-border overflow-hidden">
          <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between font-semibold text-sm text-foreground hover:bg-muted/50 transition-colors">
            <span>💬 What should I say to my doctor?</span>
            <span className="text-muted-foreground group-open:rotate-180 transition-transform">
              ⌄
            </span>
          </summary>
          <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-2.5 border-t border-border pt-4">
            <p>Suggested questions to ask at your next appointment:</p>
            <ul className="space-y-1.5 list-disc pl-5">
              <li>What does this result mean for me specifically?</li>
              <li>What is the next step in my care, and how soon should it happen?</li>
              <li>
                Do I need a referral, and if so, to which specialty?
              </li>
              <li>Are there any symptoms I should look out for in the meantime?</li>
              <li>When should I have my blood tested again?</li>
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
