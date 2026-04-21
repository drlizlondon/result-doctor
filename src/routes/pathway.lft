import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";

// ─── GUIDELINE SOURCE ────────────────────────────────────────────────────────
// NCL ICB Abnormal LFT Pathway
// Source: https://gps.northcentrallondon.icb.nhs.uk/topics/hepatology
// Underpinned by: BSG Guidelines on the Management of Abnormal Liver Blood Tests
// (Newsome et al., Gut 2018; 67:2089–2100)
const FLOWSHEET_URL =
  "https://gps.northcentrallondon.icb.nhs.uk/cdn/serve/pathway-downloads/1459255901-0ea32ea4dac64bd6da48e592ddddc42f.pdf";
const GUIDELINE_PAGE_URL =
  "https://gps.northcentrallondon.icb.nhs.uk/topics/hepatology";

// ─── THRESHOLDS ───────────────────────────────────────────────────────────────
const THRESHOLDS = {
  alt: 40,       // U/L — lab-standard upper limit of normal
  ast: 40,       // U/L
  alp: 130,      // U/L
  ggt: 55,       // U/L (male); 35 female — simplified to 55 for initial screen
  bilirubin: 21, // µmol/L
  albumin_low: 35, // g/L
  fib4: { low: 1.3, high: 2.67 },
};

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Sex = "male" | "female";

interface FieldState {
  value: string;
  notAvailable: boolean;
}

interface FormState {
  sex: Sex;
  age: string;
  platelets: string; // for FIB-4
  alt: FieldState;
  ast: FieldState;
  alp: FieldState;
  ggt: FieldState;
  bilirubin: FieldState;
  albumin: FieldState;
  // Context
  highRiskAlcohol: boolean;   // AUDIT ≥15
  masldRisk: boolean;          // obesity / T2DM
  jaundice: boolean;
  encephalopathy: boolean;
  symptoms: boolean;           // RUQ pain, pruritis, significant fatigue
  medications: boolean;        // hepatotoxic drugs
  bloodTransfusionPre1996: boolean;
}

type Pattern = "hepatitic" | "cholestatic" | "mixed" | "isolated_bilirubin" | "isolated_ggt" | "normal" | "synthetic_failure";
type Urgency = "emergency" | "urgent_2ww" | "routine_referral" | "primary_care" | "monitor" | "reassure";

interface SynthesisResult {
  pattern: Pattern | null;
  fib4: number | null;
  fib4Risk: "low" | "indeterminate" | "high" | null;
  urgency: Urgency | null;
  reasoning: string[];
  caveats: string[];
  redFlags: string[];
  referralText: string;
  verbatimGuideline: string;
  patientSummary: string;
  patientScript: string;
}

// ─── FIB-4 ───────────────────────────────────────────────────────────────────
function calcFib4(
  age: number,
  ast: number,
  platelets: number,
  alt: number
): number | null {
  if (!age || !ast || !platelets || !alt || alt <= 0) return null;
  return (age * ast) / (platelets * Math.sqrt(alt));
}

function fib4Risk(score: number): "low" | "indeterminate" | "high" {
  if (score < THRESHOLDS.fib4.low) return "low";
  if (score <= THRESHOLDS.fib4.high) return "indeterminate";
  return "high";
}

// ─── SYNTHESIS ENGINE ────────────────────────────────────────────────────────
function synthesise(form: FormState): SynthesisResult {
  const reasoning: string[] = [];
  const caveats: string[] = [];
  const redFlags: string[] = [];

  const get = (f: FieldState) =>
    f.notAvailable ? null : f.value === "" ? undefined : parseFloat(f.value);

  const altVal = get(form.alt);
  const astVal = get(form.ast);
  const alpVal = get(form.alp);
  const ggtVal = get(form.ggt);
  const bilirubinVal = get(form.bilirubin);
  const albuminVal = get(form.albumin);
  const ageNum = parseFloat(form.age);
  const plateletsNum = parseFloat(form.platelets);

  const hasAny = [altVal, astVal, alpVal, ggtVal, bilirubinVal, albuminVal].some(
    (v) => v !== undefined && v !== null
  );

  if (!hasAny) {
    return {
      pattern: null, fib4: null, fib4Risk: null, urgency: null,
      reasoning: [], caveats: [], redFlags: [],
      referralText: "", verbatimGuideline: VERBATIM_GUIDELINE,
      patientSummary: "", patientScript: "",
    };
  }

  // ── Red flags ──
  if (form.jaundice) {
    redFlags.push("⚠️ JAUNDICE — urgent assessment required. If USS shows dilated biliary tree, this is a surgical emergency (obstructive jaundice).");
  }
  if (form.encephalopathy) {
    redFlags.push("⚠️ ENCEPHALOPATHY — features of hepatic encephalopathy indicate acute/acute-on-chronic liver failure. Same-day hospital assessment.");
  }
  if (albuminVal !== undefined && albuminVal !== null && albuminVal < THRESHOLDS.albumin_low) {
    redFlags.push(`⚠️ LOW ALBUMIN (${albuminVal} g/L) — marker of impaired hepatic synthetic function. Suggests significant liver disease.`);
  }
  if (altVal !== undefined && altVal !== null && altVal > THRESHOLDS.alt * 10) {
    redFlags.push(`⚠️ MARKEDLY RAISED ALT (${altVal} U/L — >10× ULN) — without a clear cause this requires urgent investigation. Consider acute viral hepatitis, ischaemic hepatitis, or drug-induced liver injury.`);
  }
  if (form.bloodTransfusionPre1996) {
    redFlags.push("⚠️ Blood transfusion before 1996 — offer hepatitis C testing per NHSE guidance (Infected Blood Inquiry, May 2024).");
  }

  // ── FIB-4 calculation ──
  let fib4Score: number | null = null;
  let fib4RiskLevel: "low" | "indeterminate" | "high" | null = null;

  if (
    !isNaN(ageNum) && ageNum > 0 &&
    astVal !== undefined && astVal !== null &&
    !isNaN(plateletsNum) && plateletsNum > 0 &&
    altVal !== undefined && altVal !== null && altVal > 0
  ) {
    fib4Score = calcFib4(ageNum, astVal, plateletsNum, altVal);
    if (fib4Score !== null) {
      fib4RiskLevel = fib4Risk(fib4Score);
      reasoning.push(
        `FIB-4 score: ${fib4Score.toFixed(2)} — ${
          fib4RiskLevel === "low"
            ? "low risk of significant fibrosis (<1.30)"
            : fib4RiskLevel === "indeterminate"
              ? "indeterminate fibrosis risk (1.30–2.67) — consider ELF test or fibroscan"
              : "high risk of significant fibrosis (>2.67) — referral to hepatology recommended"
        }.`
      );
    }
  } else if (
    (altVal !== undefined && altVal !== null) ||
    (astVal !== undefined && astVal !== null)
  ) {
    if (!form.age || isNaN(ageNum)) {
      caveats.push("⚠️ Age not entered — FIB-4 score cannot be calculated (requires age, AST, platelets, and ALT).");
    } else if (!form.platelets || isNaN(plateletsNum)) {
      caveats.push("⚠️ Platelet count not entered — FIB-4 score cannot be calculated. Platelets are part of the FBC and needed for fibrosis risk stratification in MASLD/ARLD.");
    }
  }

  // ── Pattern recognition ──
  const altRaised = altVal !== undefined && altVal !== null && altVal > THRESHOLDS.alt;
  const astRaised = astVal !== undefined && astVal !== null && astVal > THRESHOLDS.ast;
  const alpRaised = alpVal !== undefined && alpVal !== null && alpVal > THRESHOLDS.alp;
  const ggtRaised = ggtVal !== undefined && ggtVal !== null && ggtVal > THRESHOLDS.ggt;
  const bilirubinRaised = bilirubinVal !== undefined && bilirubinVal !== null && bilirubinVal > THRESHOLDS.bilirubin;

  let pattern: Pattern | null = null;
  const syntheticFailure = albuminVal !== undefined && albuminVal !== null && albuminVal < THRESHOLDS.albumin_low;

  if (syntheticFailure) {
    pattern = "synthetic_failure";
    reasoning.push(
      `Low albumin (${albuminVal} g/L, below ${THRESHOLDS.albumin_low} g/L) indicates impaired hepatic synthetic function. This is a marker of significant underlying liver disease — acute or chronic.`
    );
  } else if (
    (altRaised || astRaised) &&
    !alpRaised &&
    !bilirubinRaised
  ) {
    pattern = "hepatitic";
    const altX = altVal ? (altVal / THRESHOLDS.alt).toFixed(1) : null;
    const astX = astVal ? (astVal / THRESHOLDS.ast).toFixed(1) : null;
    reasoning.push(
      `Hepatitic pattern: ${altRaised ? `ALT ${altVal} U/L (${altX}× ULN)` : ""}${altRaised && astRaised ? " and " : ""}${astRaised ? `AST ${astVal} U/L (${astX}× ULN)` : ""} raised${!alpRaised ? ", with ALP within normal limits" : ""}. Dominant hepatitic pattern suggests hepatocellular injury.`
    );
    reasoning.push(
      `Common causes: ${form.masldRisk ? "MASLD (given metabolic risk factors), " : ""}${form.highRiskAlcohol ? "alcohol-related liver disease (ARLD, given high-risk alcohol use), " : ""}viral hepatitis (B and C), drug-induced liver injury, autoimmune hepatitis. ${!form.masldRisk && !form.highRiskAlcohol ? "Consider MASLD, ARLD, viral hepatitis screen (HBsAg, HCV Ab), and medication review." : ""}`
    );
  } else if (alpRaised && !altRaised && !astRaised) {
    pattern = "cholestatic";
    reasoning.push(
      `Cholestatic pattern: ALP ${alpVal} U/L (above ${THRESHOLDS.alp} U/L)${ggtRaised ? `, GGT ${ggtVal} U/L (also raised — confirms hepatic origin of ALP elevation)` : ", without raised GGT (consider bone origin if GGT normal)"}. Isolated raised ALP with normal transaminases suggests biliary or bone pathology.`
    );
    if (ggtRaised) {
      reasoning.push("Raised GGT alongside ALP confirms biliary/hepatic origin. Consider: primary biliary cholangitis (check AMA), primary sclerosing cholangitis (USS biliary tree), drug causes, and infiltrative disease.");
    } else {
      caveats.push("⚠️ GGT not available — if GGT is also raised it would confirm hepatic origin of ALP. If GGT is normal, consider bone disease (check bone profile, PTH).");
    }
  } else if ((altRaised || astRaised) && alpRaised) {
    pattern = "mixed";
    reasoning.push(
      `Mixed hepatitic/cholestatic pattern: transaminases raised (${altRaised ? `ALT ${altVal}` : ""}${astRaised ? `, AST ${astVal}` : ""} U/L) alongside ALP ${alpVal} U/L. Mixed pattern may indicate drug-induced liver injury, autoimmune hepatitis with cholestatic features, or biliary pathology with secondary hepatocellular injury.`
    );
  } else if (bilirubinRaised && !altRaised && !astRaised && !alpRaised) {
    pattern = "isolated_bilirubin";
    reasoning.push(
      `Isolated raised bilirubin (${bilirubinVal} µmol/L, above ${THRESHOLDS.bilirubin} µmol/L) with all other LFTs normal. In an otherwise well young patient, this pattern is most commonly Gilbert's syndrome (unconjugated hyperbilirubinaemia — benign, accentuated by fasting, illness, or exercise).`
    );
    reasoning.push(
      "Exclude haemolysis (check FBC, reticulocyte count, LDH, haptoglobin). If unconjugated bilirubin only and patient well — reassurance and no referral usually required."
    );
  } else if (ggtRaised && !altRaised && !astRaised && !alpRaised) {
    pattern = "isolated_ggt";
    reasoning.push(
      `Isolated raised GGT (${ggtVal} U/L, above ${THRESHOLDS.ggt} U/L) with all other LFTs normal. Isolated GGT elevation is commonly related to alcohol use or hepatotoxic medications and does not in itself require referral if the patient is otherwise asymptomatic and without risk factors.`
    );
    if (form.highRiskAlcohol) {
      reasoning.push("High-risk alcohol use confirmed (AUDIT ≥15). Raised GGT is consistent with alcohol-related liver injury. Brief intervention, AUDIT-C follow-up, and alcohol reduction advice are the first steps.");
    }
  } else if (!altRaised && !astRaised && !alpRaised && !ggtRaised && !bilirubinRaised && !syntheticFailure) {
    pattern = "normal";
    reasoning.push("All entered LFT values are within normal limits. Note: normal LFTs do not exclude liver disease — if there is clinical suspicion of liver disease or high-risk features (obesity, T2DM, high alcohol use), consider USS liver and risk stratification.");
  }

  // ── Urgency determination ──
  let urgency: Urgency = "primary_care";

  if (form.encephalopathy || form.jaundice) {
    urgency = "emergency";
  } else if (
    redFlags.length > 0 ||
    (altVal !== undefined && altVal !== null && altVal > THRESHOLDS.alt * 10)
  ) {
    urgency = "urgent_2ww";
  } else if (
    fib4RiskLevel === "high" ||
    syntheticFailure ||
    pattern === "mixed" ||
    (pattern === "cholestatic" && ggtRaised)
  ) {
    urgency = "routine_referral";
  } else if (
    fib4RiskLevel === "indeterminate" ||
    pattern === "hepatitic" ||
    pattern === "cholestatic"
  ) {
    urgency = "primary_care";
  } else if (pattern === "normal" || pattern === "isolated_ggt" || pattern === "isolated_bilirubin") {
    urgency = form.highRiskAlcohol || form.masldRisk || form.symptoms ? "primary_care" : "reassure";
  }

  // Add monitoring note for MASLD
  if ((form.masldRisk || form.highRiskAlcohol) && fib4RiskLevel === "low" && urgency !== "emergency") {
    reasoning.push(
      "Low FIB-4 with metabolic risk factors: low probability of advanced fibrosis. Manage in primary care — lifestyle advice (weight loss, alcohol reduction, exercise), treat underlying metabolic risk factors. Repeat LFTs and FIB-4 in 1–3 years or if clinical change."
    );
  }

  // Build referral text
  const referralMap: Record<Urgency, string> = {
    emergency:
      "EMERGENCY / SAME-DAY ASSESSMENT. Contact medical team directly. Features of acute liver failure or obstructive jaundice requiring immediate hospital assessment.",
    urgent_2ww:
      "Urgent referral — discuss with secondary care. Consider 2-week-wait upper GI pathway if red flag features present. Markedly abnormal LFTs or features of synthetic failure require prompt specialist assessment.",
    routine_referral:
      "Routine hepatology referral. Timeframe: within 6–8 weeks. Indications: high FIB-4 score (>2.67), mixed pattern, or significant cholestatic abnormality suggesting biliary pathology requiring specialist workup.",
    primary_care:
      "Primary care investigation and management. Investigate pattern in primary care: USS liver, viral hepatitis screen (HBsAg, HCV Ab), autoimmune panel if indicated, medication review, lifestyle intervention. Repeat LFTs in 3–6 months. Refer if not improving or new features develop.",
    monitor:
      "Monitor in primary care. Repeat LFTs in 6–12 months. If pattern persists or worsens, investigate further.",
    reassure:
      "Reassurance appropriate. Isolated GGT or bilirubin elevation in an asymptomatic patient without risk factors does not usually require further investigation or referral. Explain findings to patient.",
  };

  // Patient summaries
  const patientSummaryMap: Record<Pattern | "null", string> = {
    hepatitic:
      "Your liver blood tests show that the liver cells appear to be under some stress — the levels of enzymes called ALT and/or AST are raised. This is called a hepatitic (liver-cell) pattern. There are many possible causes including fatty liver disease, alcohol, viral infections, and medications. Your GP will investigate further.",
    cholestatic:
      "Your liver blood tests show a pattern called cholestatic — a liver enzyme called ALP is raised, which can indicate a problem with the bile ducts inside or outside the liver, or occasionally a bone problem. Your GP will arrange an ultrasound scan and possibly further blood tests to investigate.",
    mixed:
      "Your liver blood tests show an abnormal pattern involving more than one type of enzyme. This needs further investigation to identify the underlying cause. Your GP may refer you to a liver specialist.",
    isolated_bilirubin:
      "One of your liver markers — bilirubin — is slightly raised, but the rest of your liver blood tests are normal. The most likely explanation is a very common, harmless condition called Gilbert's syndrome, which causes mild jaundice (yellowing) at times of stress, illness, or fasting. Your GP can confirm this.",
    isolated_ggt:
      "One of your liver markers — GGT — is slightly raised. This is often related to alcohol intake or certain medications, and in isolation doesn't usually require specialist referral. Your GP will review your medications and alcohol use.",
    normal:
      "Your liver blood test results are all within the normal range. Normal results do not completely rule out liver disease, so if you have symptoms or risk factors your GP may want to arrange further tests.",
    synthetic_failure:
      "One of your liver markers — albumin — is low. Albumin is a protein made by the liver, and a low level can indicate that the liver is not working as well as it should. Your GP will arrange urgent further assessment.",
    null: "Your liver blood test results have been reviewed against the guidelines.",
  };

  return {
    pattern,
    fib4: fib4Score,
    fib4Risk: fib4RiskLevel,
    urgency,
    reasoning,
    caveats,
    redFlags,
    referralText: urgency ? referralMap[urgency] : "",
    verbatimGuideline: VERBATIM_GUIDELINE,
    patientSummary:
      patientSummaryMap[(pattern as Pattern | "null") ?? "null"],
    patientScript: buildPatientScript(urgency, pattern),
  };
}

function buildPatientScript(urgency: Urgency | null, pattern: Pattern | null): string {
  if (!urgency || !pattern) return "";
  if (urgency === "emergency")
    return "My liver blood tests are very abnormal and I've been told I need urgent assessment today. Can you arrange this immediately, please?";
  if (urgency === "urgent_2ww")
    return "My liver blood tests have come back with some concerning results and I've been told I need an urgent specialist referral. Can you arrange this, please?";
  if (urgency === "routine_referral")
    return "My liver blood tests have come back abnormal and the guideline says I should be referred to a liver specialist. Can you arrange a routine referral for me, please?";
  return "My liver blood tests have come back with some abnormal results. Can you go through what they mean and what the next steps are for investigating them in primary care, please?";
}

const VERBATIM_GUIDELINE = `NCL ICB Abnormal LFT Pathway — North Central London Integrated Care Board
Underpinned by: BSG Guidelines on Management of Abnormal Liver Blood Tests (Newsome et al., Gut 2018)

Pattern recognition:
• Hepatitic pattern (raised ALT ± AST, ALP normal): hepatocellular injury
  — Causes: MASLD, ARLD, viral hepatitis (HBV, HCV), drug-induced, autoimmune hepatitis
• Cholestatic pattern (raised ALP ± GGT, transaminases normal): biliary/infiltrative
  — Causes: PBC (check AMA), PSC, gallstones, drugs, infiltration (sarcoid, lymphoma), bone disease
• Mixed pattern: drug-induced, autoimmune, biliary disease with hepatocellular involvement
• Isolated bilirubin: Gilbert's syndrome (exclude haemolysis)
• Isolated GGT: alcohol, drugs — does not require referral if asymptomatic

FIB-4 score (MASLD/ARLD fibrosis risk stratification):
  Formula: (Age × AST) ÷ (Platelets × √ALT)
  <1.30 = low risk — manage in primary care
  1.30–2.67 = indeterminate — consider ELF test or fibroscan
  >2.67 = high risk — refer to hepatology

Red flags requiring urgent/emergency referral:
• Jaundice with dilated biliary tree on USS — surgical emergency
• ALT >10× ULN without clear cause
• Encephalopathy — features of acute liver failure
• Low albumin (synthetic failure)
• Suspected hepatocellular carcinoma

Infected Blood Inquiry (May 2024): offer hepatitis C testing to all patients with history
of blood transfusion before 1996.`;

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export const Route = createFileRoute("/pathway/lft")({
  component: LFTPathway,
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
          : "border-slate-200 bg-white focus-within:border-emerald-400"
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
          Marked as not tested
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            value={field.value}
            onChange={(e) => onChange({ ...field, value: e.target.value })}
            placeholder="Enter value"
            className="flex-1 text-lg font-mono rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <span className="text-sm text-slate-500 font-medium">{unit}</span>
        </div>
      )}
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: Urgency | null }) {
  if (!urgency) return null;
  const config: Record<Urgency, { label: string; color: string; dot: string }> = {
    emergency: {
      label: "Emergency — same-day assessment",
      color: "bg-red-100 text-red-800 border-red-300",
      dot: "bg-red-600",
    },
    urgent_2ww: {
      label: "Urgent referral — discuss with secondary care",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      dot: "bg-orange-500",
    },
    routine_referral: {
      label: "Routine hepatology referral",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      dot: "bg-blue-500",
    },
    primary_care: {
      label: "Primary care investigation",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      dot: "bg-yellow-500",
    },
    monitor: {
      label: "Monitor in primary care",
      color: "bg-green-100 text-green-800 border-green-200",
      dot: "bg-green-500",
    },
    reassure: {
      label: "Reassurance appropriate",
      color: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
    },
  };
  const c = config[urgency];
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${c.color}`}
    >
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </div>
  );
}

function Fib4Display({ score, risk }: { score: number | null; risk: "low" | "indeterminate" | "high" | null }) {
  if (score === null || risk === null) return null;
  const color = risk === "low" ? "text-green-700 bg-green-50 border-green-200" : risk === "indeterminate" ? "text-yellow-700 bg-yellow-50 border-yellow-200" : "text-red-700 bg-red-50 border-red-200";
  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center justify-between ${color}`}>
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide">FIB-4 Score</span>
        <div className="text-xs mt-0.5 opacity-80">(Age × AST) ÷ (Platelets × √ALT)</div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold font-mono">{score.toFixed(2)}</div>
        <div className="text-xs font-semibold capitalize">{risk} fibrosis risk</div>
      </div>
    </div>
  );
}

export default function LFTPathway() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    sex: "male",
    age: "",
    platelets: "",
    alt: { value: "", notAvailable: false },
    ast: { value: "", notAvailable: false },
    alp: { value: "", notAvailable: false },
    ggt: { value: "", notAvailable: false },
    bilirubin: { value: "", notAvailable: false },
    albumin: { value: "", notAvailable: false },
    highRiskAlcohol: false,
    masldRisk: false,
    jaundice: false,
    encephalopathy: false,
    symptoms: false,
    medications: false,
    bloodTransfusionPre1996: false,
  });

  const result = useMemo(() => synthesise(form), [form]);

  const hasAnyLFT = [form.alt, form.ast, form.alp, form.ggt, form.bilirubin, form.albumin].some(
    (f) => f.notAvailable || f.value !== ""
  );

  const handleViewResults = useCallback(() => {
    const params = new URLSearchParams({
      pathway: "lft",
      sex: form.sex,
      age: form.age,
      platelets: form.platelets,
      altValue: form.alt.value,
      altNA: form.alt.notAvailable ? "1" : "0",
      astValue: form.ast.value,
      astNA: form.ast.notAvailable ? "1" : "0",
      alpValue: form.alp.value,
      alpNA: form.alp.notAvailable ? "1" : "0",
      ggtValue: form.ggt.value,
      ggtNA: form.ggt.notAvailable ? "1" : "0",
      bilirubinValue: form.bilirubin.value,
      bilirubinNA: form.bilirubin.notAvailable ? "1" : "0",
      albuminValue: form.albumin.value,
      albuminNA: form.albumin.notAvailable ? "1" : "0",
    });
    navigate({ to: "/results", search: Object.fromEntries(params) });
  }, [form, navigate]);

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
                <span className="text-lg">🫀</span>
                <h1 className="text-lg font-bold text-slate-900">
                  Abnormal LFT Pathway
                </h1>
              </div>
              <p className="text-xs text-slate-500">
                NCL ICB · BSG Guidelines (Newsome et al., Gut 2018)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Red flag banner */}
        {result.redFlags.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2">
            <div className="font-bold text-red-800 text-sm uppercase tracking-wide">
              🚨 Red flags detected
            </div>
            {result.redFlags.map((f, i) => (
              <p key={i} className="text-sm text-red-800">{f}</p>
            ))}
          </div>
        )}

        {/* Patient context */}
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
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Age + Platelets for FIB-4 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Age (for FIB-4)</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                placeholder="e.g. 54"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Platelets (×10⁹/L, for FIB-4)</label>
              <input
                type="number"
                value={form.platelets}
                onChange={(e) => setForm((f) => ({ ...f, platelets: e.target.value }))}
                placeholder="e.g. 210"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* Risk factors */}
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Risk factors &amp; clinical context</p>
            {[
              { key: "masldRisk" as const, label: "MASLD risk factors", sub: "Obesity (BMI >30), type 2 diabetes, or metabolic syndrome" },
              { key: "highRiskAlcohol" as const, label: "High-risk alcohol use", sub: "AUDIT score ≥15, or >14 units/week (women) / >21 units/week (men)" },
              { key: "medications" as const, label: "Hepatotoxic medications", sub: "Statins, methotrexate, amiodarone, antibiotics, herbal remedies, etc." },
              { key: "symptoms" as const, label: "Liver-related symptoms", sub: "RUQ pain, pruritis, fatigue, weight loss, jaundice" },
              { key: "jaundice" as const, label: "Jaundice present", sub: "Clinically visible — requires urgent assessment", urgent: true },
              { key: "encephalopathy" as const, label: "Encephalopathy features", sub: "Confusion, flap, asterixis — suggests acute liver failure", urgent: true },
              { key: "bloodTransfusionPre1996" as const, label: "Blood transfusion before 1996", sub: "NHSE: must be offered hepatitis C testing (Infected Blood Inquiry 2024)" },
            ].map(({ key, label, sub, urgent }) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  form[key]
                    ? urgent
                      ? "border-red-400 bg-red-50"
                      : "border-emerald-300 bg-emerald-50"
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
                  <div className="text-sm font-medium text-slate-800">{label}</div>
                  <div className="text-xs text-slate-500">{sub}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* LFT results */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
              LFT results
            </h2>
            <span className="text-xs text-slate-400">Fill any or all fields</span>
          </div>
          <FieldInput label="ALT" unit="U/L" hint={`ULN ${THRESHOLDS.alt}`} field={form.alt} onChange={(f) => setForm((s) => ({ ...s, alt: f }))} />
          <FieldInput label="AST" unit="U/L" hint={`ULN ${THRESHOLDS.ast}`} field={form.ast} onChange={(f) => setForm((s) => ({ ...s, ast: f }))} />
          <FieldInput label="ALP" unit="U/L" hint={`ULN ${THRESHOLDS.alp}`} field={form.alp} onChange={(f) => setForm((s) => ({ ...s, alp: f }))} />
          <FieldInput label="GGT" unit="U/L" hint={`ULN ~${THRESHOLDS.ggt}`} field={form.ggt} onChange={(f) => setForm((s) => ({ ...s, ggt: f }))} />
          <FieldInput label="Bilirubin" unit="µmol/L" hint={`ULN ${THRESHOLDS.bilirubin}`} field={form.bilirubin} onChange={(f) => setForm((s) => ({ ...s, bilirubin: f }))} />
          <FieldInput label="Albumin" unit="g/L" hint={`Low <${THRESHOLDS.albumin_low}`} field={form.albumin} onChange={(f) => setForm((s) => ({ ...s, albumin: f }))} />
        </div>

        {/* Live synthesis */}
        {hasAnyLFT && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
                  Live interpretation
                </h2>
              </div>
              {result.urgency && <UrgencyBadge urgency={result.urgency} />}
            </div>

            {/* FIB-4 */}
            <Fib4Display score={result.fib4} risk={result.fib4Risk} />

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
                  <div key={i} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
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
        {result.urgency && hasAnyLFT && (
          <button
            onClick={handleViewResults}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            View full results page →
          </button>
        )}

        {/* Guideline footer */}
        <div className="text-center space-y-1 pb-4">
          <p className="text-xs text-slate-400">
            Source: NCL ICB Abnormal LFT Pathway · BSG 2018 guidelines
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href={FLOWSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 hover:text-emerald-800 underline"
            >
              Download LFT pathway PDF ↗
            </a>
            <span className="text-slate-300">·</span>
            <a
              href={GUIDELINE_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 hover:text-emerald-800 underline"
            >
              NCL hepatology guidelines ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
