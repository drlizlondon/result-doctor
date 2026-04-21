import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMode } from "@/lib/mode";
import type { MvpResult, UrgencyLevel, SynthesisFlag } from "@/routes/results";

export const Route = createFileRoute("/pathway/anaemia")({
  head: () => ({
    meta: [
      { title: "Anaemia Pathway — NW London ICB | ResultDoctor" },
      {
        name: "description",
        content:
          "Enter any combination of Hb, MCV and ferritin results to get the exact NHS NW London anaemia pathway recommendation.",
      },
      { property: "og:title", content: "Anaemia Pathway · ResultDoctor" },
    ],
  }),
  component: AnaemiaCalculator,
});

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

type Sex = "male" | "female";
type YN = "yes" | "no";
type Outcome = "A" | "B" | "C" | "INCOMPLETE";

interface EnteredValues {
  sex?: Sex;
  hb?: number;
  mcv?: number;
  ferritin?: number;
  preMeno?: YN;
  giSymptoms?: YN;
}

interface SynthesisResult {
  outcome: Outcome;
  flags: SynthesisFlag[];
  missingForDefinitive: string[];
  reasoning: string;
}

/* ─────────────────────────────────────────────────────────────
   THRESHOLDS (NWL guideline V1 9/7/20)
───────────────────────────────────────────────────────────── */

const HB_THRESHOLD: Record<Sex, number> = { male: 130, female: 114 };
const FERRITIN_THRESHOLD: Record<Sex, number> = { male: 20, female: 10 };
const MCV_THRESHOLD = 83.5;

const FLOWSHEET_URL =
  "https://www.nwlondonicb.nhs.uk/application/files/7316/5832/2895/Outpatient_Pathways_NWL_Anaemia_v1_9_7_20.pdf";

/* ─────────────────────────────────────────────────────────────
   SYNTHESIS ENGINE
   Accepts any subset of values, returns a partial or definitive result.
───────────────────────────────────────────────────────────── */

function synthesise(v: EnteredValues): SynthesisResult {
  const flags: SynthesisFlag[] = [];
  const missing: string[] = [];
  const sex = v.sex;

  // Build interpretation flags for every value entered
  if (v.hb !== undefined) {
    if (sex) {
      const thresh = HB_THRESHOLD[sex];
      const low = v.hb < thresh;
      flags.push({
        label: "Hb", value: v.hb, unit: "g/L", isAbnormal: low,
        interpretation: low
          ? `Low — below anaemia threshold of ${thresh} g/L for ${sex}s`
          : `Normal — above anaemia threshold of ${thresh} g/L for ${sex}s`,
      });
    } else {
      flags.push({
        label: "Hb", value: v.hb, unit: "g/L", isAbnormal: v.hb < 114,
        interpretation: "Sex required to apply correct threshold",
      });
    }
  }

  if (v.mcv !== undefined) {
    const low = v.mcv < MCV_THRESHOLD;
    const high = v.mcv > 100;
    flags.push({
      label: "MCV", value: v.mcv, unit: "fL", isAbnormal: low || high,
      interpretation: low
        ? "Low (microcytic) — consistent with iron deficiency"
        : high
        ? "High (macrocytic) — macrocytosis pathway applies"
        : "Normal range",
    });
  }

  if (v.ferritin !== undefined) {
    if (sex) {
      const thresh = FERRITIN_THRESHOLD[sex];
      const low = v.ferritin < thresh;
      flags.push({
        label: "Ferritin", value: v.ferritin, unit: "µg/L", isAbnormal: low,
        interpretation: low
          ? `Low — below iron deficiency threshold of ${thresh} µg/L for ${sex}s`
          : `Normal — above threshold of ${thresh} µg/L for ${sex}s`,
      });
    } else {
      flags.push({
        label: "Ferritin", value: v.ferritin, unit: "µg/L", isAbnormal: v.ferritin < 10,
        interpretation: "Sex required to apply correct threshold",
      });
    }
  }

  // Need sex before anything else
  if (!sex) {
    missing.push("Sex assigned at birth (to apply correct Hb and ferritin thresholds)");
    return { outcome: "INCOMPLETE", flags, missingForDefinitive: missing, reasoning: "Sex is required to apply the correct thresholds from the NWL guideline." };
  }

  // No values at all
  if (v.hb === undefined && v.mcv === undefined && v.ferritin === undefined) {
    return { outcome: "INCOMPLETE", flags, missingForDefinitive: ["At least one test result (Hb, MCV, or ferritin)"], reasoning: "Enter one or more values above." };
  }

  // ── Ferritin only ─────────────────────────────────────────
  if (v.hb === undefined && v.mcv === undefined && v.ferritin !== undefined) {
    const thresh = FERRITIN_THRESHOLD[sex];
    if (v.ferritin >= thresh) {
      return { outcome: "C", flags, missingForDefinitive: [], reasoning: `Ferritin ${v.ferritin} µg/L is above the iron deficiency threshold of ${thresh} µg/L. Iron deficiency not confirmed — primary care investigation is appropriate. Adding Hb and MCV would allow a fuller assessment.` };
    }
    missing.push("Hb — to confirm whether anaemia is present alongside iron deficiency");
    return { outcome: "INCOMPLETE", flags, missingForDefinitive: missing, reasoning: `Ferritin ${v.ferritin} µg/L is below the iron deficiency threshold of ${thresh} µg/L. Iron deficiency is possible, but Hb is needed to confirm anaemia and determine whether referral is indicated.` };
  }

  // ── Hb present ────────────────────────────────────────────
  if (v.hb !== undefined) {
    const hbThresh = HB_THRESHOLD[sex];

    // Hb normal — no anaemia, primary care
    if (v.hb >= hbThresh) {
      return { outcome: "C", flags, missingForDefinitive: [], reasoning: `Hb ${v.hb} g/L is above the anaemia threshold of ${hbThresh} g/L. No anaemia confirmed. Primary care investigation is appropriate.` };
    }

    // Hb low — anaemia confirmed. Need MCV.
    if (v.mcv === undefined) {
      missing.push("MCV — to determine whether anaemia is microcytic (iron deficiency branch)");
      return { outcome: "INCOMPLETE", flags, missingForDefinitive: missing, reasoning: `Hb ${v.hb} g/L confirms anaemia. MCV is needed to determine the type before a pathway decision can be made.` };
    }

    // MCV normal/high — not iron deficiency microcytic anaemia
    if (v.mcv >= MCV_THRESHOLD) {
      return { outcome: "C", flags, missingForDefinitive: [], reasoning: `Hb ${v.hb} g/L is low but MCV ${v.mcv} fL is ≥83.5 fL — this is not a microcytic anaemia. The iron deficiency branch does not apply. Primary care investigation (B12, folate, film) is appropriate. Consider macrocytosis pathway if MCV is elevated.` };
    }

    // Low Hb + microcytic MCV — need ferritin to confirm iron deficiency
    if (v.ferritin === undefined) {
      missing.push("Ferritin — to confirm iron deficiency");
      return { outcome: "INCOMPLETE", flags, missingForDefinitive: missing, reasoning: `Hb ${v.hb} g/L is low and MCV ${v.mcv} fL is microcytic — consistent with iron deficiency anaemia. Ferritin is needed to confirm iron deficiency before a referral decision can be made.` };
    }

    const ferThresh = FERRITIN_THRESHOLD[sex];

    // Ferritin normal despite low Hb + low MCV — primary care
    if (v.ferritin >= ferThresh) {
      return { outcome: "C", flags, missingForDefinitive: [], reasoning: `Hb ${v.hb} g/L low and MCV ${v.mcv} fL microcytic, but ferritin ${v.ferritin} µg/L is above the iron deficiency threshold of ${ferThresh} µg/L. Iron deficiency not confirmed. Primary care investigation is appropriate.` };
    }

    // ── IRON DEFICIENCY ANAEMIA CONFIRMED (low Hb + low MCV + low ferritin) ──

    if (sex === "male") {
      return { outcome: "B", flags, missingForDefinitive: [], reasoning: `Iron deficiency anaemia confirmed: Hb ${v.hb} g/L, MCV ${v.mcv} fL, ferritin ${v.ferritin} µg/L. Per NWL guideline: all men with iron deficiency anaemia require upper and lower GI investigation and referral to appropriate speciality.` };
    }

    // Female — need menopausal status
    if (v.preMeno === undefined) {
      missing.push("Menopausal status — pre- vs post-menopausal determines the referral pathway");
      return { outcome: "INCOMPLETE", flags, missingForDefinitive: missing, reasoning: `Iron deficiency anaemia confirmed. Menopausal status is required by the NWL guideline to determine the correct referral pathway.` };
    }

    if (v.preMeno === "no") {
      return { outcome: "B", flags, missingForDefinitive: [], reasoning: `Iron deficiency anaemia confirmed in a post-menopausal woman. Per NWL guideline: upper and lower GI investigation and referral to appropriate speciality (gastro, gynae, urology).` };
    }

    // Pre-menopausal — need GI symptoms
    if (v.giSymptoms === undefined) {
      missing.push("Upper GI symptoms or family history of colorectal cancer");
      return { outcome: "INCOMPLETE", flags, missingForDefinitive: missing, reasoning: `Iron deficiency anaemia confirmed in a pre-menopausal woman. GI symptoms / family history of colorectal cancer must be established to determine whether targeted GI investigation is needed.` };
    }

    if (v.giSymptoms === "yes") {
      return { outcome: "B", flags, missingForDefinitive: [], reasoning: `Iron deficiency anaemia in a pre-menopausal woman with upper GI symptoms or family history of colorectal cancer. Per NWL guideline: targeted GI investigation and referral to appropriate speciality.` };
    }

    // Pre-menopausal, no GI symptoms — routine haematology
    return { outcome: "A", flags, missingForDefinitive: [], reasoning: `Iron deficiency anaemia in a pre-menopausal woman without GI symptoms or family history of colorectal cancer. Per NWL guideline: routine referral to haematology.` };
  }

  return { outcome: "INCOMPLETE", flags, missingForDefinitive: ["Hb (required to start the pathway)"], reasoning: "Hb is the primary entry point. Enter Hb to begin." };
}

/* ─────────────────────────────────────────────────────────────
   OUTCOME CONFIG
───────────────────────────────────────────────────────────── */

const OUTCOME_CONFIG = {
  A: {
    urgency: "routine_referral" as UrgencyLevel,
    clinicianHeadline: "Routine referral to haematology indicated",
    patientHeadline: "Your results suggest iron deficiency anaemia",
    patientSummary: "Your blood results show a pattern consistent with iron deficiency anaemia. Based on the NHS NW London guideline, your doctor should consider referring you to a blood specialist (haematologist) for further investigation. This would be a routine, non-urgent referral.",
    patientAsk: "Based on my results and the NW London ICB Anaemia Pathway guideline, please could you consider a routine referral to haematology?",
    verbatimTitle: "Routine referral to haematology (NWL guideline, V1 9/7/20)",
    verbatim: [
      "Persistent unexplained Fe deficiency",
      "Anaemia persisting despite adequate treatment of iron deficiency",
      "Patient intolerant of oral iron / requiring parenteral iron",
    ],
    referrals: [{ specialty: "Haematology", timeframe: "Routine", note: "Unexplained iron deficiency" }],
  },
  B: {
    urgency: "urgent_referral" as UrgencyLevel,
    clinicianHeadline: "Refer to appropriate speciality (gastro, gynae, and urology)",
    patientHeadline: "A specialist referral is recommended",
    patientSummary: "Your blood results show iron deficiency anaemia. The NHS NW London guideline recommends finding the source of the iron loss — this usually means being referred to a gut specialist (gastroenterologist) and possibly a urologist or gynaecologist for further tests.",
    patientAsk: "Based on my results and the NW London ICB Anaemia Pathway guideline, would you be able to refer me for GI investigation and to the appropriate specialist?",
    verbatimTitle: "Investigation required (NWL guideline, V1 9/7/20)",
    verbatim: [
      "Upper and lower GI investigation in: all men and post-menopausal women",
      "Targeted GI investigation in pre-menopausal women with upper GI symptoms or FH of colorectal cancer",
      "Refer to appropriate speciality (gastro, gynae, and urology)",
      "Coeliac screen, Urinalysis for occult blood loss",
    ],
    referrals: [
      { specialty: "Gastroenterology", timeframe: "Soon", note: "Upper and lower GI investigation" },
      { specialty: "Urology", timeframe: "Soon", note: "Occult urinary blood loss" },
    ],
  },
  C: {
    urgency: "primary_care" as UrgencyLevel,
    clinicianHeadline: "Appropriate investigation in primary care",
    patientHeadline: "Your GP should run some further tests first",
    patientSummary: "Based on the NHS NW London guideline, your results don't currently meet the threshold for a specialist referral. Your GP should carry out some further background blood tests to get a clearer picture before deciding on next steps.",
    patientAsk: "Based on my results and the NW London ICB Anaemia Pathway guideline, could we discuss which of the background investigations I still need?",
    verbatimTitle: "Appropriate investigation in primary care (NWL guideline, V1 9/7/20)",
    verbatim: [
      "Careful history focussing on duration, symptoms, bleeding, diet, drug and family history",
      "Blood film and reticulocyte count",
      "Ferritin, B12, folate (formal iron studies may be more useful than ferritin if there is an inflammatory component)",
      "Immunoglobulins, serum protein electrophoresis, serum free light chains",
      "Renal and liver function",
      "ESR and CRP",
      "Autoimmune screen to exclude chronic inflammation",
    ],
    referrals: [],
  },
};

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

function needsPreMeno(v: EnteredValues): boolean {
  if (v.sex !== "female") return false;
  if (v.hb === undefined || v.mcv === undefined || v.ferritin === undefined) return false;
  return v.hb < HB_THRESHOLD["female"] && v.mcv < MCV_THRESHOLD && v.ferritin < FERRITIN_THRESHOLD["female"];
}

function needsGiSymptoms(v: EnteredValues): boolean {
  return needsPreMeno(v) && v.preMeno === "yes";
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

function AnaemiaCalculator() {
  const { mode } = useMode();
  const navigate = useNavigate();
  const [values, setValues] = useState<EnteredValues>({});

  const synthesis = useMemo(() => synthesise(values), [values]);
  const isComplete = synthesis.outcome !== "INCOMPLETE";

  function patch(update: Partial<EnteredValues>) {
    setValues((prev) => {
      if ("sex" in update) {
        // Sex change — keep numeric values, clear contextual answers
        return { sex: update.sex, hb: prev.hb, mcv: prev.mcv, ferritin: prev.ferritin };
      }
      if ("preMeno" in update) {
        return { ...prev, preMeno: update.preMeno, giSymptoms: undefined };
      }
      return { ...prev, ...update };
    });
  }

  function handleSubmit() {
    if (!isComplete) return;
    const cfg = OUTCOME_CONFIG[synthesis.outcome as "A" | "B" | "C"];

    const result: MvpResult = {
      urgency: cfg.urgency,
      clinicianHeadline: cfg.clinicianHeadline,
      patientHeadline: cfg.patientHeadline,
      patientSummary: cfg.patientSummary,
      patientAsk: cfg.patientAsk,
      verbatim: [...cfg.verbatim],
      verbatimTitle: cfg.verbatimTitle,
      referrals: [...cfg.referrals],
      reasoning: synthesis.reasoning,
      source: {
        organisation: "NW London ICB",
        document: "Anaemia Pathway",
        version: "V1 9/7/20",
        flowsheetUrl: FLOWSHEET_URL,
      },
      pathwayId: "nwl-anaemia-v1",
      pathwayTitle: "NWL Anaemia Pathway",
      resultsEntered: synthesis.flags,
    };

    sessionStorage.setItem("rd_result", JSON.stringify(result));
    navigate({ to: "/results" });
  }

  const hasAnyValue = values.hb !== undefined || values.mcv !== undefined || values.ferritin !== undefined;

  return (
    <div className="w-full max-w-2xl mx-auto px-5 sm:px-8 py-8 sm:py-12">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link to="/pathways" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          ← All pathways
        </Link>
        <div className="flex items-center gap-3">
          <a href={FLOWSHEET_URL} target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-semibold text-primary underline underline-offset-2 hover:opacity-70 transition-opacity">
            View flowsheet ↗
          </a>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
            NW London ICB
          </span>
        </div>
      </div>

      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">
        Anaemia Pathway
      </h1>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-lg">
        Enter whichever results you have — just ferritin, just Hb, or all three. The engine will interpret what it can and tell you exactly what else is needed.
      </p>

      {/* SEX */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Sex assigned at birth <span className="text-primary">*</span>
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          {(["male", "female"] as Sex[]).map((s) => (
            <button key={s} onClick={() => patch({ sex: s })}
              className={`px-5 py-3 rounded-[12px] text-sm font-medium capitalize ring-1 transition-all ${
                values.sex === s
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card ring-border hover:ring-primary/40"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* TEST VALUES — all optional */}
      <div className="bg-card rounded-[16px] ring-1 ring-border p-6 sm:p-7 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Test results
        </p>
        <p className="text-xs text-muted-foreground mb-5">
          Enter whichever you have — leave others blank
        </p>
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <InlineInput label="Hb" unit="g/L" min={40} max={220} placeholder="e.g. 95"
            hint={mode === "patient" ? "Haemoglobin" : `Anaemia <${values.sex ? HB_THRESHOLD[values.sex] : "130/114"} g/L`}
            value={values.hb} onChange={(v) => patch({ hb: v })} />
          <InlineInput label="MCV" unit="fL" min={40} max={150} placeholder="e.g. 72"
            hint={mode === "patient" ? "Red cell size" : "Microcytic <83.5 fL"}
            value={values.mcv} onChange={(v) => patch({ mcv: v })} />
          <InlineInput label="Ferritin" unit="µg/L" min={1} max={2000} placeholder="e.g. 8"
            hint={mode === "patient" ? "Iron stores" : `Iron def <${values.sex ? FERRITIN_THRESHOLD[values.sex] : "10/20"} µg/L`}
            value={values.ferritin} onChange={(v) => patch({ ferritin: v })} />
        </div>
      </div>

      {/* CONDITIONAL: Menopausal status */}
      {needsPreMeno(values) && (
        <div className="bg-card rounded-[16px] ring-1 ring-border p-6 mb-4">
          <p className="text-sm font-semibold mb-1">
            {mode === "patient" ? "Are you still having periods (pre-menopausal)?" : "Is the patient pre-menopausal?"}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {mode === "patient"
              ? "Pre-menopausal means you are still having regular periods."
              : "Determines GI investigation pathway per NWL guideline."}
          </p>
          <ChoicePills value={values.preMeno}
            onChange={(v) => patch({ preMeno: v as YN })}
            options={[{ v: "yes", label: "Yes — pre-menopausal" }, { v: "no", label: "No — post-menopausal" }]} />
        </div>
      )}

      {/* CONDITIONAL: GI symptoms */}
      {needsGiSymptoms(values) && (
        <div className="bg-card rounded-[16px] ring-1 ring-border p-6 mb-4">
          <p className="text-sm font-semibold mb-1">
            {mode === "patient"
              ? "Do you have upper digestive symptoms or a family history of bowel cancer?"
              : "Upper GI symptoms or family history of colorectal cancer?"}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {mode === "patient"
              ? "Upper digestive symptoms include heartburn, indigestion, difficulty swallowing, or persistent nausea."
              : "Per NWL guideline: targeted GI investigation indicated in pre-menopausal women with upper GI symptoms OR FH of colorectal cancer."}
          </p>
          <ChoicePills value={values.giSymptoms}
            onChange={(v) => patch({ giSymptoms: v as YN })}
            options={[{ v: "yes", label: "Yes" }, { v: "no", label: "No" }]} />
        </div>
      )}

      {/* LIVE SYNTHESIS PREVIEW */}
      {(hasAnyValue || values.sex) && (
        <div className={`rounded-[14px] p-5 ring-1 mb-6 transition-all ${
          isComplete ? "bg-primary/5 ring-primary/30" : "bg-muted/30 ring-border"
        }`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {isComplete ? "✓ Result ready" : "Partial interpretation"}
          </p>
          <p className="text-sm leading-relaxed text-foreground">{synthesis.reasoning}</p>
          {synthesis.missingForDefinitive.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Still needed for a complete result:
              </p>
              <ul className="space-y-1.5">
                {synthesis.missingForDefinitive.map((m) => (
                  <li key={m} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5 shrink-0">→</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setValues({})}
          className="px-5 py-2.5 rounded-[12px] text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Clear all
        </button>
        <button onClick={handleSubmit} disabled={!isComplete}
          className="px-8 py-3 rounded-[12px] text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all shadow-sm">
          {isComplete ? "See full result →" : "Enter values to continue"}
        </button>
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center leading-relaxed border-t border-border pt-6">
        Anaemia defined as Hb &lt;130 g/L (male) or &lt;114 g/L (female).{" "}
        <a href={FLOWSHEET_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          NW London Outpatient Pathways · V1 / 9/7/20
        </a>
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   UI COMPONENTS
───────────────────────────────────────────────────────────── */

function InlineInput({
  label, unit, min, max, placeholder, hint, value, onChange,
}: {
  label: string; unit: string; min: number; max: number;
  placeholder: string; hint: string;
  value: number | undefined; onChange: (v: number | undefined) => void;
}) {
  const invalid = value !== undefined && (Number.isNaN(value) || value < min || value > max);
  const hasValue = value !== undefined && !invalid;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-foreground">{label}</span>
      <span className="text-[11px] text-muted-foreground leading-tight">{hint}</span>
      <div className={`flex items-center rounded-[10px] ring-1 px-2.5 py-1 mt-1 transition-all ${
        invalid ? "ring-red-400 bg-red-50/30" : hasValue ? "ring-primary bg-primary/5" : "ring-border focus-within:ring-primary"
      }`}>
        <input type="number" inputMode="decimal" min={min} max={max} step="0.1"
          value={value ?? ""} placeholder={placeholder}
          onChange={(e) => { const r = e.target.value; r === "" ? onChange(undefined) : onChange(Number(r)); }}
          className="w-0 flex-1 bg-transparent py-2 text-lg font-bold tabular-nums tracking-tight outline-none placeholder:text-muted-foreground/25 min-w-0" />
        <span className="text-[10px] font-medium text-muted-foreground shrink-0 ml-1">{unit}</span>
      </div>
      {invalid && <span className="text-[10px] text-red-500">{min}–{max}</span>}
    </div>
  );
}

function ChoicePills<T extends string>({
  value, onChange, options,
}: {
  value: T | undefined;
  onChange: (v: T) => void;
  options: Array<{ v: T; label: string }>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`px-5 py-3 rounded-[12px] text-sm font-medium ring-1 transition-all text-left ${
            value === o.v ? "bg-primary text-primary-foreground ring-primary" : "bg-background ring-border hover:ring-primary/40"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
