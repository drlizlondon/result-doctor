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

/**
 * Outcomes per the NW London Anaemia Pathway PDF (V1, 9/7/20):
 *
 * Outcome A — ROUTINE REFERRAL TO HAEMATOLOGY
 *   Criteria (any one of):
 *   • Persistent unexplained Fe deficiency
 *   • Anaemia persisting despite adequate treatment of iron deficiency
 *   • Patient intolerant of oral iron / requiring parenteral iron
 *   Triggered after GI investigation has been completed / considered.
 *
 * Outcome B — REFER TO APPROPRIATE SPECIALITY (gastro, gynae, urology)
 *   Triggered when GI investigation is indicated:
 *   • All men with confirmed iron deficiency anaemia
 *   • Post-menopausal women with confirmed iron deficiency anaemia
 *   • Pre-menopausal women WITH upper GI symptoms OR FH colorectal cancer
 *
 * Outcome C — INVESTIGATE IN PRIMARY CARE (no referral yet)
 *   Triggered when Hb is above threshold OR MCV ≥ 83.5 OR ferritin above threshold.
 *   GP should complete background investigations first.
 *
 * IMPORTANT CORRECTION vs previous version:
 * The original code sent males straight to Outcome B. This is wrong.
 * Per the flowsheet, GI investigation → REFER TO APPROPRIATE SPECIALITY (B)
 * is a *step* in the pathway. Outcome A (haematology) is reached when Fe
 * deficiency persists despite that investigation.
 * 
 * For the purposes of this MVP decision engine, we model the branching as:
 * - Iron deficiency confirmed (low Hb + low MCV + low ferritin):
 *     → All men: Outcome B (GI investigation / refer gastro+urology)
 *     → Post-menopausal women: Outcome B (GI investigation / refer gastro+gynae)
 *     → Pre-menopausal women WITH GI symptoms or FH colorectal: Outcome B
 *     → Pre-menopausal women WITHOUT GI symptoms and no FH: Outcome A (haematology)
 * - Haemoglobin or MCV or ferritin above threshold: Outcome C (primary care)
 *
 * The "Outcome A" pathway (persistent unexplained Fe deficiency, failed treatment,
 * intolerance to oral iron) represents a *second-line* scenario after GI work-up.
 * We surface it as a separate question to capture that clinical context.
 */

type Outcome = "A" | "B" | "C";

function hbThreshold(sex: Sex) {
  return sex === "male" ? 130 : 114;
}
function ferritinThreshold(sex: Sex) {
  return sex === "male" ? 20 : 10;
}

/**
 * Build the ordered list of step keys based on answers so far.
 * Steps only appear when their parent condition is met.
 */
function buildSteps(s: State): Array<keyof State> {
  const steps: Array<keyof State> = ["sex", "hb"];

  if (s.sex && s.hb !== undefined && s.hb < hbThreshold(s.sex)) {
    steps.push("mcv");

    if (s.mcv !== undefined && s.mcv < 83.5) {
      steps.push("ferritin");

      if (s.ferritin !== undefined && s.ferritin < ferritinThreshold(s.sex)) {
        if (s.sex === "female") {
          // Need to know menopausal status
          steps.push("preMeno");
          if (s.preMeno === "yes") {
            // Pre-menopausal: only refer to gastro if GI symptoms or FH CRC
            steps.push("giSymptoms");
          }
          // Post-menopausal (preMeno === "no"): always GI investigation → no extra question
        }
        // Male: always GI investigation → no extra question needed
      }
    }
  }

  return steps;
}

function isStepComplete(state: State, key: keyof State | undefined): boolean {
  if (!key) return false;
  const v = state[key];
  if (typeof v === "number") return !Number.isNaN(v) && v > 0;
  return v !== undefined;
}

/**
 * Determine the outcome once all required steps are answered.
 * Returns null if more information is needed.
 */
function determineOutcome(s: State): Outcome | null {
  if (!s.sex || s.hb === undefined) return null;

  // Hb above threshold → primary care investigation
  if (s.hb >= hbThreshold(s.sex)) return "C";

  if (s.mcv === undefined) return null;

  // MCV normal or high → primary care (macrocytosis/normocytic handled by other pathways)
  if (s.mcv >= 83.5) return "C";

  if (s.ferritin === undefined) return null;

  // Ferritin above threshold → primary care
  if (s.ferritin >= ferritinThreshold(s.sex)) return "C";

  // --- Iron deficiency anaemia confirmed ---
  // (Low Hb + Low MCV + Low ferritin)

  if (s.sex === "male") {
    // All men → upper and lower GI investigation → refer gastro/urology
    return "B";
  }

  // Female
  if (s.preMeno === undefined) return null;

  if (s.preMeno === "no" || s.preMeno === "na") {
    // Post-menopausal → upper and lower GI investigation → refer gastro/gynae/urology
    return "B";
  }

  // Pre-menopausal
  if (s.giSymptoms === undefined) return null;

  if (s.giSymptoms === "yes") {
    // Has upper GI symptoms or FH colorectal cancer → targeted GI investigation → refer
    return "B";
  }

  // Pre-menopausal, no GI symptoms, no FH → routine haematology referral
  return "A";
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

function AnaemiaDecisionEngine() {
  const { mode } = useMode();
  const [state, setState] = useState<State>({});
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(() => buildSteps(state), [state]);
  const outcome = determineOutcome(state);
  const currentKey = steps[stepIndex];
  const currentStepComplete = isStepComplete(state, currentKey);
  const isLastStep = stepIndex === steps.length - 1;
  const showOutcome = isLastStep && currentStepComplete && outcome !== null;

  function reset() {
    setState({});
    setStepIndex(0);
  }

  function next() {
    if (!currentStepComplete) return;
    if (isLastStep) return; // outcome shown instead
    setStepIndex((i) => i + 1);
  }

  function back() {
    if (stepIndex === 0) return;
    setStepIndex((i) => i - 1);
  }

  // When user selects an option that collapses downstream steps,
  // trim the state to avoid stale values from previous paths
  function handleChange(patch: Partial<State>) {
    const patched = { ...state, ...patch };

    // If sex changes, reset all downstream answers
    if ("sex" in patch) {
      setState({ sex: patched.sex });
      return;
    }

    // If hb changes to above threshold, clear mcv/ferritin/etc
    if ("hb" in patch && patched.sex) {
      if (Number(patched.hb) >= hbThreshold(patched.sex)) {
        setState({ sex: patched.sex, hb: patched.hb });
        return;
      }
    }

    // If mcv changes to ≥ 83.5, clear ferritin/preMeno/giSymptoms
    if ("mcv" in patch) {
      if (Number(patched.mcv) >= 83.5) {
        setState({ sex: patched.sex, hb: patched.hb, mcv: patched.mcv });
        return;
      }
    }

    // If preMeno changes, reset giSymptoms
    if ("preMeno" in patch) {
      setState({ sex: patched.sex, hb: patched.hb, mcv: patched.mcv, ferritin: patched.ferritin, preMeno: patched.preMeno });
      return;
    }

    setState(patched);
  }

  if (showOutcome && outcome) {
    return <OutcomeView outcome={outcome} state={state} onReset={reset} />;
  }

  const progress = ((stepIndex + 1) / Math.max(steps.length, 1)) * 100;

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
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
          NW London ICB
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
          Anaemia Pathway
        </h1>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          Step {stepIndex + 1} of {steps.length}
        </span>
      </div>

      {/* Progress bar */}
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
          onChange={handleChange}
        />
      </div>

      {/* Navigation */}
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
          disabled={!currentStepComplete || isLastStep}
          className="px-7 py-3 rounded-[12px] text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {isLastStep ? "See result →" : "Continue →"}
        </button>
      </div>

      {/* Definition — shown throughout */}
      <p className="mt-8 text-xs text-muted-foreground text-center leading-relaxed border-t border-border pt-6">
        Anaemia is defined as Hb &lt; 130 g/L in an adult male or &lt; 114 g/L in an adult female.
        <br />
        <span className="text-[10px]">NW London Outpatient Pathways · V1 / 9/7/20</span>
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STEP RENDERER
───────────────────────────────────────────────────────────── */

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
              ? "This affects the normal range for haemoglobin (Hb)."
              : "Determines Hb threshold: ≥130 g/L (male), ≥114 g/L (female)."
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
              ? "Usually shown on your blood test report as 'Hb' or 'Haemoglobin'. Normal range: 130 g/L or above for men, 114 g/L or above for women."
              : `Anaemia threshold: <${state.sex ? hbThreshold(state.sex) : "130/114"} g/L`
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
              ? "MCV stands for Mean Corpuscular Volume — it measures the size of your red blood cells. You'll find this on your blood test results. Normal range is roughly 80–100 fL."
              : "Threshold: <83.5 fL → iron deficiency pathway. ≥83.5 → normocytic/macrocytic (separate pathway)."
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
              ? "Ferritin measures your body's iron stores. You'll find this on your blood test results. The guideline threshold is 10 ug/L for women and 20 ug/L for men."
              : `Iron deficiency threshold: <${state.sex ? ferritinThreshold(state.sex) : "10/20"} ug/L`
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
            mode === "patient"
              ? "Pre-menopausal means you are still having periods and have not yet gone through the menopause."
              : "Determines GI investigation pathway: all post-menopausal women → upper and lower GI. Pre-menopausal → targeted GI only if upper GI symptoms or FH colorectal cancer."
          }
        >
          <ChoicePills
            value={state.preMeno}
            onChange={(v) => onChange({ preMeno: v })}
            options={[
              { v: "yes", label: "Yes — pre-menopausal" },
              { v: "no", label: "No — post-menopausal" },
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
              : "Do you have upper digestive symptoms or a family history of bowel cancer?"
          }
          help={
            mode === "patient"
              ? "Upper digestive symptoms include heartburn, indigestion, difficulty swallowing, or persistent nausea. A family history of bowel (colorectal) cancer means a close relative has been diagnosed."
              : "Per NW London guideline: targeted GI investigation indicated in pre-menopausal women with upper GI symptoms OR FH of colorectal cancer."
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

/* ─────────────────────────────────────────────────────────────
   REUSABLE UI COMPONENTS
───────────────────────────────────────────────────────────── */

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
        <p className="text-xs font-medium" style={{ color: "var(--urgent)" }}>
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
          className={`px-5 py-4 rounded-[12px] text-base font-medium ring-1 transition-all text-left ${
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

/* ─────────────────────────────────────────────────────────────
   OUTCOME VIEW
───────────────────────────────────────────────────────────── */

const OUTCOMES = {
  /**
   * OUTCOME A — Routine referral to haematology
   * Triggered: Pre-menopausal female with iron deficiency AND no GI symptoms/FH CRC.
   * These patients have no GI indication so haematology investigates the Fe deficiency.
   */
  A: {
    tone: "amber" as const,
    badge: "ROUTINE REFERRAL — HAEMATOLOGY",
    clinicianHeadline: "Routine referral to haematology indicated",
    patientHeadline: "Your results suggest iron deficiency anaemia",
    patientSummary:
      "Based on the NHS NW London guideline, your GP should consider a routine (non-urgent) referral to a haematology specialist to investigate the cause of your iron deficiency.",
    verbatimTitle: "Routine referral to haematology",
    verbatim: [
      "Persistent unexplained Fe deficiency",
      "Anaemia persisting despite adequate treatment of iron deficiency",
      "Patient intolerant of oral iron / requiring parenteral iron",
    ],
    patientQuestions: [
      "Should I be referred to a blood specialist (haematologist)?",
      "How long has my iron been low and what might be causing it?",
      "Should I be taking iron tablets in the meantime?",
      "When should I have my blood tested again to check if it's improving?",
      "Are there any symptoms I should watch out for?",
    ],
  },

  /**
   * OUTCOME B — Refer to appropriate speciality (gastro, gynae, urology)
   * Triggered: All men / post-menopausal women / pre-menopausal women with GI symptoms or FH CRC.
   * GI investigation needed to find source of iron loss.
   */
  B: {
    tone: "urgent" as const,
    badge: "SPECIALIST REFERRAL INDICATED",
    clinicianHeadline: "Refer to appropriate speciality (gastro, gynae, and urology)",
    patientHeadline: "A specialist referral is recommended",
    patientSummary:
      "Based on the NHS NW London guideline, your results suggest you should be referred to a specialist — such as a gastroenterologist, gynaecologist or urologist — to find out where your iron loss is coming from.",
    verbatimTitle: "Investigation required",
    verbatim: [
      "Upper and lower GI investigation in: all men and post-menopausal women",
      "Targeted GI investigation in pre-menopausal women with upper GI symptoms or FH of colorectal cancer",
      "Refer to appropriate speciality (gastro, gynae, and urology)",
      "Coeliac screen, Urinalysis for occult blood loss",
    ],
    patientQuestions: [
      "Which specialist should I be referred to — gastroenterology, gynaecology or urology?",
      "Do I need a camera test (endoscopy or colonoscopy) to look for a source of bleeding?",
      "Should I be tested for coeliac disease?",
      "Should I have a urine test to check for hidden blood loss?",
      "How urgent is this referral?",
    ],
  },

  /**
   * OUTCOME C — Appropriate investigation in primary care
   * Triggered: Hb above threshold, OR MCV ≥ 83.5, OR ferritin above threshold.
   * Not yet meeting referral criteria — GP to complete background investigations.
   */
  C: {
    tone: "success" as const,
    badge: "PRIMARY CARE INVESTIGATION",
    clinicianHeadline: "Appropriate investigation in primary care",
    patientHeadline: "Further tests in primary care are recommended first",
    patientSummary:
      "Based on the NHS NW London guideline, your results don't currently meet the threshold for a specialist referral. Your GP should carry out some additional background tests first.",
    verbatimTitle: "Appropriate investigation in primary care",
    verbatim: [
      "Careful history focussing on duration, symptoms, bleeding, diet, drug and family history",
      "Blood film and reticulocyte count",
      "Ferritin, B12, folate (formal iron studies may be more useful than ferritin if there is an inflammatory component)",
      "Immunoglobulins, serum protein electrophoresis, serum free light chains",
      "Renal and liver function",
      "ESR and CRP",
      "Autoimmune screen to exclude chronic inflammation",
    ],
    patientQuestions: [
      "Which of these tests do I still need to have done?",
      "Could my diet, medication, or another condition be causing this?",
      "When will you review my results, and what happens next?",
      "At what point would you consider referring me to a specialist?",
      "Should I be taking any supplements in the meantime?",
    ],
  },
} as const;

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
  const config = OUTCOMES[outcome];

  const toneClasses = {
    amber: {
      border: "border-l-[#FFB81C]",
      badge: "bg-amber-50 text-amber-900 ring-amber-200",
      icon: "bg-amber-100 text-amber-700",
    },
    urgent: {
      border: "border-l-[#DA291C]",
      badge: "bg-red-50 text-red-900 ring-red-200",
      icon: "bg-red-100 text-red-700",
    },
    success: {
      border: "border-l-[#00A499]",
      badge: "bg-teal-50 text-teal-900 ring-teal-200",
      icon: "bg-teal-100 text-teal-700",
    },
  }[config.tone];

  const emailBody = `${mode === "patient" ? config.patientHeadline : config.clinicianHeadline}\n\n${config.verbatimTitle}:\n${config.verbatim.map((l) => "• " + l).join("\n")}\n\n— Generated by ResultDoctor\nSource: NW London Outpatient Pathways V1 / 9/7/20`;

  return (
    <div className="w-full max-w-2xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
      {/* Nav */}
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

      {/* Result card */}
      <div
        className={`bg-card rounded-[16px] p-6 sm:p-8 ring-1 ring-border shadow-card border-l-4 ${toneClasses.border}`}
      >
        {/* Badge row */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`size-10 rounded-full flex items-center justify-center shrink-0 ${toneClasses.icon}`}
          >
            {config.tone === "success" ? (
              <svg viewBox="0 0 24 24" fill="none" className="size-5">
                <path d="M9 12.5l2.2 2.2L15.5 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            ) : config.tone === "urgent" ? (
              <svg viewBox="0 0 24 24" fill="none" className="size-5">
                <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="size-5">
                <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ring-1 ${toneClasses.badge}`}>
            {config.badge}
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
          {mode === "patient" ? config.patientHeadline : config.clinicianHeadline}
        </h1>

        {mode === "patient" && (
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            {config.patientSummary}
          </p>
        )}

        {/* Verbatim NHS guideline block */}
        <div className="mt-6 rounded-[12px] bg-background ring-1 ring-border p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
            <span>📋</span>
            <span>NW London ICB Guideline (V1, 9/7/20) — reproduced verbatim</span>
          </div>
          <p className="text-sm font-semibold text-foreground mb-2">
            {config.verbatimTitle}:
          </p>
          <ul className="space-y-2">
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

        {/* Action buttons */}
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
            href={`mailto:?subject=${encodeURIComponent("My ResultDoctor result — Anaemia Pathway")}&body=${encodeURIComponent(emailBody)}`}
            className="px-4 py-2.5 rounded-[12px] text-sm font-semibold bg-card ring-1 ring-border hover:ring-primary/40 transition-all"
          >
            📤 Share with GP
          </a>
        </div>
      </div>

      {/* Patient-mode: What to say to your doctor */}
      {mode === "patient" && (
        <details className="mt-6 group bg-card rounded-[14px] ring-1 ring-border overflow-hidden">
          <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between font-semibold text-sm text-foreground hover:bg-muted/50 transition-colors">
            <span>💬 What should I say to my doctor?</span>
            <span className="text-muted-foreground group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed space-y-2.5 border-t border-border pt-4">
            <p>Suggested questions to ask at your next appointment:</p>
            <ul className="space-y-1.5 list-disc pl-5">
              {config.patientQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        </details>
      )}

      {/* Disclaimer */}
      <p className="mt-8 text-xs text-muted-foreground text-center leading-relaxed border-t border-border pt-6">
        This tool reproduces NHS NW London clinical guidelines verbatim and does not replace
        clinical judgement or a consultation with a qualified healthcare professional.
        <br />
        <span className="text-[10px]">
          Source: NW London Outpatient Pathways · Anaemia Pathway V1 / 9/7/20
        </span>
      </p>
    </div>
  );
}
