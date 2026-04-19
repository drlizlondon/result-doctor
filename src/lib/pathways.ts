export type PathwayCategory = "Anaemia & Iron" | "White Cells" | "Platelets" | "Serious Flags" | "Symptoms";

export type Pathway = {
  slug: string;
  name: string;
  plain: string;
  description: string;
  category: PathwayCategory;
  available: boolean;
};

export const pathways: Pathway[] = [
  {
    slug: "anaemia",
    name: "Anaemia Pathway",
    plain: "Low haemoglobin / low red blood cells",
    description: "Investigate low Hb with MCV and ferritin thresholds",
    category: "Anaemia & Iron",
    available: true,
  },
  { slug: "iron-deficiency", name: "Iron Deficiency Anaemia", plain: "Low iron stores", description: "Investigate and manage low ferritin", category: "Anaemia & Iron", available: false },
  { slug: "macrocytosis", name: "Macrocytosis", plain: "Large red blood cells", description: "Raised MCV investigation", category: "Anaemia & Iron", available: false },
  { slug: "b12-deficiency", name: "B12 Deficiency", plain: "Low vitamin B12", description: "Investigate low B12 levels", category: "Anaemia & Iron", available: false },
  { slug: "raised-b12", name: "Raised B12", plain: "High vitamin B12", description: "Workup for elevated B12", category: "Anaemia & Iron", available: false },
  { slug: "folate-deficiency", name: "Folate Deficiency", plain: "Low folate", description: "Manage low folate", category: "Anaemia & Iron", available: false },
  { slug: "haemoglobinopathies", name: "Haemoglobinopathies", plain: "Inherited Hb disorders", description: "Sickle, thalassaemia screening", category: "Anaemia & Iron", available: false },
  { slug: "haemochromatosis", name: "Haemochromatosis", plain: "Iron overload", description: "Investigate raised ferritin", category: "Anaemia & Iron", available: false },
  { slug: "erythrocytosis", name: "Erythrocytosis / Polycythaemia", plain: "Too many red cells", description: "Raised Hb / Hct workup", category: "Anaemia & Iron", available: false },
  { slug: "lymphocytosis", name: "Lymphocytosis", plain: "High lymphocytes", description: "Investigate raised lymphocytes", category: "White Cells", available: false },
  { slug: "thrombocytopenia", name: "Thrombocytopenia", plain: "Low platelets", description: "Investigate low platelet count", category: "Platelets", available: false },
  { slug: "thrombocytosis", name: "Thrombocytosis", plain: "High platelets", description: "Investigate raised platelets", category: "Platelets", available: false },
  { slug: "neutropenia", name: "Neutropenia", plain: "Low neutrophils", description: "Investigate low neutrophil count", category: "White Cells", available: false },
  { slug: "leucocytosis", name: "Leucocytosis", plain: "High white cells", description: "Investigate raised WCC", category: "White Cells", available: false },
  { slug: "paraproteinaemia", name: "Paraproteinaemia", plain: "Abnormal protein band", description: "Workup for monoclonal protein", category: "Serious Flags", available: false },
  { slug: "splenomegaly", name: "Splenomegaly", plain: "Enlarged spleen", description: "Investigate enlarged spleen", category: "Symptoms", available: false },
  { slug: "raised-esr", name: "Raised ESR", plain: "Inflammation marker high", description: "Investigate raised ESR", category: "Symptoms", available: false },
  { slug: "night-sweats", name: "Night Sweats", plain: "Drenching night sweats", description: "Workup for unexplained night sweats", category: "Symptoms", available: false },
  { slug: "lymphoma", name: "Suspected Lymphoma", plain: "Possible lymph node cancer", description: "Lymphadenopathy investigation", category: "Serious Flags", available: false },
  { slug: "abnormal-bleeding", name: "Abnormal Bleeding and Bruising", plain: "Easy bruising or bleeding", description: "Investigate bleeding tendency", category: "Serious Flags", available: false },
];

export const categories: Array<"All" | PathwayCategory> = [
  "All",
  "Anaemia & Iron",
  "White Cells",
  "Platelets",
  "Serious Flags",
  "Symptoms",
];
