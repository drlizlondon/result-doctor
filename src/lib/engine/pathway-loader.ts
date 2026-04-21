// ─── PATHWAY REGISTRY ────────────────────────────────────────────────────────
// Add new pathways here. Each entry registers a pathway with its metadata.
// The route file must exist at: src/routes/pathway.[id].tsx
//
// To add a new pathway:
// 1. Create src/routes/pathway.[id].tsx
// 2. Add an entry below

export interface PathwayMeta {
  id: string;
  title: string;
  shortTitle: string;
  category: "haematology" | "hepatology" | "biochemistry" | "urology";
  icb: string;
  version: string;
  guidelineUrl: string;
  guidelinePageUrl: string;
  inputs: string[];
  status: "live" | "coming_soon" | "stub";
  route: string;
}

export const PATHWAY_REGISTRY: PathwayMeta[] = [
  // ── HAEMATOLOGY ──────────────────────────────────────────────────────────
  {
    id: "anaemia",
    title: "Anaemia (Iron Deficiency)",
    shortTitle: "Anaemia",
    category: "haematology",
    icb: "NWL ICB",
    version: "V1, 9 July 2020",
    guidelineUrl: "https://www.nwlondonicb.nhs.uk/download_file/877/577",
    guidelinePageUrl:
      "https://www.nwlondonicb.nhs.uk/professionals/clinical-topics/haematology",
    inputs: ["Hb (g/L)", "MCV (fL)", "Ferritin (µg/L)"],
    status: "live",
    route: "/pathway/anaemia",
  },
  {
    id: "thrombocytopenia",
    title: "Thrombocytopenia",
    shortTitle: "Low platelets",
    category: "haematology",
    icb: "NWL ICB",
    version: "V1, 9 July 2020",
    guidelineUrl: "https://www.nwlondonicb.nhs.uk/download_file/865/577",
    guidelinePageUrl:
      "https://www.nwlondonicb.nhs.uk/professionals/clinical-topics/haematology",
    inputs: ["Platelets (×10⁹/L)", "Duration", "Symptoms"],
    status: "coming_soon",
    route: "/pathway/thrombocytopenia",
  },
  {
    id: "macrocytosis",
    title: "Macrocytosis",
    shortTitle: "Raised MCV",
    category: "haematology",
    icb: "NWL ICB",
    version: "V1, 9 July 2020",
    guidelineUrl: "https://www.nwlondonicb.nhs.uk/download_file/879/577",
    guidelinePageUrl:
      "https://www.nwlondonicb.nhs.uk/professionals/clinical-topics/haematology",
    inputs: ["MCV (fL)", "B12 (ng/L)", "Folate (µg/L)", "TSH (mU/L)"],
    status: "coming_soon",
    route: "/pathway/macrocytosis",
  },
  {
    id: "neutropenia",
    title: "Neutropenia",
    shortTitle: "Low neutrophils",
    category: "haematology",
    icb: "NWL ICB",
    version: "V1, 9 July 2020",
    guidelineUrl: "https://www.nwlondonicb.nhs.uk/download_file/867/577",
    guidelinePageUrl:
      "https://www.nwlondonicb.nhs.uk/professionals/clinical-topics/haematology",
    inputs: ["Neutrophils (×10⁹/L)", "WBC (×10⁹/L)"],
    status: "coming_soon",
    route: "/pathway/neutropenia",
  },
  {
    id: "b12",
    title: "B12 Deficiency",
    shortTitle: "B12 deficiency",
    category: "haematology",
    icb: "NWL ICB",
    version: "V1, 9 July 2020",
    guidelineUrl: "https://www.nwlondonicb.nhs.uk/download_file/880/577",
    guidelinePageUrl:
      "https://www.nwlondonicb.nhs.uk/professionals/clinical-topics/haematology",
    inputs: ["Serum B12 (ng/L)", "Folate (µg/L)", "Intrinsic factor Ab"],
    status: "coming_soon",
    route: "/pathway/b12",
  },

  // ── HEPATOLOGY ───────────────────────────────────────────────────────────
  {
    id: "lft",
    title: "Abnormal Liver Function Tests",
    shortTitle: "Abnormal LFTs",
    category: "hepatology",
    icb: "NCL ICB",
    version: "BSG 2018 (Newsome et al., Gut)",
    guidelineUrl:
      "https://gps.northcentrallondon.icb.nhs.uk/cdn/serve/pathway-downloads/1459255901-0ea32ea4dac64bd6da48e592ddddc42f.pdf",
    guidelinePageUrl:
      "https://gps.northcentrallondon.icb.nhs.uk/topics/hepatology",
    inputs: ["ALT", "AST", "ALP", "GGT", "Bilirubin", "Albumin"],
    status: "live",
    route: "/pathway/lft",
  },
];

export function getPathway(id: string): PathwayMeta | undefined {
  return PATHWAY_REGISTRY.find((p) => p.id === id);
}

export function getLivePathways(): PathwayMeta[] {
  return PATHWAY_REGISTRY.filter((p) => p.status === "live");
}

export function getPathwaysByCategory(
  category: PathwayMeta["category"]
): PathwayMeta[] {
  return PATHWAY_REGISTRY.filter((p) => p.category === category);
}
