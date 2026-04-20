/**
 * ResultDoctor — Cross-Pathway Rules
 *
 * Rules that fire when MULTIPLE pathways are triggered simultaneously.
 * These encode clinical insights that only emerge when looking at
 * results in combination — not visible when running pathways individually.
 *
 * Each rule is fully attributed to its source guideline.
 * Rules live in data so they can be updated without code changes.
 *
 * Sources:
 * - NCL Abnormal FBC in Adults (January 2023)
 * - NCL Abnormal LFTs (February 2023)
 * - NCL Thyroid Function Tests
 * - NCL Iron Deficiency Pathway (August 2022)
 */

import type { CrossPathwayRule } from "../../types";

export const CROSS_PATHWAY_RULES: CrossPathwayRule[] = [

  // ─────────────────────────────────────────────────────────────
  // PANCYTOPENIA / MULTI-LINEAGE RULES
  // ─────────────────────────────────────────────────────────────

  {
    id: "pancytopenia-escalation",
    description: "Two or more cell line abnormalities → likely bone marrow cause",
    clinicalRationale: "When multiple blood cell types are affected simultaneously, reactive causes become less likely and bone marrow pathology must be excluded urgently.",
    verbatim: "Abnormalities affecting more than one cell type are more likely to be due to bone marrow causes rather than reactive. Always consider earlier referral when the patient is unwell.",
    source: "NCL Abnormal FBC in Adults, January 2023",
    triggers: {
      requireAny: {
        pathways: [
          "ncl-fbc-anaemia",
          "ncl-fbc-thrombocytopenia",
          "ncl-fbc-neutropenia",
          "ncl-fbc-lymphopenia",
        ],
        minCount: 2,
      },
    },
    effects: {
      upgradeUrgencyTo: "urgent_2ww",
      addReferral: {
        specialty: "haematology",
        urgency: "urgent_2ww",
        verbatim: "Refer urgently if pancytopenia — abnormalities affecting more than one cell type are more likely to be due to bone marrow causes rather than reactive.",
        conditions: "All three cell lines affected (pancytopenia) or any two cell lines with clinical concern",
      },
      addInvestigations: [
        {
          label: "Blood film review",
          verbatim: "Blood film — urgently refer if leukoerythroblastic picture (immature white cells and nucleated RBCs)",
          source: "ncl-fbc-anaemia",
          priority: "essential",
        },
        {
          label: "Serum protein electrophoresis",
          verbatim: "Myeloma screen — serum protein electrophoresis and serum free light chains",
          source: "ncl-fbc-neutropenia",
          priority: "essential",
        },
        {
          label: "Serum free light chains",
          source: "ncl-fbc-neutropenia",
          priority: "essential",
        },
        {
          label: "LDH",
          source: "ncl-fbc-neutrophilia",
          priority: "essential",
        },
      ],
      addWarning: "Multiple blood count abnormalities are present. Per NCL guideline, this pattern is more likely to indicate a bone marrow cause than a reactive process.",
      primarySpecialty: "haematology",
    },
  },

  {
    id: "anaemia-thrombocytopenia-macrocytosis",
    description: "Anaemia + thrombocytopenia + macrocytosis → MDS/myeloma must be excluded",
    clinicalRationale: "This triad (especially with MCV >100) is a recognised presentation of myelodysplastic syndrome or myeloma.",
    source: "NCL Abnormal FBC in Adults — Macrocytosis pathway, January 2023",
    verbatim: "Macrocytosis with abnormal FBC WITHOUT B12/folate deficiency — consider advice and guidance/referral. Haematological disorder e.g. MDS, Myeloma.",
    triggers: {
      requireAll: [
        "ncl-fbc-anaemia",
        "ncl-fbc-macrocytosis",
        "ncl-fbc-thrombocytopenia",
      ],
    },
    effects: {
      upgradeUrgencyTo: "urgent_2ww",
      addReferral: {
        specialty: "haematology",
        urgency: "urgent_2ww",
        verbatim: "Macrocytosis with abnormal FBC WITHOUT B12/folate deficiency — refer to haematology. Consider MDS or myeloma.",
      },
      addInvestigations: [
        {
          label: "Myeloma screen (protein electrophoresis + free light chains)",
          verbatim: "Myeloma screen — serum protein electrophoresis and serum free light chains",
          source: "ncl-fbc-macrocytosis",
          priority: "essential",
        },
        {
          label: "Blood film for dysplasia",
          verbatim: "Macrocytosis with dysplasia on blood film — consider referral",
          source: "ncl-fbc-macrocytosis",
          priority: "essential",
        },
      ],
      addWarning: "The combination of anaemia, low platelets and large red cells (macrocytosis) requires urgent haematology assessment to exclude myelodysplasia or myeloma.",
    },
  },

  // ─────────────────────────────────────────────────────────────
  // IRON DEFICIENCY WITH REACTIVE THROMBOCYTOSIS
  // ─────────────────────────────────────────────────────────────

  {
    id: "iron-deficiency-reactive-thrombocytosis",
    description: "Iron deficiency anaemia + raised platelets → iron deficiency causing reactive thrombocytosis",
    clinicalRationale: "Iron deficiency is a common cause of reactive thrombocytosis. Treating the iron deficiency will usually resolve the platelet count without need for haematology referral.",
    source: "NCL Abnormal FBC in Adults — Thrombocytosis pathway, January 2023",
    verbatim: "Potential causes of thrombocytosis: Iron Deficiency Anaemia.",
    triggers: {
      requireAll: ["ncl-fbc-anaemia", "ncl-fbc-thrombocytosis"],
      resultConditions: [
        { test: "ferritin", operator: "<", value: 30 },
      ],
    },
    effects: {
      addInvestigations: [
        {
          label: "Iron studies and CRP",
          verbatim: "Check iron studies and CRP — iron deficiency is a common cause of reactive thrombocytosis",
          source: "ncl-fbc-thrombocytosis",
          priority: "essential",
        },
      ],
      addWarning: "Raised platelets in the context of iron deficiency are likely reactive. Treating the iron deficiency should normalise the platelet count. Repeat FBC after iron treatment before considering haematology referral.",
    },
  },

  // ─────────────────────────────────────────────────────────────
  // LIVER DISEASE CONTRIBUTING TO BLOOD COUNT ABNORMALITIES
  // ─────────────────────────────────────────────────────────────

  {
    id: "liver-disease-thrombocytopenia",
    description: "Abnormal LFTs + thrombocytopenia → consider cirrhosis with hypersplenism",
    clinicalRationale: "Low platelets in the context of liver disease often indicates hypersplenism secondary to portal hypertension, suggesting advanced liver disease.",
    source: "NCL Abnormal LFTs — February 2023 / NCL Abnormal FBC — Thrombocytopenia",
    verbatim: "Liver dysfunction — fatty liver disease, cirrhosis [as cause of thrombocytopenia]. Concerns re decreased albumin or prolonged INR — urgent ultrasound and/or urgent 2 week referral.",
    triggers: {
      requireAll: ["ncl-lft", "ncl-fbc-thrombocytopenia"],
    },
    effects: {
      upgradeUrgencyTo: "urgent",
      addReferral: {
        specialty: "hepatology",
        urgency: "urgent",
        verbatim: "Abnormal LFTs with thrombocytopenia — consider cirrhosis with hypersplenism. Urgent liver ultrasound and hepatology review.",
      },
      addInvestigations: [
        {
          label: "Urgent liver ultrasound",
          verbatim: "Urgent Ultrasound — suspected malignancy, concerns re albumin or prolonged INR",
          source: "ncl-lft",
          priority: "essential",
        },
        {
          label: "Albumin and INR",
          verbatim: "Concerns re decreased albumin or prolonged INR — urgent assessment",
          source: "ncl-lft",
          priority: "essential",
        },
        {
          label: "Coagulation screen including fibrinogen",
          source: "ncl-fbc-thrombocytopenia",
          priority: "essential",
        },
      ],
      addWarning: "Low platelets alongside abnormal liver tests may indicate advanced liver disease (cirrhosis with hypersplenism). Urgent assessment is recommended.",
    },
  },

  {
    id: "liver-disease-macrocytosis",
    description: "Abnormal LFTs + macrocytosis → alcohol or chronic liver disease",
    clinicalRationale: "Macrocytosis is commonly caused by alcohol excess or chronic liver disease. The combination of abnormal LFTs and raised MCV should prompt assessment of alcohol use.",
    source: "NCL Abnormal FBC — Macrocytosis pathway, January 2023",
    verbatim: "Common causes of macrocytosis: Alcohol excess, Chronic liver disease.",
    triggers: {
      requireAll: ["ncl-lft", "ncl-fbc-macrocytosis"],
    },
    effects: {
      addInvestigations: [
        {
          label: "Detailed alcohol history",
          verbatim: "Clinical history including alcohol and medications — macrocytosis assessment",
          source: "ncl-fbc-macrocytosis",
          priority: "essential",
        },
        {
          label: "B12 and folate (alcohol depletes both)",
          source: "ncl-fbc-macrocytosis",
          priority: "essential",
        },
      ],
      addWarning: "Abnormal liver tests with large red blood cells (macrocytosis) is a common pattern with alcohol excess or chronic liver disease.",
    },
  },

  // ─────────────────────────────────────────────────────────────
  // THYROID DISEASE CONTRIBUTING TO BLOOD COUNT / LFT ABNORMALITIES
  // ─────────────────────────────────────────────────────────────

  {
    id: "hypothyroidism-anaemia",
    description: "Hypothyroid pattern TFTs + anaemia → treat thyroid first, recheck Hb",
    clinicalRationale: "Hypothyroidism is a reversible cause of anaemia. Treating the thyroid disease should improve haemoglobin before committing to haematology referral.",
    source: "NCL Abnormal FBC — Macrocytosis, January 2023 / NCL TFT Pathway",
    verbatim: "Consider hypothyroidism [as cause of macrocytosis and anaemia]. LFTs/TFTs — macrocytosis primary care assessment.",
    triggers: {
      requireAll: ["ncl-tft", "ncl-fbc-anaemia"],
      resultConditions: [
        { test: "tsh", operator: ">", value: 4.0 },
      ],
    },
    effects: {
      addInvestigations: [
        {
          label: "TFTs (TSH and FT4) — if not already done",
          verbatim: "LFTs/TFTs — assess in macrocytosis and unexplained anaemia",
          source: "ncl-fbc-macrocytosis",
          priority: "essential",
        },
      ],
      addWarning: "An underactive thyroid (hypothyroidism) can cause anaemia. Treating the thyroid condition first and rechecking the blood count is recommended before considering referral.",
    },
  },

  {
    id: "hypothyroidism-macrocytosis",
    description: "Hypothyroid TFTs + macrocytosis → hypothyroidism is likely cause of macrocytosis",
    clinicalRationale: "Hypothyroidism is a well-recognised and reversible cause of macrocytosis. B12/folate deficiency should also be excluded.",
    source: "NCL Abnormal FBC — Macrocytosis pathway, January 2023",
    verbatim: "Common causes of macrocytosis: Hypothyroidism. Referral NOT needed where underlying cause clear from history and investigations.",
    triggers: {
      requireAll: ["ncl-tft", "ncl-fbc-macrocytosis"],
      resultConditions: [
        { test: "tsh", operator: ">", value: 4.0 },
      ],
    },
    effects: {
      addWarning: "High TSH (underactive thyroid) is a recognised cause of large red blood cells (macrocytosis). Treating the thyroid and rechecking B12/folate is recommended before referral.",
    },
  },

  // ─────────────────────────────────────────────────────────────
  // HAEMOLYSIS PATTERN
  // ─────────────────────────────────────────────────────────────

  {
    id: "haemolysis-pattern",
    description: "Anaemia + raised bilirubin + raised reticulocytes → haemolysis",
    clinicalRationale: "This triad is the classic presentation of haemolytic anaemia, where red blood cells are being destroyed faster than they are made.",
    source: "NCL Abnormal FBC — Anaemia pathway / NCL Abnormal LFTs",
    verbatim: "Consider haemolysis (bilirubin elevated) — reticulocyte count >80×10⁹/L / >2%.",
    triggers: {
      requireAll: ["ncl-fbc-anaemia", "ncl-lft"],
      resultConditions: [
        { test: "bilirubin", operator: ">", value: 21 },
        { test: "reticulocytes", operator: ">", value: 80 },
      ],
    },
    effects: {
      upgradeUrgencyTo: "urgent",
      addReferral: {
        specialty: "haematology",
        urgency: "urgent",
        verbatim: "Consider haemolysis — urgently refer if haemolytic anaemia suspected.",
      },
      addInvestigations: [
        {
          label: "LDH (raised in haemolysis)",
          source: "cross-pathway",
          priority: "essential",
        },
        {
          label: "Direct antiglobulin test (DAT/Coombs)",
          source: "cross-pathway",
          priority: "essential",
        },
        {
          label: "Split bilirubin (conjugated vs unconjugated)",
          verbatim: "Repeat LFTs fasting sample with split bilirubin and FBC. Consider reticulocytes and LDH if haemolysis suspected.",
          source: "ncl-lft",
          priority: "essential",
        },
        {
          label: "Reticulocyte count",
          source: "ncl-fbc-anaemia",
          priority: "essential",
        },
      ],
      addWarning: "Anaemia with raised bilirubin and raised reticulocytes suggests haemolysis — your red blood cells may be breaking down faster than they are made. Urgent assessment is needed.",
    },
  },

  // ─────────────────────────────────────────────────────────────
  // MYELOMA SUSPICION PATTERN
  // ─────────────────────────────────────────────────────────────

  {
    id: "myeloma-suspicion",
    description: "Anaemia + raised ESR/CRP + renal impairment → myeloma screen essential",
    clinicalRationale: "The classic myeloma triad of anaemia, renal impairment and hypercalcaemia. ESR is often very elevated in myeloma.",
    source: "NCL Abnormal FBC — Paraproteins/Myeloma, January 2023",
    verbatim: "Common causes of paraprotein: Myeloma — blood cancer associated with anaemia, renal impairment, hypercalcaemia and bone lesions.",
    triggers: {
      requireAll: ["ncl-fbc-anaemia"],
      requireAny: {
        pathways: ["ncl-ckd"],
        minCount: 1,
      },
    },
    effects: {
      addInvestigations: [
        {
          label: "Myeloma screen — serum protein electrophoresis",
          verbatim: "Paraprotein investigation must consist of both: Serum Protein Electrophoresis AND SFLC (NICE preferred) or Urine Protein Electrophoresis",
          source: "ncl-fbc-paraproteins",
          priority: "essential",
        },
        {
          label: "Serum free light chains (NICE preferred)",
          source: "ncl-fbc-paraproteins",
          priority: "essential",
        },
        {
          label: "Bone profile (calcium)",
          verbatim: "Myeloma associated with hypercalcaemia",
          source: "ncl-fbc-paraproteins",
          priority: "essential",
        },
        {
          label: "ESR",
          source: "ncl-fbc-paraproteins",
          priority: "essential",
        },
      ],
      addWarning: "Anaemia with kidney impairment should prompt a myeloma screen. This is a simple blood test combination and is important not to miss.",
    },
  },
];

// ─────────────────────────────────────────────────────────────
// RULE LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────

/** Find all cross-pathway rules that apply given a set of active pathway IDs */
export function getApplicableRules(
  activePathwayIds: string[],
  resultConditions: Record<string, number>
): CrossPathwayRule[] {
  return CROSS_PATHWAY_RULES.filter((rule) => {
    const { triggers } = rule;

    // Check requireAll
    if (triggers.requireAll) {
      const allPresent = triggers.requireAll.every((id) =>
        activePathwayIds.includes(id)
      );
      if (!allPresent) return false;
    }

    // Check requireAny
    if (triggers.requireAny) {
      const { pathways, minCount } = triggers.requireAny;
      const count = pathways.filter((id) => activePathwayIds.includes(id)).length;
      if (count < minCount) return false;
    }

    // Check result conditions
    if (triggers.resultConditions) {
      const conditionsMet = triggers.resultConditions.every((cond) => {
        const value = resultConditions[cond.test];
        if (value === undefined) return false;

        switch (cond.operator) {
          case "<": return value < cond.value!;
          case "<=": return value <= cond.value!;
          case ">": return value > cond.value!;
          case ">=": return value >= cond.value!;
          case "==": return value === cond.value!;
          case "!=": return value !== cond.value!;
          case "between":
            return value >= cond.value! && value <= cond.valueHigh!;
          default: return false;
        }
      });
      if (!conditionsMet) return false;
    }

    return true;
  });
}
