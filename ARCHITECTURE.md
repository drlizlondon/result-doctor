# ResultDoctor — Data Architecture

## Overview

ResultDoctor's clinical logic lives in **data, not code**.

This means:
- Adding a new pathway = writing a JSON file (no developer needed long-term)
- Updating a threshold = editing a JSON field (auditable, reviewable by clinicians)
- Every clinical statement is attributed to its source guideline
- Every pathway has a version history and review date

---

## Directory Structure

```
src/
├── types/
│   └── index.ts              ← All TypeScript interfaces (read this first)
│
├── lib/
│   ├── catalogue/
│   │   ├── results-catalogue.ts    ← Every test the system knows about
│   │   └── cross-pathway-rules.ts  ← Rules that fire for combinations of pathways
│   │
│   └── engine/
│       └── synthesis.ts      ← The engine: routes, runs, and synthesises pathways
│
└── pathways/
    ├── ncl/                  ← North Central London ICB pathways
    │   ├── fbc-anaemia.json
    │   ├── fbc-polycythaemia.json
    │   ├── fbc-neutropenia.json
    │   ├── lft.json
    │   └── tft.json
    │
    └── nwl/                  ← North West London ICB pathways
        └── anaemia.json
```

---

## The Three Layers

### Layer 1 — The Engine (changes rarely)
`src/lib/engine/synthesis.ts`

The generic decision tree runner and synthesis engine.
Knows nothing about specific pathways — reads pathway definitions and runs them.

Key functions:
- `routeToPathways()` — identifies which pathways are triggered by entered results
- `runPathway()` — traverses a single pathway's decision tree
- `synthesise()` — combines all pathway results into one output
- `getChallengeRound1/2()` — determines what to ask the user for next

### Layer 2 — The Catalogue (grows over time)
`src/lib/catalogue/results-catalogue.ts`
`src/lib/catalogue/cross-pathway-rules.ts`

The results catalogue knows:
- Every blood test and its normal range
- Which other tests it's grouped with on the same report
- Which pathways it triggers when abnormal
- What the system should ask for when it's abnormal

The cross-pathway rules encode clinical insights that only emerge
when looking at multiple results together:
- Pancytopenia → bone marrow cause, escalate urgency
- Iron deficiency + high platelets → reactive thrombocytosis
- Abnormal LFTs + low platelets → cirrhosis/hypersplenism
- Hypothyroid TFTs + macrocytosis → treat thyroid first

### Layer 3 — The Pathway Definitions (added by ICBs)
`src/pathways/{icb-id}/{pathway-slug}.json`

Each pathway is a JSON file following the `PathwayDefinition` schema.
Clinicians can review these files directly — no code reading required.

---

## Adding a New Pathway

1. Create a JSON file in `src/pathways/{icb-id}/`
2. Follow the `PathwayDefinition` schema (see `src/types/index.ts`)
3. Add the pathway ID to the source registry
4. The engine picks it up automatically — no UI code changes needed

Example: Adding the NCL Thrombocytopenia pathway
```
src/pathways/ncl/fbc-thrombocytopenia.json
```

---

## Updating an Existing Pathway

1. Edit the JSON file
2. Increment the `source.version` field
3. Add an entry to `versionHistory` with `changedFields` and `changeNote`
4. The UI will automatically show the update date and what changed

Example version history entry:
```json
{
  "version": "2.0",
  "effectiveDate": "2026-01-01",
  "changedFields": ["thresholds.hb.female"],
  "changeNote": "Updated female Hb threshold from 114 to 110 per NCL update",
  "approvedBy": "NCL ICB CAG"
}
```

---

## Review Date Warnings

Every pathway has a `reviewDate` in its source metadata.
The UI automatically flags pathways where this date has passed.

The NCL TFT pathway, for example, had a review date of February 2022.
ResultDoctor would surface this warning automatically to users.

---

## The Challenge System

When a user enters a result, the engine:

**Round 1** — Asks for grouped tests (same report)
> "You've entered Hb. Do you also have MCV, WBC, platelets? These usually appear on the same blood test report."

**Round 2** — After producing an initial output, asks for tests that would change it
> "These results could change this recommendation: [Reticulocyte count] [B12]"

The challenge system is driven by the results catalogue — specifically the
`groupedWith`, `whenLow_requestAlso` and `whenHigh_requestAlso` fields.

---

## The Synthesis Output

When multiple pathways are triggered, the engine produces one consolidated output:

```
Overall urgency: URGENT (escalated by cross-pathway rule)
Escalation reason: Abnormalities affecting more than one cell type...

Referrals:
  🔴 URGENT — Haematology (from: anaemia + thrombocytopenia + cross-pathway rule)

Investigations:
  □ Blood film [essential] — anaemia, thrombocytopenia
  □ B12 and folate [essential] — anaemia, macrocytosis
  □ Myeloma screen [essential] — cross-pathway: pancytopenia
  □ LDH [essential] — cross-pathway: pancytopenia

Gaps (results that would change this recommendation):
  ❓ Reticulocyte count — unknown, could change urgency
  ➖ Coeliac screen — not done, recommended by guideline
```

---

## Multi-Tenant (ICB Upload) Model

Each ICB gets its own namespace under `src/pathways/{icb-id}/`.

For the B2B product, ICBs will:
1. Upload their PDF guideline
2. AI-assisted extraction produces a draft JSON
3. Clinical lead reviews and approves the JSON
4. The pathway goes live — no developer required

The engine is completely generic. It doesn't know or care which ICB
a pathway belongs to. The source metadata handles attribution.

---

## Clinical Safety Notes

- No clinical content is hard-coded in the engine
- Every output statement is attributed to a source guideline
- Pathway JSON files are human-readable — clinicians can review them
- Version history is mandatory — all changes are tracked
- Review dates are enforced — outdated pathways are flagged
- The system never generates new clinical recommendations — it only
  navigates existing, approved NHS guidelines

---

## Source Pathways (current)

| ID | Title | Source | Version | Review Date |
|---|---|---|---|---|
| ncl-fbc-anaemia | Anaemia | NCL ICB | Jan 2023 | Jan 2026 |
| ncl-fbc-polycythaemia | Polycythaemia | NCL ICB | Jan 2023 | Jan 2026 |
| ncl-fbc-neutropenia | Neutropenia | NCL ICB | Jan 2023 | Dec 2026 |
| ncl-fbc-neutrophilia | Neutrophilia | NCL ICB | Jan 2026 | Jan 2026 |
| ncl-fbc-lymphopenia | Lymphopenia | NCL ICB | Jan 2023 | Jan 2026 |
| ncl-fbc-lymphocytosis | Lymphocytosis | NCL ICB | Jan 2023 | Jan 2026 |
| ncl-fbc-thrombocytosis | Thrombocytosis | NCL ICB | Jan 2023 | Jan 2026 |
| ncl-fbc-thrombocytopenia | Thrombocytopenia | NCL ICB | Jan 2023 | Jan 2026 |
| ncl-fbc-macrocytosis | Macrocytosis | NCL ICB | Jan 2023 | Jan 2026 |
| ncl-fbc-eosinophilia | Eosinophilia | NCL ICB | Jan 2023 | Jan 2026 |
| ncl-fbc-monocytosis | Monocytosis | NCL ICB | Jan 2023 | Jan 2026 |
| ncl-fbc-paraproteins | Paraproteins/Myeloma | NCL ICB | Jan 2023 | Jan 2026 |
| ncl-lft | Abnormal LFTs | NCL ICB | Feb 2023 | Feb 2026 |
| ncl-tft | Thyroid Function | NCL ICB | Feb 2019 | ⚠️ Feb 2022 OVERDUE |
| ncl-iron-deficiency | Iron Deficiency | NCL ICB | Aug 2022 | Aug 2025 |
| nwl-anaemia | Anaemia | NWL ICB | V1 Jul 2020 | 2021 |
