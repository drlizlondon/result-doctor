/**
 * pathway-loader.ts
 * Central registry for all pathway JSON files.
 * To add a new pathway: one import + one array entry.
 */

// ─── Type definitions ────────────────────────────────────────────────────────

export interface PathwayNode {
  id: string;
  type: "question" | "outcome" | "branch";
  question?: string;
  field?: string;
  children?: PathwayEdge[];
  outcome?: {
    urgency: string;
    clinicianHeadline: string;
    patientHeadline: string;
    patientSummary: string;
    verbatim: string[];
    verbatimTitle?: string;
    referrals?: Array<{ specialty: string; timeframe: string; note?: string }>;
  };
}

export interface PathwayEdge {
  condition: string;       // e.g. "< 130", ">= 130 && < 150", "female", "true"
  next: string;            // node id
  label?: string;          // display label for the edge
}

export interface PathwayMeta {
  id: string;
  slug: string;
  title: string;
  description?: string;
  icb: string;
  version: string;
  date: string;
  tests: string[];
}

export interface PathwayDocument {
  meta: PathwayMeta;
  rootNode: string;
  nodes: PathwayNode[];
}

// ─── Registry ────────────────────────────────────────────────────────────────

// Import your JSON pathway files here.
// Each must match the PathwayDocument shape above.
//
// Example (uncomment when file exists):
// import nclFbcAnaemia from "@/pathways/ncl/fbc-anaemia.json";

// Inline fallback so the app works before JSONs are fully wired:
const NWL_ANAEMIA_STUB: PathwayDocument = {
  meta: {
    id: "nwl-anaemia-v1",
    slug: "anaemia",
    title: "Anaemia Pathway",
    description: "FBC/iron studies interpretation for primary care",
    icb: "NW London ICB",
    version: "V1",
    date: "2020-07-09",
    tests: ["Hb", "Ferritin", "MCV"],
  },
  rootNode: "start",
  nodes: [
    {
      id: "start",
      type: "question",
      question: "What is the patient's sex?",
      field: "sex",
      children: [
        { condition: "female", next: "hb-female", label: "Female" },
        { condition: "male", next: "hb-male", label: "Male" },
      ],
    },
  ],
};

// ─── Add new pathway JSONs here ───────────────────────────────────────────────

const PATHWAY_REGISTRY: PathwayDocument[] = [
  NWL_ANAEMIA_STUB,
  // nclFbcAnaemia,       ← uncomment once JSON is added
  // nclThrombocytopenia,
  // nclLft,
  // nclTft,
  // nclMacrocytosis,
];

// ─── Accessor functions ───────────────────────────────────────────────────────

/** Get a pathway by its unique ID */
export function getPathwayById(id: string): PathwayDocument | undefined {
  return PATHWAY_REGISTRY.find(p => p.meta.id === id);
}

/** Get a pathway by its URL slug */
export function getPathwayBySlug(slug: string): PathwayDocument | undefined {
  return PATHWAY_REGISTRY.find(p => p.meta.slug === slug);
}

/** Get all pathways that test a given field (e.g. "Hb") */
export function getTriggeredPathways(field: string): PathwayDocument[] {
  return PATHWAY_REGISTRY.filter(p =>
    p.meta.tests.some(t => t.toLowerCase() === field.toLowerCase())
  );
}

/** Get all registered pathways */
export function getAllPathways(): PathwayDocument[] {
  return [...PATHWAY_REGISTRY];
}
