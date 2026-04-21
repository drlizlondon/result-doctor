import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";

// ─── GUIDELINE SOURCE ────────────────────────────────────────────────────────
// NWL ICB Haematology Guidelines — NW London Haematology Clinical Reference Group
// Source: https://www.nwlondonicb.nhs.uk/professionals/clinical-topics/haematology
// Version: V1 dated 9/7/20 (Anaemia pathway.pdf — document 1 in library)
const FLOWSHEET_URL = "https://www.nwlondonicb.nhs.uk/download_file/877/577";
const GUIDELINE_PAGE_URL =
  "https://www.nwlondonicb.nhs.uk/professionals/clinical-topics/haematology";

// ─── THRESHOLDS ───────────────────────────────────────────────────────────────
const THRESHOLDS = {
  hb: { male: 130, female: 114 },
  mcv: { low: 83.5, high: 101 },
  ferritin: { male: 20, female: 10 },
};

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Sex = "male" | "female";
type MenopauseStatus = "pre" | "post";

interface FieldState {
  value: string;
  notAvailable: boolean;
}

interface FormState {
  sex: Sex;
  menopause: MenopauseStatus;
  hb: FieldState;
  mcv: FieldState;
  ferritin: FieldState;
  giSymptoms: boolean;
  familyHistoryCRC: boolean;
}

interface SynthesisResult {
  outcome: "A" | "B" | "C" | "insufficient" | null;
  reasoning: string[];
  caveats: string[];
  referralText: string;
  verbatimGuideline: string;
  patientSummary: string;
  patientScript: string;
}

// ─── SYNTHESIS ENGINE ────────────────────────────────────────────────────────
function synthesise(form: FormState): SynthesisResult {
  const { sex, menopause, hb, mcv, ferritin, giSymptoms, familyHistoryCRC } =
    form;

  const hbVal = hb.notAvailable ? null : parseFloat(hb.value);
  const mcvVal = mcv.notAvailable ? null : parseFloat(mcv.value);
  const ferritinVal = ferritin.notAvailable ? null : parseFloat(ferritin.value);

  const hbEntered = hb.notAvailable || (hb.value !== "" && !isNaN(hbVal!));
  const mcvEntered = mcv.notAvailable || (mcv.value !== "" && !isNaN(mcvVal!));
  const ferritinEntered =
    ferritin.notAvailable || (ferritin.value !== "" && !isNaN(ferritinVal!));

  const reasoning: string[] = [];
  const caveats: string[] = [];

  if (!hbEntered && !mcvEntered && !ferritinEntered) {
    return {
      outcome: null,
      reasoning: [],
      caveats: [],
      referralText: "",
      verbatimGuideline: "",
      patientSummary: "",
      patientScript: "",
    };
  }

  const hbThreshold =
    sex === "male" ? THRESHOLDS.hb.male : THRESHOLDS.hb.female;
  const ferritinThreshold =
    sex === "male" ? THRESHOLDS.ferritin.male : THRESHOLDS.ferritin.female;

  // ── Hb interpretation ──
  let anaemia: boolean | null = null;
  if (hb.notAvailable) {
    caveats.push(
      `⚠️ Hb not available — if Hb is below ${hbThreshold} g/L, anaemia would be confirmed. This could change the referral recommendation.`
    );
  } else if (hbVal !== null) {
    anaemia = hbVal < hbThreshold;
    reasoning.push(
      `Hb is ${hbVal} g/L, which is ${anaemia ? "below" : "at or above"} the anaemia threshold of ${hbThreshold} g/L for ${sex === "male" ? "males" : "females"}, ${anaemia ? "confirming anaemia" : "so anaemia is not present by this criterion"}.`
    );
  }

  // ── MCV interpretation ──
  let microcytic: boolean | null = null;
  let macrocytic: boolean | null = null;
  if (mcv.notAvailable) {
    caveats.push(
      `⚠️ MCV not available — MCV is needed to classify anaemia type (microcytic <${THRESHOLDS.mcv.low} fL, normocytic, or macrocytic >${THRESHOLDS.mcv.high} fL). This could affect the investigation pathway.`
    );
  } else if (mcvVal !== null) {
    microcytic = mcvVal < THRESHOLDS.mcv.low;
    macrocytic = mcvVal > THRESHOLDS.mcv.high;
    const mcvLabel = microcytic
      ? "microcytic"
      : macrocytic
        ? "macrocytic"
        : "normocytic";
    reasoning.push(
      `MCV is ${mcvVal} fL (${mcvLabel} — reference range ${THRESHOLDS.mcv.low}–${THRESHOLDS.mcv.high} fL)${microcytic ? ", indicating microcytic anaemia consistent with iron deficiency or thalassaemia trait" : macrocytic ? ", suggesting B12/folate deficiency, alcohol, hypothyroidism, or liver disease" : ", within the normal range"}.`
    );
  }

  // ── Ferritin interpretation ──
  let ironDeficient: boolean | null = null;
  if (ferritin.notAvailable) {
    caveats.push(
      `⚠️ Ferritin not available — ferritin is the primary test for iron deficiency (threshold ${ferritinThreshold} µg/L for ${sex === "male" ? "males" : "females"}). Without this, iron deficiency cannot be confirmed or excluded.`
    );
  } else if (ferritinVal !== null) {
    ironDeficient = ferritinVal < ferritinThreshold;
    reasoning.push(
      `Ferritin is ${ferritinVal} µg/L${ironDeficient ? `, confirming iron deficiency (below the threshold of ${ferritinThreshold} µg/L for ${sex === "male" ? "males" : "females"})` : `, which is within the normal range for ${sex === "male" ? "males" : "females"} (threshold ${ferritinThreshold} µg/L), making primary iron deficiency unlikely`}.`
    );
  }

  // ── Outcome logic ──
  // Outcome C: Hb normal — primary care investigation
  if (anaemia === false) {
    if (ironDeficient === true) {
      reasoning.push(
        "Although Hb is normal, ferritin is low — this represents non-anaemic iron deficiency (NAID), which warrants primary care investigation to identify and treat the underlying cause before anaemia develops."
      );
      return buildResult(
        "C",
        reasoning,
        caveats,
        sex,
        menopause,
        giSymptoms,
        familyHistoryCRC
      );
    }
    reasoning.push(
      "Hb is normal and there is no confirmed iron deficiency. This does not meet criteria for haematology referral. Consider primary care review of symptoms and repeat testing if clinically indicated."
    );
    return buildResult(
      "C",
      reasoning,
      caveats,
      sex,
      menopause,
      giSymptoms,
      familyHistoryCRC
    );
  }

  // Outcome B triggers (regardless of ferritin): male, post-menopausal, or GI symptoms/FH CRC
  const outcomeBSex = sex === "male" || menopause === "post";
  const outcomeBSymptoms = giSymptoms || familyHistoryCRC;

  if (anaemia === true) {
    if (ironDeficient === true || (microcytic === true && ironDeficient === null)) {
      // Iron deficiency anaemia (confirmed or probable)
      const idaConfirmed =
        ironDeficient === true ||
        (microcytic === true && ferritin.notAvailable);

      if (idaConfirmed) {
        if (outcomeBSex) {
          const reason =
            sex === "male"
              ? "All men with iron deficiency anaemia require specialist referral for GI investigation, as colorectal cancer or upper GI pathology must be excluded."
              : "Post-menopausal women with iron deficiency anaemia require specialist referral — unexplained iron deficiency in this group carries the same GI investigation requirement as men.";
          reasoning.push(reason);
          return buildResult(
            "B",
            reasoning,
            caveats,
            sex,
            menopause,
            giSymptoms,
            familyHistoryCRC
          );
        }
        if (outcomeBSymptoms) {
          reasoning.push(
            `Pre-menopausal female, but with ${giSymptoms ? "GI symptoms" : ""}${giSymptoms && familyHistoryCRC ? " and " : ""}${familyHistoryCRC ? "family history of colorectal cancer" : ""} — specialist referral is indicated.`
          );
          return buildResult(
            "B",
            reasoning,
            caveats,
            sex,
            menopause,
            giSymptoms,
            familyHistoryCRC
          );
        }
        // Pre-menopausal female, iron deficiency, no red flags
        reasoning.push(
          "Pre-menopausal female with iron deficiency anaemia and no GI symptoms or family history of CRC — this pattern is most likely due to menstrual blood loss and meets criteria for routine haematology referral."
        );
        return buildResult(
          "A",
          reasoning,
          caveats,
          sex,
          menopause,
          giSymptoms,
          familyHistoryCRC
        );
      }
    }

    // Anaemia present but iron deficiency not confirmed/excluded
    if (ferritin.notAvailable && mcv.notAvailable) {
      reasoning.push(
        "Anaemia is confirmed but neither MCV nor ferritin is available — the type of anaemia and cause cannot be determined. Further blood tests are required before a referral decision can be made."
      );
      return {
        outcome: "insufficient",
        reasoning,
        caveats,
        referralText:
          "Further investigation required: request MCV (from FBC) and serum ferritin before applying referral pathway.",
        verbatimGuideline: VERBATIM_GUIDELINE,
        patientSummary:
          "Your blood count shows anaemia (low haemoglobin), but we need more blood test results — specifically an MCV and ferritin — to work out the cause. Your GP or nurse will arrange these.",
        patientScript:
          "My blood test shows my haemoglobin is low, which means I have anaemia. I need more blood tests (MCV and ferritin) to find out the type and cause before deciding on next steps.",
      };
    }

    // Normocytic/macrocytic anaemia — primary care investigation
    if (macrocytic === true) {
      reasoning.push(
        "Macrocytic anaemia (raised MCV) is present. This is most commonly caused by B12 or folate deficiency, alcohol excess, hypothyroidism, or liver disease — these should be investigated in primary care before referral."
      );
    } else if (microcytic === false && macrocytic === false) {
      reasoning.push(
        "Normocytic anaemia is present without confirmed iron deficiency. Causes include anaemia of chronic disease, renal anaemia, and haemolytic anaemias — initial investigation should take place in primary care."
      );
    }

    if (outcomeBSex || outcomeBSymptoms) {
      return buildResult(
        "B",
        reasoning,
        caveats,
        sex,
        menopause,
        giSymptoms,
        familyHistoryCRC
      );
    }

    return buildResult(
      "C",
      reasoning,
      caveats,
      sex,
      menopause,
      giSymptoms,
      familyHistoryCRC
    );
  }

  // Hb not available — partial result
  if (ironDeficient === true) {
    caveats.push(
      "Iron deficiency is confirmed, but without Hb it is not possible to determine whether anaemia is present. If Hb is below threshold, a referral pathway applies."
    );
  }

  return {
    outcome: null,
    reasoning,
    caveats,
    referralText: "",
    verbatimGuideline: VERBATIM_GUIDELINE,
    patientSummary: "",
    patientScript: "",
  };
}

function buildResult(
  outcome: "A" | "B" | "C",
  reasoning: string[],
  caveats: string[],
  sex: Sex,
  menopause: MenopauseStatus,
  giSymptoms: boolean,
  familyHistoryCRC: boolean
): SynthesisResult {
  const outcomeConfig = {
    A: {
      referralText:
        "Routine referral to haematology. Timeframe: within 6 weeks (non-urgent). Referral for pre-menopausal female with iron deficiency anaemia, no GI symptoms, and no family history of colorectal cancer.",
      patientSummary:
        "Your blood tests show iron deficiency anaemia — your haemoglobin (the protein that carries oxygen) is low, and your iron stores (ferritin) are depleted. The guideline recommends a routine referral to a haematology (blood specialist) clinic, which usually happens within 6 weeks. This is a non-urgent referral.",
      patientScript:
        "My blood tests show I have iron deficiency anaemia — my haemoglobin is low and my iron stores are low. The guideline says I should have a routine referral to haematology. Can you arrange that for me, please?",
    },
    B: {
      referralText: `Specialist referral required — gastroenterology, gynaecology, or urology as appropriate. Reason: ${sex === "male" ? "male patient (all men with iron deficiency anaemia require GI investigation)" : menopause === "post" ? "post-menopausal female (requires same GI workup as men)" : `pre-menopausal female with ${giSymptoms ? "GI symptoms" : ""}${giSymptoms && familyHistoryCRC ? " and " : ""}${familyHistoryCRC ? "family history of CRC" : ""}`}. Timeframe: discuss with secondary care — may require urgent 2-week-wait referral if red flag symptoms present.`,
      patientSummary:
        "Your blood tests show iron deficiency anaemia. Because of your specific circumstances, the guideline says you need a specialist referral — to a gastroenterologist (gut specialist), gynaecologist, or urologist — to investigate the reason why you are losing iron. This is to make sure there is no underlying cause that needs to be treated urgently.",
      patientScript:
        "My blood tests show iron deficiency anaemia. The guideline says I need a specialist referral to investigate the cause — either to gastroenterology, gynaecology, or urology. Can you arrange the appropriate referral for me, please?",
    },
    C: {
      referralText:
        "Primary care investigation. No referral to haematology indicated at this stage. Investigate and manage the underlying cause in primary care. Consider: dietary assessment, medication review, repeat bloods in 4–6 weeks, and treat reversible causes before reassessing.",
      patientSummary:
        "Your blood test results do not meet the criteria for a specialist referral right now. Your GP or nurse will investigate and manage any findings in the community — this might include dietary advice, checking other blood results, or starting iron supplements if appropriate.",
      patientScript:
        "My blood test results have been checked against the guideline and I don't need a specialist referral at the moment. Can you let me know what the next steps are in primary care, please?",
    },
  };

  return {
    outcome,
    reasoning,
    caveats,
    referralText: outcomeConfig[outcome].referralText,
    verbatimGuideline: VERBATIM_GUIDELINE,
    patientSummary: outcomeConfig[outcome].patientSummary,
    patientScript: outcomeConfig[outcome].patientScript,
  };
}

const VERBATIM_GUIDELINE = `NWL ICB Anaemia Pathway (V1, 9 July 2020) — NW London Haematology Clinical Reference Group

Thresholds:
• Anaemia: Hb <130 g/L (male) / <114 g/L (female)
• Microcytic MCV: <83.5 fL
• Iron deficiency ferritin: <20 µg/L (male) / <10 µg/L (female)

Outcome A — Routine referral to haematology:
Pre-menopausal female with iron deficiency anaemia (confirmed low Hb + low ferritin ± low MCV), no GI symptoms, no family history of colorectal cancer.

Outcome B — Specialist referral (gastroenterology/gynaecology/urology):
• All men with iron deficiency anaemia
• Post-menopausal women with iron deficiency anaemia
• Pre-menopausal women with GI symptoms or family history of colorectal cancer
• Note: urgency of referral depends on clinical context — 2WW referral if red flag symptoms

Outcome C — Primary care investigation:
• Normal Hb (anaemia not confirmed)
• Non-anaemic iron deficiency (normal Hb, low ferritin)
• Macrocytic anaemia — investigate B12, folate, TFTs, alcohol, LFTs
• Normocytic anaemia — investigate chronic disease, renal function, haemolysis`;

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export const Route = createFileRoute("/pathway/anaemia")({
  component: AnaemiaPathway,
});

function FieldInput({
  label,
  unit,
  hint,
  field,
  onChange,
}: {
  label: string;
  unit: string;
  hint: string;
  field: FieldState;
  onChange: (f: FieldState) => void;
}) {
  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all ${
        field.notAvailable
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white focus-within:border-blue-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <span className="ml-2 text-xs text-slate-400">{hint}</span>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({ ...field, notAvailable: !field.notAvailable, value: "" })
          }
          className={`text-xs px-2 py-1 rounded-md font-medium transition-colors flex-shrink-0 ${
            field.notAvailable
              ? "bg-amber-200 text-amber-800 hover:bg-amber-300"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          {field.notAvailable ? "✓ Not available" : "Not available →"}
        </button>
      </div>
      {field.notAvailable ? (
        <div className="text-sm text-amber-700 italic py-1">
          Marked as not tested — result will be treated as absent
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            value={field.value}
            onChange={(e) => onChange({ ...field, value: e.target.value })}
            placeholder="Enter value"
            className="flex-1 text-lg font-mono rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <span className="text-sm text-slate-500 font-medium">{unit}</span>
        </div>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: SynthesisResult["outcome"] }) {
  if (!outcome) return null;
  const config = {
    A: {
      label: "Outcome A",
      desc: "Routine haematology referral",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      dot: "bg-blue-500",
    },
    B: {
      label: "Outcome B",
      desc: "Specialist referral — gastro/gynae/urology",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      dot: "bg-orange-500",
    },
    C: {
      label: "Outcome C",
      desc: "Primary care investigation",
      color: "bg-green-100 text-green-800 border-green-200",
      dot: "bg-green-500",
    },
    insufficient: {
      label: "More results needed",
      desc: "Cannot determine pathway",
      color: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
    },
  };
  const c = config[outcome];
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${c.color}`}
    >
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label} — {c.desc}
    </div>
  );
}

function AnaemiaPathway() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    sex: "female",
    menopause: "pre",
    hb: { value: "", notAvailable: false },
    mcv: { value: "", notAvailable: false },
    ferritin: { value: "", notAvailable: false },
    giSymptoms: false,
    familyHistoryCRC: false,
  });

  const result = synthesise(form);

  const handleViewResults = useCallback(() => {
    const params = new URLSearchParams({
      pathway: "anaemia",
      sex: form.sex,
      menopause: form.menopause,
      hbValue: form.hb.value,
      hbNA: form.hb.notAvailable ? "1" : "0",
      mcvValue: form.mcv.value,
      mcvNA: form.mcv.notAvailable ? "1" : "0",
      ferritinValue: form.ferritin.value,
      ferritinNA: form.ferritin.notAvailable ? "1" : "0",
      giSymptoms: form.giSymptoms ? "1" : "0",
      familyHistoryCRC: form.familyHistoryCRC ? "1" : "0",
    });
    navigate({ to: "/results", search: Object.fromEntries(params) });
  }, [form, navigate]);

  const hasAnyInput =
    form.hb.notAvailable ||
    form.hb.value !== "" ||
    form.mcv.notAvailable ||
    form.mcv.value !== "" ||
    form.ferritin.notAvailable ||
    form.ferritin.value !== "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/pathways" })}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ←
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🩸</span>
                <h1 className="text-lg font-bold text-slate-900">
                  Anaemia Pathway
                </h1>
              </div>
              <p className="text-xs text-slate-500">
                NWL ICB · Haematology CRG · V1 9/7/20
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Sex / Menopause */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
            Patient context
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(["male", "female"] as Sex[]).map((s) => (
              <button
                key={s}
                onClick={() => setForm((f) => ({ ...f, sex: s }))}
                className={`py-3 rounded-lg border-2 font-semibold capitalize transition-all ${
                  form.sex === s
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {form.sex === "female" && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Menopausal status</p>
              <div className="grid grid-cols-2 gap-3">
                {(["pre", "post"] as MenopauseStatus[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm((f) => ({ ...f, menopause: m }))}
                    className={`py-2.5 rounded-lg border-2 font-medium text-sm capitalize transition-all ${
                      form.menopause === m
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {m === "pre" ? "Pre-menopausal" : "Post-menopausal"}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Clinical context flags */}
          <div className="space-y-2 pt-1">
            <p className="text-xs text-slate-500">Clinical context</p>
            {[
              {
                key: "giSymptoms" as const,
                label: "GI symptoms present",
                sub: "e.g. rectal bleeding, altered bowel habit, dysphagia",
              },
              {
                key: "familyHistoryCRC" as const,
                label: "Family history of colorectal cancer",
                sub: "First-degree relative",
              },
            ].map(({ key, label, sub }) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  form[key]
                    ? "border-orange-300 bg-orange-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.checked }))
                  }
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {label}
                  </div>
                  <div className="text-xs text-slate-500">{sub}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Blood results */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
              Blood results
            </h2>
            <span className="text-xs text-slate-400">
              Enter what you have — fill any or all fields
            </span>
          </div>
          <FieldInput
            label="Haemoglobin (Hb)"
            unit="g/L"
            hint={`Anaemia: <${form.sex === "male" ? THRESHOLDS.hb.male : THRESHOLDS.hb.female} g/L`}
            field={form.hb}
            onChange={(f) => setForm((s) => ({ ...s, hb: f }))}
          />
          <FieldInput
            label="Mean Cell Volume (MCV)"
            unit="fL"
            hint={`Microcytic: <${THRESHOLDS.mcv.low} fL`}
            field={form.mcv}
            onChange={(f) => setForm((s) => ({ ...s, mcv: f }))}
          />
          <FieldInput
            label="Ferritin"
            unit="µg/L"
            hint={`Iron def: <${form.sex === "male" ? THRESHOLDS.ferritin.male : THRESHOLDS.ferritin.female} µg/L`}
            field={form.ferritin}
            onChange={(f) => setForm((s) => ({ ...s, ferritin: f }))}
          />
        </div>

        {/* Live synthesis panel */}
        {hasAnyInput && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
                Live interpretation
              </h2>
              {result.outcome && <OutcomeBadge outcome={result.outcome} />}
            </div>

            {result.reasoning.length > 0 && (
              <div className="text-sm text-slate-700 leading-relaxed space-y-1">
                {result.reasoning.map((r, i) => (
                  <p key={i}>{r}</p>
                ))}
              </div>
            )}

            {result.caveats.length > 0 && (
              <div className="space-y-1.5">
                {result.caveats.map((c, i) => (
                  <div
                    key={i}
                    className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2"
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}

            {result.referralText && (
              <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700 border border-slate-200">
                <span className="font-semibold">Recommended action: </span>
                {result.referralText}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {result.outcome && result.outcome !== "insufficient" && (
          <button
            onClick={handleViewResults}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            View full results page →
          </button>
        )}

        {/* Guideline footer */}
        <div className="text-center space-y-1 pb-4">
          <p className="text-xs text-slate-400">
            Source: NWL ICB Haematology CRG, V1 9/7/20
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href={FLOWSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Download anaemia flowsheet PDF ↗
            </a>
            <span className="text-slate-300">·</span>
            <a
              href={GUIDELINE_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              NWL haematology guidelines ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
