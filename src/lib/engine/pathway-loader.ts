/**
 * ResultDoctor — Pathway Loader
 *
 * This is the single registration point for all pathway JSON files.
 * Adding a new pathway = import it here + add to PATHWAY_REGISTRY.
 *
 * The engine (synthesis.ts) reads from this registry to:
 *   1. Identify which pathways are triggered by entered results
 *   2. Run the decision tree for each triggered pathway
 *   3. Produce the consolidated SynthesisResult
 */

import type { PathwayDefinition } from "@/types";

// ─── Import pathway JSONs ─────────────────────────────────────
// NCL pathways
import nclFbcAnaemia from "@/pathways/ncl/fbc-anaemia.json";

// NWL pathways (future)
// import nwlAnaemia from "@/pathways/nwl/anaemia.json";

// ─── Registry ─────────────────────────────────────────────────
const PATHWAY_REGISTRY: PathwayDefinition[] = [
  nclFbcAnaemia as PathwayDefinition,
  // Add new pathway objects here as JSON files are written
];

// ─── Lookup helpers ───────────────────────────────────────────

/** Get a pathway by its unique ID */
export function getPathwayById(id: string): PathwayDefinition | undefined {
  return PATHWAY_REGISTRY.find((p) => p.id === id);
}

/** Get a pathway by its URL slug */
export function getPathwayBySlug(slug: string): PathwayDefinition | undefined {
  return PATHWAY_REGISTRY.find((p) => p.slug === slug);
}

/** Get all available (published) pathways */
export function getAvailablePathways(): PathwayDefinition[] {
  return PATHWAY_REGISTRY.filter((p) => p.available);
}

/** Get all pathways (including coming soon) */
export function getAllPathways(): PathwayDefinition[] {
  return PATHWAY_REGISTRY;
}

/**
 * Given a map of entered results, return all pathways whose trigger
 * conditions are satisfied.
 *
 * A pathway is triggered when:
 *   - At least one of its triggerTests has been entered
 *   - The entered value satisfies its triggerCondition
 *
 * This is the entry point for the routing layer.
 */
export function getTriggeredPathways(
  results: Record<string, { status: "known"; value: number } | { status: "unknown" } | { status: "not_done" }>
): PathwayDefinition[] {
  return PATHWAY_REGISTRY.filter((pathway) => {
    if (!pathway.available) return false;

    // Check each trigger test
    for (const testId of pathway.triggerTests) {
      const result = results[testId];
      if (!result || result.status !== "known") continue;

      // Evaluate trigger condition(s)
      const triggered = evaluateTrigger(pathway, testId, result.value, results);
      if (triggered) return true;
    }

    return false;
  });
}

// ─── Internal helpers ─────────────────────────────────────────

type ResultsMap = Record<
  string,
  { status: "known"; value: number } | { status: "unknown" } | { status: "not_done" }
>;

function getValue(results: ResultsMap, testId: string): number | undefined {
  const r = results[testId];
  if (!r || r.status !== "known") return undefined;
  return r.value;
}

function evaluateTrigger(
  pathway: PathwayDefinition,
  _triggerTestId: string,
  _triggerValue: number,
  results: ResultsMap
): boolean {
  const cond = pathway.triggerCondition;

  if (Array.isArray(cond)) {
    const op = pathway.triggerConditionOperator ?? "AND";
    if (op === "AND") return cond.every((c) => evaluateCondition(c, results));
    return cond.some((c) => evaluateCondition(c, results));
  }

  return evaluateCondition(cond, results);
}

function evaluateCondition(
  cond: {
    test: string;
    operator: "<" | "<=" | ">" | ">=" | "==" | "!=" | "between";
    value?: number;
    valueHigh?: number;
    sexSpecific?: { male?: number; female?: number };
  },
  results: ResultsMap
): boolean {
  const value = getValue(results, cond.test);
  if (value === undefined) return false;

  const threshold = cond.value ?? 0;

  switch (cond.operator) {
    case "<":  return value < threshold;
    case "<=": return value <= threshold;
    case ">":  return value > threshold;
    case ">=": return value >= threshold;
    case "==": return value === threshold;
    case "!=": return value !== threshold;
    case "between":
      return value >= threshold && value <= (cond.valueHigh ?? threshold);
    default:
      return false;
  }
}

export default PATHWAY_REGISTRY;
