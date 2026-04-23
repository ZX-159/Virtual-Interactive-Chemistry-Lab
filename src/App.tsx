import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "free" | "guided";
type Theme = "light" | "dark";

type EquipmentType =
  | "beaker"
  | "test_tube"
  | "flask"
  | "conical_flask"
  | "volumetric_flask"
  | "graduated_cylinder"
  | "burette"
  | "pipette"
  | "petri_dish"
  | "watch_glass"
  | "hot_plate"
  | "bunsen_burner"
  | "heating_mantle"
  | "water_bath"
  | "centrifuge"
  | "weighing_scale"
  | "thermometer"
  | "magnetic_stirrer"
  | "tripod_stand"
  | "ice_bath"
  | "reflux_condenser"
  | "separatory_funnel"
  | "reagent_bottle"
  | "dropper_bottle"
  | "gas_tank"
  | "match";

type EquipmentKind = "vessel" | "heater" | "analysis";

type ChemicalRole =
  | "acid"
  | "base"
  | "indicator"
  | "metal"
  | "salt"
  | "carbonate"
  | "solvent"
  | "alcohol"
  | "oxidizer"
  | "halide"
  | "gas"
  | "other";

type SolidForm = "pellets" | "cube" | "powder";
type EntryUnit = "mL" | "g";

type Chemical = {
  formula: string;
  name: string;
  role: ChemicalRole;
  state: "solid" | "liquid" | "gas";
  color: string;
  boilingPointC?: number;
  maxTempC?: number;
  molarity?: number;
  solidMolesPerGram?: number;
  acidEqPerMol?: number;
  baseEqPerMol?: number;
  strength?: number;
};

type ContentEntry = {
  formula: string;
  amount: number;
  unit: EntryUnit;
  form?: SolidForm;
};

type ChemicalProfile = {
  formula: string;
  name: string;
  type: ChemicalRole;
  ions: string[];
  state: Chemical["state"];
  cation?: string;
  anion?: string;
  acidEqPerMol: number;
  baseEqPerMol: number;
  strength: number;
  metalReactivity?: number;
  metalCharge?: number;
  solubility?: "soluble" | "insoluble" | "slightly";
  redoxTag?: "fe2" | "sn2" | "iodide" | "peroxide";
};

type ReactionPatternRule = {
  id: string;
  reactionType: string;
  reactants: Record<string, number>;
  equation: string;
  ionicEquation?: string;
  products: string[];
  deltaT: number;
  gas?: string;
  precipitate?: string;
  colorShift?: string;
  explanation: string[];
  requiresHeat?: boolean;
};

type ReactionResult = {
  id: string;
  reactionType: string;
  equation: string;
  balancedEquation: string;
  ionicEquation?: string;
  products: string[];
  explanation: string[];
  aiSummary?: string;
  limitingReagent: string;
  extentMol: number;
  deltaTempC: number;
  gas?: string;
  precipitate?: string;
  colorShift?: string;
  inferred?: boolean;
};

type OutputStages = {
  stage1: string[];
  stage2: string[];
  stage3: string[];
  stage4: string;
  stage5?: string[];
};

type VesselState = {
  color: string;
  pH: number;
  temperatureC: number;
  gasType: string | null;
  boilingCompounds: string[];
  smokeLevel: number;
  precipitateType: string | null;
  separated: boolean;
  heatLevel: number;
  reactions: ReactionResult[];
  lastReactionAt: number | null;
};

type EquipmentDef = {
  label: string;
  icon: string;
  kind: EquipmentKind;
  width: number;
  height: number;
  capacityMl?: number;
  heatPower?: number;
  maxTempC?: number;
  minTempC?: number;
  tempControlled?: boolean;
};

type PlacedEquipment = {
  id: string;
  type: EquipmentType;
  kind: EquipmentKind;
  x: number;
  y: number;
  width: number;
  height: number;
  capacityMl: number;
  attachedTo: string | null;
  measureTargetId: string | null;
  toolActive: boolean;
  toolLevel: number;
  sourceChemical: string | null;
  gasTargetId: string | null;
  contents: ContentEntry[];
  state: VesselState;
};

type ChemicalDropDraft = {
  formula: string;
  targetVesselId: string | null;
  x: number;
  y: number;
  amount: number;
  form: SolidForm;
};

type TelemetryPoint = {
  t: number;
  pH: number;
  temperatureC: number;
  acidEqM: number;
  baseEqM: number;
  ionicStrength: number;
};

type LabAirState = {
  composition: Record<string, number>;
  dominantGas: string | null;
  flammableIndex: number;
  ignitionPotential: number;
};

type Guide = {
  id: string;
  name: string;
  goal: string;
  steps: string[];
  setup: { equipment: EquipmentType; x: number; y: number; prefill?: ContentEntry[] }[];
};

type ChemicalSort = "formula_asc" | "formula_desc" | "name_asc" | "name_desc";
type RoleFilter = ChemicalRole | "all";

const CHEMICALS: Chemical[] = [
  { formula: "HCl", name: "Hydrochloric Acid", role: "acid", state: "liquid", color: "#dbeafe", maxTempC: 108, molarity: 1, acidEqPerMol: 1, strength: 1 },
  { formula: "H2SO4", name: "Sulfuric Acid", role: "acid", state: "liquid", color: "#c7d2fe", maxTempC: 337, molarity: 0.8, acidEqPerMol: 2, strength: 1 },
  { formula: "HNO3", name: "Nitric Acid", role: "acid", state: "liquid", color: "#dbeafe", maxTempC: 83, molarity: 0.8, acidEqPerMol: 1, strength: 1 },
  { formula: "CH3COOH", name: "Acetic Acid", role: "acid", state: "liquid", color: "#eff6ff", maxTempC: 118, molarity: 0.8, acidEqPerMol: 1, strength: 0.08 },
  { formula: "H3PO4", name: "Phosphoric Acid", role: "acid", state: "liquid", color: "#e2e8f0", molarity: 0.7, acidEqPerMol: 3, strength: 0.2 },
  { formula: "NaOH", name: "Sodium Hydroxide", role: "base", state: "liquid", color: "#e0f2fe", molarity: 1, baseEqPerMol: 1, strength: 1 },
  { formula: "KOH", name: "Potassium Hydroxide", role: "base", state: "liquid", color: "#dbeafe", molarity: 0.9, baseEqPerMol: 1, strength: 1 },
  { formula: "NH3", name: "Ammonia Solution", role: "base", state: "liquid", color: "#f0f9ff", molarity: 0.8, baseEqPerMol: 1, strength: 0.1 },
  { formula: "Ca(OH)2", name: "Calcium Hydroxide", role: "base", state: "liquid", color: "#ecfeff", molarity: 0.5, baseEqPerMol: 2, strength: 0.8 },
  { formula: "Na2CO3", name: "Sodium Carbonate", role: "carbonate", state: "liquid", color: "#f1f5f9", molarity: 0.7, baseEqPerMol: 2, strength: 0.7 },
  { formula: "NaHCO3", name: "Sodium Bicarbonate", role: "carbonate", state: "solid", color: "#f8fafc", solidMolesPerGram: 0.0119, baseEqPerMol: 1, strength: 0.5 },
  { formula: "Zn", name: "Zinc", role: "metal", state: "solid", color: "#cbd5e1", solidMolesPerGram: 0.0153 },
  { formula: "Mg", name: "Magnesium", role: "metal", state: "solid", color: "#e2e8f0", solidMolesPerGram: 0.0411 },
  { formula: "Fe", name: "Iron", role: "metal", state: "solid", color: "#94a3b8", solidMolesPerGram: 0.0179 },
  { formula: "Cu", name: "Copper", role: "metal", state: "solid", color: "#f59e0b", solidMolesPerGram: 0.0157 },
  { formula: "Al", name: "Aluminum", role: "metal", state: "solid", color: "#cbd5e1", solidMolesPerGram: 0.037 },
  { formula: "AgNO3", name: "Silver Nitrate", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.6 },
  { formula: "NaCl", name: "Sodium Chloride", role: "halide", state: "liquid", color: "#f8fafc", molarity: 1 },
  { formula: "KI", name: "Potassium Iodide", role: "halide", state: "liquid", color: "#fef9c3", molarity: 0.8 },
  { formula: "Pb(NO3)2", name: "Lead(II) Nitrate", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.5 },
  { formula: "CuSO4", name: "Copper(II) Sulfate", role: "salt", state: "liquid", color: "#60a5fa", molarity: 0.7 },
  { formula: "BaCl2", name: "Barium Chloride", role: "salt", state: "liquid", color: "#e2e8f0", molarity: 0.7 },
  { formula: "Na2SO4", name: "Sodium Sulfate", role: "salt", state: "liquid", color: "#f1f5f9", molarity: 0.8 },
  { formula: "FeCl3", name: "Iron(III) Chloride", role: "salt", state: "liquid", color: "#f59e0b", molarity: 0.5 },
  { formula: "KSCN", name: "Potassium Thiocyanate", role: "salt", state: "liquid", color: "#fee2e2", molarity: 0.5 },
  { formula: "KMnO4", name: "Potassium Permanganate", role: "oxidizer", state: "liquid", color: "#a855f7", molarity: 0.4 },
  { formula: "H2O2", name: "Hydrogen Peroxide", role: "oxidizer", state: "liquid", color: "#f8fafc", molarity: 0.5 },
  { formula: "K2Cr2O7", name: "Potassium Dichromate", role: "oxidizer", state: "liquid", color: "#f59e0b", molarity: 0.35 },
  { formula: "NaClO", name: "Sodium Hypochlorite", role: "oxidizer", state: "liquid", color: "#f8fafc", molarity: 0.45 },
  { formula: "MnO2", name: "Manganese Dioxide", role: "other", state: "solid", color: "#6b7280", solidMolesPerGram: 0.0115 },
  { formula: "CaCO3", name: "Calcium Carbonate", role: "carbonate", state: "solid", color: "#f8fafc", solidMolesPerGram: 0.01, baseEqPerMol: 2, strength: 0.35 },
  { formula: "KNO3", name: "Potassium Nitrate", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.7 },
  { formula: "NH4Cl", name: "Ammonium Chloride", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.7 },
  { formula: "Na2S2O3", name: "Sodium Thiosulfate", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.6 },
  { formula: "CaCl2", name: "Calcium Chloride", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.9 },
  { formula: "KBr", name: "Potassium Bromide", role: "halide", state: "liquid", color: "#f8fafc", molarity: 0.8 },
  { formula: "NaI", name: "Sodium Iodide", role: "halide", state: "liquid", color: "#fef9c3", molarity: 0.75 },
  { formula: "HBr", name: "Hydrobromic Acid", role: "acid", state: "liquid", color: "#dbeafe", molarity: 0.8, acidEqPerMol: 1, strength: 1 },
  { formula: "HF", name: "Hydrofluoric Acid", role: "acid", state: "liquid", color: "#e2e8f0", molarity: 0.6, acidEqPerMol: 1, strength: 0.12 },
  { formula: "LiOH", name: "Lithium Hydroxide", role: "base", state: "liquid", color: "#e0f2fe", molarity: 0.75, baseEqPerMol: 1, strength: 1 },
  { formula: "Na3PO4", name: "Sodium Phosphate", role: "base", state: "liquid", color: "#f1f5f9", molarity: 0.55, baseEqPerMol: 3, strength: 0.7 },
  { formula: "Sn", name: "Tin", role: "metal", state: "solid", color: "#94a3b8", solidMolesPerGram: 0.0084 },
  { formula: "Ni", name: "Nickel", role: "metal", state: "solid", color: "#9ca3af", solidMolesPerGram: 0.017 },
  { formula: "Cr", name: "Chromium", role: "metal", state: "solid", color: "#9aa3b2", solidMolesPerGram: 0.0192 },
  { formula: "Mn", name: "Manganese", role: "metal", state: "solid", color: "#8b95a1", solidMolesPerGram: 0.0182 },
  { formula: "Pb", name: "Lead", role: "metal", state: "solid", color: "#7b8794", solidMolesPerGram: 0.0048 },
  { formula: "C2H5OH", name: "Ethanol", role: "alcohol", state: "liquid", color: "#f8fafc", maxTempC: 78, molarity: 1 },
  { formula: "CH3OH", name: "Methanol", role: "alcohol", state: "liquid", color: "#f8fafc", maxTempC: 65, molarity: 1 },
  { formula: "C3H8O", name: "Isopropanol", role: "alcohol", state: "liquid", color: "#f8fafc", maxTempC: 82, molarity: 1 },
  { formula: "NaNO3", name: "Sodium Nitrate", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.8 },
  { formula: "KCl", name: "Potassium Chloride", role: "halide", state: "liquid", color: "#f8fafc", molarity: 0.85 },
  { formula: "CaSO4", name: "Calcium Sulfate", role: "salt", state: "solid", color: "#f1f5f9", solidMolesPerGram: 0.0073 },
  { formula: "H2CO3", name: "Carbonic Acid", role: "acid", state: "liquid", color: "#e2e8f0", molarity: 0.25, acidEqPerMol: 2, strength: 0.08 },
  { formula: "SrCl2", name: "Strontium Chloride", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.6 },
  { formula: "Na2CrO4", name: "Sodium Chromate", role: "salt", state: "liquid", color: "#fde047", molarity: 0.45 },
  { formula: "CoCl2", name: "Cobalt(II) Chloride", role: "salt", state: "liquid", color: "#fda4af", molarity: 0.5 },
  { formula: "ZnSO4", name: "Zinc Sulfate", role: "salt", state: "liquid", color: "#eef2ff", molarity: 0.6 },
  { formula: "MgSO4", name: "Magnesium Sulfate", role: "salt", state: "liquid", color: "#f1f5f9", molarity: 0.6 },
  { formula: "FeSO4", name: "Iron(II) Sulfate", role: "salt", state: "liquid", color: "#bbf7d0", molarity: 0.55 },
  { formula: "FeCl2", name: "Iron(II) Chloride", role: "salt", state: "liquid", color: "#d9f99d", molarity: 0.55 },
  { formula: "SnCl2", name: "Tin(II) Chloride", role: "salt", state: "liquid", color: "#e2e8f0", molarity: 0.45 },
  { formula: "CuCl2", name: "Copper(II) Chloride", role: "salt", state: "liquid", color: "#67e8f9", molarity: 0.55 },
  { formula: "AlCl3", name: "Aluminum Chloride", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.6 },
  { formula: "ZnCl2", name: "Zinc Chloride", role: "salt", state: "liquid", color: "#eef2ff", molarity: 0.6 },
  { formula: "Zn(OH)2", name: "Zinc Hydroxide", role: "base", state: "solid", color: "#f8fafc", solidMolesPerGram: 0.0102, baseEqPerMol: 2, strength: 0.2 },
  { formula: "Al(OH)3", name: "Aluminum Hydroxide", role: "base", state: "solid", color: "#f8fafc", solidMolesPerGram: 0.0128, baseEqPerMol: 3, strength: 0.2 },
  { formula: "K2SO4", name: "Potassium Sulfate", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.75 },
  { formula: "NaBr", name: "Sodium Bromide", role: "halide", state: "liquid", color: "#f8fafc", molarity: 0.8 },
  { formula: "Na2SO3", name: "Sodium Sulfite", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.65 },
  { formula: "Na2S", name: "Sodium Sulfide", role: "salt", state: "liquid", color: "#f1f5f9", molarity: 0.65 },
  { formula: "NH4NO3", name: "Ammonium Nitrate", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.8 },
  { formula: "CH3COONa", name: "Sodium Acetate", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.7 },
  { formula: "NaH2PO4", name: "Sodium Dihydrogen Phosphate", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.65 },
  { formula: "Na2HPO4", name: "Disodium Hydrogen Phosphate", role: "salt", state: "liquid", color: "#f8fafc", molarity: 0.65 },
  { formula: "Cu(NH3)4SO4", name: "Tetraamminecopper(II) Sulfate", role: "salt", state: "liquid", color: "#60a5fa", molarity: 0.4 },
  { formula: "AgCl", name: "Silver Chloride", role: "salt", state: "solid", color: "#f8fafc", solidMolesPerGram: 0.007 },
  { formula: "PbI2", name: "Lead(II) Iodide", role: "salt", state: "solid", color: "#facc15", solidMolesPerGram: 0.0022 },
  { formula: "CaF2", name: "Calcium Fluoride", role: "salt", state: "solid", color: "#f8fafc", solidMolesPerGram: 0.0128 },
  { formula: "NH4OH", name: "Ammonium Hydroxide", role: "base", state: "liquid", color: "#ecfeff", molarity: 0.55, baseEqPerMol: 1, strength: 0.1 },
  { formula: "HClO4", name: "Perchloric Acid", role: "acid", state: "liquid", color: "#dbeafe", molarity: 0.6, acidEqPerMol: 1, strength: 1 },
  { formula: "I2", name: "Iodine", role: "other", state: "solid", color: "#7c3aed", solidMolesPerGram: 0.0039 },
  { formula: "C20H14O4", name: "Phenolphthalein", role: "indicator", state: "liquid", color: "#f8fafc", molarity: 0.1 },
  { formula: "C14H14N3NaO3S", name: "Methyl Orange", role: "indicator", state: "liquid", color: "#fde68a", molarity: 0.1 },
  { formula: "C27H28Br2O5S", name: "Bromothymol Blue", role: "indicator", state: "liquid", color: "#fef3c7", molarity: 0.1 },
  { formula: "H2", name: "Hydrogen Gas", role: "gas", state: "gas", color: "#e2e8f0", molarity: 0.06, maxTempC: 900 },
  { formula: "O2", name: "Oxygen Gas", role: "gas", state: "gas", color: "#bae6fd", molarity: 0.08, maxTempC: 900 },
  { formula: "CO2", name: "Carbon Dioxide", role: "gas", state: "gas", color: "#cbd5e1", molarity: 0.07, maxTempC: 500 },
  { formula: "CH4", name: "Methane", role: "gas", state: "gas", color: "#e5e7eb", molarity: 0.05, maxTempC: 900 },
  { formula: "Cl2", name: "Chlorine Gas", role: "gas", state: "gas", color: "#d9f99d", molarity: 0.05, maxTempC: 350 },
  { formula: "H2O", name: "Water", role: "solvent", state: "liquid", color: "#bae6fd", maxTempC: 100, molarity: 0 },
];

const EQUIPMENT_DEFS: Record<EquipmentType, EquipmentDef> = {
  beaker: { label: "Beaker", icon: "BK", kind: "vessel", width: 154, height: 176, capacityMl: 250 },
  test_tube: { label: "Test Tube", icon: "TT", kind: "vessel", width: 84, height: 176, capacityMl: 90 },
  flask: { label: "Round Flask", icon: "RF", kind: "vessel", width: 150, height: 176, capacityMl: 200 },
  conical_flask: { label: "Conical Flask", icon: "CF", kind: "vessel", width: 150, height: 176, capacityMl: 220 },
  volumetric_flask: { label: "Volumetric Flask", icon: "VF", kind: "vessel", width: 150, height: 176, capacityMl: 250 },
  graduated_cylinder: { label: "Graduated Cylinder", icon: "GC", kind: "vessel", width: 90, height: 176, capacityMl: 160 },
  burette: { label: "Burette", icon: "BR", kind: "vessel", width: 70, height: 190, capacityMl: 120 },
  pipette: { label: "Pipette", icon: "PP", kind: "vessel", width: 86, height: 176, capacityMl: 40 },
  petri_dish: { label: "Petri Dish", icon: "PD", kind: "vessel", width: 150, height: 112, capacityMl: 55 },
  watch_glass: { label: "Watch Glass", icon: "WG", kind: "vessel", width: 138, height: 104, capacityMl: 35 },
  hot_plate: { label: "Hot Plate", icon: "HP", kind: "heater", width: 156, height: 94, heatPower: 26, maxTempC: 350, minTempC: 30, tempControlled: true },
  bunsen_burner: { label: "Bunsen Burner", icon: "BB", kind: "heater", width: 124, height: 120, heatPower: 34, maxTempC: 600 },
  heating_mantle: { label: "Heating Mantle", icon: "HM", kind: "heater", width: 168, height: 100, heatPower: 32, maxTempC: 450, minTempC: 35, tempControlled: true },
  water_bath: { label: "Water Bath", icon: "WB", kind: "heater", width: 170, height: 98, heatPower: 18, maxTempC: 100, minTempC: 20, tempControlled: true },
  centrifuge: { label: "Centrifuge", icon: "CE", kind: "analysis", width: 152, height: 106 },
  weighing_scale: { label: "Weighing Scale", icon: "WS", kind: "analysis", width: 160, height: 84 },
  thermometer: { label: "Digital Thermometer", icon: "TH", kind: "analysis", width: 164, height: 76 },
  magnetic_stirrer: { label: "Magnetic Stirrer", icon: "MS", kind: "analysis", width: 156, height: 82 },
  tripod_stand: { label: "Tripod Stand", icon: "TS", kind: "analysis", width: 154, height: 110 },
  ice_bath: { label: "Ice Bath", icon: "IB", kind: "heater", width: 168, height: 94, heatPower: -14, maxTempC: 5, minTempC: 0, tempControlled: true },
  reflux_condenser: { label: "Reflux Condenser", icon: "RC", kind: "analysis", width: 146, height: 188 },
  separatory_funnel: { label: "Separatory Funnel", icon: "SF", kind: "vessel", width: 132, height: 188, capacityMl: 180 },
  reagent_bottle: { label: "Reagent Bottle", icon: "RB", kind: "vessel", width: 140, height: 176, capacityMl: 250 },
  dropper_bottle: { label: "Dropper Bottle", icon: "DB", kind: "vessel", width: 116, height: 170, capacityMl: 80 },
  gas_tank: { label: "Pressurized Gas Tank", icon: "GT", kind: "analysis", width: 138, height: 188 },
  match: { label: "Lab Match", icon: "LM", kind: "analysis", width: 108, height: 78 },
};

const GUIDES: Guide[] = [
  {
    id: "neutralization",
    name: "Strong Neutralization",
    goal: "Observe pH approach neutral and exothermic response.",
    steps: ["Drop a beaker.", "Add 40 mL HCl.", "Add 40 mL NaOH."],
    setup: [{ equipment: "beaker", x: 80, y: 76, prefill: [{ formula: "HCl", amount: 40, unit: "mL" }] }],
  },
  {
    id: "indicator_transition",
    name: "Indicator Transition",
    goal: "Track methyl orange and phenolphthalein color zones.",
    steps: ["Use a conical flask.", "Add acid then base while indicators are present."],
    setup: [
      {
        equipment: "conical_flask",
        x: 90,
        y: 84,
        prefill: [
          { formula: "HCl", amount: 20, unit: "mL" },
          { formula: "C14H14N3NaO3S", amount: 4, unit: "mL" },
          { formula: "C20H14O4", amount: 4, unit: "mL" },
        ],
      },
    ],
  },
  {
    id: "metal_acid",
    name: "Metal + Acid Gas Evolution",
    goal: "Compare hydrogen evolution with Mg versus Zn.",
    steps: ["Place test tube.", "Add HCl.", "Add Mg pellets.", "Observe bubbles."],
    setup: [{ equipment: "test_tube", x: 120, y: 68, prefill: [{ formula: "HCl", amount: 28, unit: "mL" }] }],
  },
  {
    id: "precipitation_agcl",
    name: "Precipitation and Separation",
    goal: "Create AgCl and separate in centrifuge.",
    steps: ["Load AgNO3 and NaCl.", "Attach flask above centrifuge.", "Run centrifuge."],
    setup: [
      { equipment: "conical_flask", x: 90, y: 84, prefill: [{ formula: "AgNO3", amount: 30, unit: "mL" }] },
      { equipment: "centrifuge", x: 320, y: 432 },
    ],
  },
  {
    id: "esterification",
    name: "Heat-Driven Esterification",
    goal: "Heat acetic acid and ethanol to trigger esterification.",
    steps: ["Place round flask above hot plate.", "Add CH3COOH + C2H5OH.", "Turn heater above 55%."],
    setup: [
      {
        equipment: "flask",
        x: 88,
        y: 82,
        prefill: [
          { formula: "CH3COOH", amount: 24, unit: "mL" },
          { formula: "C2H5OH", amount: 24, unit: "mL" },
        ],
      },
      { equipment: "hot_plate", x: 320, y: 430 },
    ],
  },
  {
    id: "redox_permanganate",
    name: "Permanganate Redox",
    goal: "Observe oxidizer color fading and O2 evolution.",
    steps: ["Use beaker.", "Add KMnO4 + H2O2 + H2SO4.", "Track ionic strength and temperature."],
    setup: [
      {
        equipment: "beaker",
        x: 98,
        y: 72,
        prefill: [
          { formula: "KMnO4", amount: 18, unit: "mL" },
          { formula: "H2O2", amount: 28, unit: "mL" },
          { formula: "H2SO4", amount: 8, unit: "mL" },
        ],
      },
    ],
  },
];

const CHEMICAL_META: Record<string, Partial<ChemicalProfile>> = {
  HCl: { ions: ["H+", "Cl-"], cation: "H+", anion: "Cl-" },
  H2SO4: { ions: ["2H+", "SO4^2-"], cation: "H+", anion: "SO4^2-" },
  HNO3: { ions: ["H+", "NO3-"], cation: "H+", anion: "NO3-" },
  HBr: { ions: ["H+", "Br-"], cation: "H+", anion: "Br-" },
  HF: { ions: ["H+", "F-"], cation: "H+", anion: "F-" },
  HClO4: { ions: ["H+", "ClO4-"], cation: "H+", anion: "ClO4-" },
  CH3COOH: { ions: ["H+", "CH3COO-"], cation: "H+", anion: "CH3COO-" },
  H2CO3: { ions: ["2H+", "CO3^2-"], cation: "H+", anion: "CO3^2-" },
  NaOH: { ions: ["Na+", "OH-"], cation: "Na+", anion: "OH-" },
  KOH: { ions: ["K+", "OH-"], cation: "K+", anion: "OH-" },
  LiOH: { ions: ["Li+", "OH-"], cation: "Li+", anion: "OH-" },
  NH4OH: { ions: ["NH4+", "OH-"], cation: "NH4+", anion: "OH-" },
  "Ca(OH)2": { ions: ["Ca2+", "2OH-"], cation: "Ca2+", anion: "OH-" },
  Na2CO3: { ions: ["2Na+", "CO3^2-"], cation: "Na+", anion: "CO3^2-" },
  NaHCO3: { ions: ["Na+", "HCO3-"], cation: "Na+", anion: "HCO3-" },
  AgNO3: { ions: ["Ag+", "NO3-"], cation: "Ag+", anion: "NO3-" },
  NaCl: { ions: ["Na+", "Cl-"], cation: "Na+", anion: "Cl-" },
  KI: { ions: ["K+", "I-"], cation: "K+", anion: "I-", redoxTag: "iodide" },
  "Pb(NO3)2": { ions: ["Pb2+", "2NO3-"], cation: "Pb2+", anion: "NO3-" },
  CuSO4: { ions: ["Cu2+", "SO4^2-"], cation: "Cu2+", anion: "SO4^2-" },
  BaCl2: { ions: ["Ba2+", "2Cl-"], cation: "Ba2+", anion: "Cl-" },
  Na2SO4: { ions: ["2Na+", "SO4^2-"], cation: "Na+", anion: "SO4^2-" },
  KNO3: { ions: ["K+", "NO3-"], cation: "K+", anion: "NO3-" },
  CaCl2: { ions: ["Ca2+", "2Cl-"], cation: "Ca2+", anion: "Cl-" },
  KBr: { ions: ["K+", "Br-"], cation: "K+", anion: "Br-" },
  NaI: { ions: ["Na+", "I-"], cation: "Na+", anion: "I-" },
  KCl: { ions: ["K+", "Cl-"], cation: "K+", anion: "Cl-" },
  NaBr: { ions: ["Na+", "Br-"], cation: "Na+", anion: "Br-" },
  AlCl3: { ions: ["Al3+", "3Cl-"], cation: "Al3+", anion: "Cl-" },
  ZnCl2: { ions: ["Zn2+", "2Cl-"], cation: "Zn2+", anion: "Cl-" },
  "Zn(OH)2": { ions: ["Zn2+", "2OH-"], cation: "Zn2+", anion: "OH-" },
  "Al(OH)3": { ions: ["Al3+", "3OH-"], cation: "Al3+", anion: "OH-" },
  Na2SO3: { ions: ["2Na+", "SO3^2-"], cation: "Na+", anion: "SO3^2-" },
  Na2S: { ions: ["2Na+", "S^2-"], cation: "Na+", anion: "S^2-" },
  NH4NO3: { ions: ["NH4+", "NO3-"], cation: "NH4+", anion: "NO3-" },
  CH3COONa: { ions: ["Na+", "CH3COO-"], cation: "Na+", anion: "CH3COO-" },
  NaH2PO4: { ions: ["Na+", "H2PO4-"], cation: "Na+", anion: "H2PO4-" },
  Na2HPO4: { ions: ["2Na+", "HPO4^2-"], cation: "Na+", anion: "HPO4^2-" },
  "Cu(NH3)4SO4": { ions: ["Cu(NH3)4^2+", "SO4^2-"], cation: "Cu(NH3)4^2+", anion: "SO4^2-" },
  AgCl: { ions: ["Ag+", "Cl-"], cation: "Ag+", anion: "Cl-", solubility: "insoluble" },
  PbI2: { ions: ["Pb2+", "2I-"], cation: "Pb2+", anion: "I-", solubility: "insoluble" },
  CaF2: { ions: ["Ca2+", "2F-"], cation: "Ca2+", anion: "F-", solubility: "insoluble" },
  FeSO4: { ions: ["Fe2+", "SO4^2-"], cation: "Fe2+", anion: "SO4^2-", redoxTag: "fe2" },
  FeCl2: { ions: ["Fe2+", "2Cl-"], cation: "Fe2+", anion: "Cl-", redoxTag: "fe2" },
  SnCl2: { ions: ["Sn2+", "2Cl-"], cation: "Sn2+", anion: "Cl-", redoxTag: "sn2" },
  H3PO4: { ions: ["3H+", "PO4^3-"], cation: "H+", anion: "PO4^3-" },
  NH3: { ions: ["NH4+", "OH-"], cation: "NH4+", anion: "OH-" },
  FeCl3: { ions: ["Fe3+", "3Cl-"], cation: "Fe3+", anion: "Cl-" },
  KSCN: { ions: ["K+", "SCN-"], cation: "K+", anion: "SCN-" },
  KMnO4: { ions: ["K+", "MnO4-"], cation: "K+", anion: "MnO4-" },
  K2Cr2O7: { ions: ["2K+", "Cr2O7^2-"], cation: "K+", anion: "Cr2O7^2-" },
  NaClO: { ions: ["Na+", "ClO-"], cation: "Na+", anion: "ClO-" },
  MnO2: { ions: ["Mn4+", "2O^2-"], cation: "Mn4+", anion: "O^2-" },
  CaCO3: { ions: ["Ca2+", "CO3^2-"], cation: "Ca2+", anion: "CO3^2-" },
  NH4Cl: { ions: ["NH4+", "Cl-"], cation: "NH4+", anion: "Cl-" },
  Na2S2O3: { ions: ["2Na+", "S2O3^2-"], cation: "Na+", anion: "S2O3^2-" },
  Na3PO4: { ions: ["3Na+", "PO4^3-"], cation: "Na+", anion: "PO4^3-" },
  NaNO3: { ions: ["Na+", "NO3-"], cation: "Na+", anion: "NO3-" },
  CaSO4: { ions: ["Ca2+", "SO4^2-"], cation: "Ca2+", anion: "SO4^2-" },
  SrCl2: { ions: ["Sr2+", "2Cl-"], cation: "Sr2+", anion: "Cl-" },
  Na2CrO4: { ions: ["2Na+", "CrO4^2-"], cation: "Na+", anion: "CrO4^2-" },
  CoCl2: { ions: ["Co2+", "2Cl-"], cation: "Co2+", anion: "Cl-" },
  MgSO4: { ions: ["Mg2+", "SO4^2-"], cation: "Mg2+", anion: "SO4^2-" },
  K2SO4: { ions: ["2K+", "SO4^2-"], cation: "K+", anion: "SO4^2-" },
  I2: { ions: ["I2"], cation: "I2" },
  C20H14O4: { ions: ["H+", "C20H13O4-"], cation: "H+", anion: "C20H13O4-" },
  C14H14N3NaO3S: { ions: ["Na+", "C14H14N3O3S-"], cation: "Na+", anion: "C14H14N3O3S-" },
  C27H28Br2O5S: { ions: ["H+", "C27H27Br2O5S-"], cation: "H+", anion: "C27H27Br2O5S-" },
  C2H5OH: { ions: ["C2H5OH"], cation: "C2H5OH" },
  CH3OH: { ions: ["CH3OH"], cation: "CH3OH" },
  C3H8O: { ions: ["C3H8O"], cation: "C3H8O" },
  H2O: { ions: ["H+", "OH-"], cation: "H+", anion: "OH-" },
  H2: { ions: ["H2"], cation: "H2" },
  O2: { ions: ["O2"], cation: "O2" },
  CO2: { ions: ["CO2"], cation: "CO2" },
  CH4: { ions: ["CH4"], cation: "CH4" },
  Cl2: { ions: ["Cl2"], cation: "Cl2" },
  H2O2: { ions: ["H2O2"], redoxTag: "peroxide" },
  Zn: { ions: ["Zn2+"], cation: "Zn2+", metalReactivity: 7, metalCharge: 2 },
  Mg: { ions: ["Mg2+"], cation: "Mg2+", metalReactivity: 8, metalCharge: 2 },
  Fe: { ions: ["Fe2+"], cation: "Fe2+", metalReactivity: 5, metalCharge: 2 },
  Al: { ions: ["Al3+"], cation: "Al3+", metalReactivity: 6, metalCharge: 3 },
  Sn: { ions: ["Sn2+"], cation: "Sn2+", metalReactivity: 4, metalCharge: 2 },
  Mn: { ions: ["Mn2+"], cation: "Mn2+", metalReactivity: 6, metalCharge: 2 },
  Cr: { ions: ["Cr3+"], cation: "Cr3+", metalReactivity: 5, metalCharge: 3 },
  Ni: { ions: ["Ni2+"], cation: "Ni2+", metalReactivity: 3, metalCharge: 2 },
  Pb: { ions: ["Pb2+"], cation: "Pb2+", metalReactivity: 2, metalCharge: 2 },
  Cu: { ions: ["Cu2+"], cation: "Cu2+", metalReactivity: 0, metalCharge: 2 },
};

const SPECIAL_PATTERN_RULES: ReactionPatternRule[] = [
  {
    id: "esterification",
    reactionType: "Esterification",
    reactants: { CH3COOH: 1, C2H5OH: 1 },
    equation: "CH3COOH + C2H5OH -> CH3COOC2H5 + H2O",
    products: ["CH3COOC2H5(l)", "H2O(l)"],
    deltaT: -0.8,
    colorShift: "#fef3c7",
    requiresHeat: true,
    explanation: ["Heating drives esterification of acetic acid and ethanol in this model."],
  },
  {
    id: "permanganate_peroxide",
    reactionType: "Redox",
    reactants: { KMnO4: 2, H2O2: 5, H2SO4: 3 },
    equation: "2KMnO4 + 5H2O2 + 3H2SO4 -> K2SO4 + 2MnSO4 + 8H2O + 5O2",
    products: ["K2SO4(aq)", "MnSO4(aq)", "H2O(l)", "O2(g)"],
    deltaT: 2.6,
    gas: "O2",
    colorShift: "#f8fafc",
    explanation: ["Permanganate is reduced while peroxide is oxidized, releasing oxygen gas."],
  },
];

const DEFAULT_TELEMETRY: TelemetryPoint[] = [{ t: 0, pH: 7, temperatureC: 25, acidEqM: 0, baseEqM: 0, ionicStrength: 0 }];
const BASELINE_AIR_COMPOSITION: Record<string, number> = {
  N2: 78.08,
  O2: 20.95,
  Ar: 0.93,
  CO2: 0.04,
};
const AIR_TARGET_ID = "__air__";
const ROLES: RoleFilter[] = ["all", "acid", "base", "indicator", "metal", "salt", "carbonate", "halide", "oxidizer", "alcohol", "gas", "solvent", "other"];
const FLAMMABLE_GASES = new Set(["H2", "CH4"]);
const TEMP_CONTROLLED_TOOLS = new Set<EquipmentType>(["hot_plate", "heating_mantle", "water_bath", "ice_bath"]);

const getChemical = (formula: string) => CHEMICALS.find((c) => c.formula === formula);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const AMBIENT_TEMPERATURE_C = 25;

const BOILING_POINTS_C: Record<string, number> = {
  HCl: -85,
  H2SO4: 337,
  HNO3: 83,
  CH3COOH: 118.1,
  H3PO4: 158,
  NaOH: 1388,
  KOH: 1327,
  NH3: -33.3,
  Zn: 907,
  Mg: 1091,
  Fe: 2862,
  Cu: 2562,
  Al: 2470,
  NaCl: 1465,
  KI: 1330,
  BaCl2: 1560,
  FeCl3: 315,
  NH4Cl: 338,
  CaCl2: 1935,
  KBr: 1435,
  NaI: 1304,
  HBr: -66.8,
  HF: 19.5,
  Sn: 2602,
  Ni: 2913,
  Cr: 2672,
  Mn: 2061,
  Pb: 1749,
  C2H5OH: 78.4,
  CH3OH: 64.7,
  C3H8O: 82.6,
  KCl: 1420,
  SrCl2: 1250,
  CoCl2: 1049,
  CuCl2: 993,
  FeSO4: 680,
  FeCl2: 1023,
  SnCl2: 623,
  AlCl3: 180,
  ZnCl2: 732,
  "Zn(OH)2": 125,
  "Al(OH)3": 300,
  Na2SO3: 1429,
  Na2S: 1180,
  NH4NO3: 210,
  CH3COONa: 881,
  NaH2PO4: 100,
  Na2HPO4: 250,
  "Cu(NH3)4SO4": 150,
  AgCl: 1547,
  PbI2: 954,
  CaF2: 2500,
  I2: 184.3,
  K2SO4: 1689,
  NaBr: 1390,
  NH4OH: 38,
  HClO4: 203,
  H2: -252.9,
  O2: -183,
  CO2: -78.5,
  CH4: -161.5,
  Cl2: -34,
  H2O: 100,
};

const getBoilingPointC = (chemical: Chemical) => chemical.boilingPointC ?? BOILING_POINTS_C[chemical.formula];

const getChemicalMaxTemp = (chemical: Chemical) => {
  if (chemical.state === "gas") return chemical.maxTempC ?? 900;
  const boilingPoint = getBoilingPointC(chemical);
  if (chemical.state === "liquid" && typeof boilingPoint === "number") return boilingPoint;
  if (chemical.maxTempC) return chemical.maxTempC;
  if (chemical.state === "liquid") return 140;
  if (chemical.state === "solid") return 900;
  return 80;
};

const getMixtureMaxTemp = (contents: ContentEntry[]) => {
  if (!contents.length) return 120;
  return contents.reduce((minTemp, entry) => {
    const chemical = getChemical(entry.formula);
    if (!chemical) return minTemp;
    return Math.min(minTemp, getChemicalMaxTemp(chemical));
  }, 1200);
};

const createDefaultVesselState = (): VesselState => ({
  color: "#bfdbfe",
  pH: 7,
  temperatureC: AMBIENT_TEMPERATURE_C,
  gasType: null,
  boilingCompounds: [],
  smokeLevel: 0,
  precipitateType: null,
  separated: false,
  heatLevel: 0,
  reactions: [],
  lastReactionAt: null,
});

const sortChemicals = (items: Chemical[], sort: ChemicalSort) => {
  const next = [...items];
  next.sort((a, b) => {
    if (sort === "formula_asc") return a.formula.localeCompare(b.formula);
    if (sort === "formula_desc") return b.formula.localeCompare(a.formula);
    if (sort === "name_asc") return a.name.localeCompare(b.name);
    return b.name.localeCompare(a.name);
  });
  return next;
};

const toMoles = (entry: ContentEntry) => {
  const chem = getChemical(entry.formula);
  if (!chem) return 0;
  if (entry.unit === "mL") {
    return (chem.molarity ?? 0) * (entry.amount / 1000);
  }
  return (chem.solidMolesPerGram ?? 0) * entry.amount;
};

const effectiveLiquidVolumeMl = (entry: ContentEntry) => {
  if (entry.unit === "mL") return entry.amount;
  return entry.amount * 0.45;
};

const computeAcidBaseFromMoles = (remainingMoles: Record<string, number>, totalVolumeL: number) => {
  let acidEq = 0;
  let baseEq = 0;
  Object.entries(remainingMoles).forEach(([formula, mol]) => {
    const chem = getChemical(formula);
    if (!chem) return;
    acidEq += mol * (chem.acidEqPerMol ?? 0) * (chem.strength ?? 1);
    baseEq += mol * (chem.baseEqPerMol ?? 0) * (chem.strength ?? 1);
  });

  const net = acidEq - baseEq;
  const concentration = Math.abs(net) / Math.max(totalVolumeL, 0.001);
  let pH = 7;
  if (concentration > 1e-8) {
    pH = net > 0 ? -Math.log10(concentration) : 14 + Math.log10(concentration);
  }

  return {
    acidEq,
    baseEq,
    pH: Number(clamp(pH, 0, 14).toFixed(3)),
  };
};

const buildPassiveEquation = (contents: ContentEntry[]) => {
  const formulas = Array.from(new Set(contents.map((entry) => entry.formula)));
  if (formulas.length === 0) {
    return {
      equation: "No reactants present",
      products: ["No products"],
      description: "Add chemicals to begin a reaction simulation.",
      limitingReagent: "none",
    };
  }
  if (formulas.length === 1) {
    const single = formulas[0];
    return {
      equation: `${single} present in mixture state`,
      products: [`${single}(mixed)`],
      description: `${single} is present without a compatible reactant pair in the current rule set.`,
      limitingReagent: single,
    };
  }
  const reactants = formulas.join(" + ");
  return {
    equation: `${reactants} in mixed ionic state`,
    products: formulas.map((formula) => `${formula}(mixed)`),
    description: "No dominant transformation rule matched. The compounds remain as a mixture in this model.",
    limitingReagent: formulas[0],
  };
};

type EngineApplication = {
  reaction: ReactionResult;
  consume: Record<string, number>;
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

const formatTerm = (coeff: number, token: string) => (coeff === 1 ? token : `${coeff}${token}`);
const ionToken = (ion: string) => ion.replace(/^[0-9]+/, "").replace(/\^(\d+)?[+-]$/, "").replace(/[+-]$/, "");

const parseIonDescriptor = (rawIon: string) => {
  const trimmed = rawIon.replace(/^[0-9]+/, "").trim();
  const match = trimmed.match(/\^(\d+)?([+-])$|([+-])$/);
  if (!match) {
    return { core: trimmed, charge: 0 };
  }
  if (match[1] || match[2]) {
    const magnitude = Number(match[1] || "1");
    const sign = match[2] === "+" ? 1 : -1;
    return { core: trimmed.replace(/\^(\d+)?[+-]$/, ""), charge: magnitude * sign };
  }
  const sign = match[3] === "+" ? 1 : -1;
  return { core: trimmed.replace(/[+-]$/, ""), charge: sign };
};

const formatIonGroup = (core: string, count: number) => {
  if (count === 1) return core;
  const needsParens = core.includes("(") || core.includes(")") || /[A-Z].*[A-Z]/.test(core);
  return `${needsParens ? `(${core})` : core}${count}`;
};

const getChemicalProfile = (formula: string): ChemicalProfile | null => {
  const chemical = getChemical(formula);
  if (!chemical) return null;
  const meta = CHEMICAL_META[formula] ?? {};
  const inferredIons = chemical.role === "acid" ? ["H+", `${formula}-`] : chemical.role === "base" ? ["M+", "OH-"] : [formula];
  return {
    formula: chemical.formula,
    name: chemical.name,
    type: chemical.role,
    ions: meta.ions ?? inferredIons,
    state: chemical.state,
    cation: meta.cation,
    anion: meta.anion,
    acidEqPerMol: chemical.acidEqPerMol ?? 0,
    baseEqPerMol: chemical.baseEqPerMol ?? 0,
    strength: chemical.strength ?? 1,
    metalReactivity: meta.metalReactivity,
    metalCharge: meta.metalCharge,
    solubility: meta.solubility,
    redoxTag: meta.redoxTag,
  };
};

const buildSaltFormula = (cation?: string, anion?: string) => {
  if (!cation || !anion) return "Salt";
  const key = `${cation}|${anion}`;
  if (SALT_FORMULA_OVERRIDES[key]) return SALT_FORMULA_OVERRIDES[key];
  const cat = parseIonDescriptor(cation);
  const an = parseIonDescriptor(anion);
  if (cat.charge === 0 || an.charge === 0) return `${ionToken(cation)}${ionToken(anion)}`;
  const catCount = Math.max(1, Math.abs(an.charge));
  const anCount = Math.max(1, Math.abs(cat.charge));
  return `${formatIonGroup(cat.core, catCount)}${formatIonGroup(an.core, anCount)}`;
};

const SALT_FORMULA_OVERRIDES: Record<string, string> = {
  "Na+|Cl-": "NaCl",
  "K+|SO4^2-": "K2SO4",
  "Ca2+|NO3-": "Ca(NO3)2",
  "Zn2+|Cl-": "ZnCl2",
  "Mg2+|SO4^2-": "MgSO4",
  "Fe2+|Cl-": "FeCl2",
  "Fe3+|NO3-": "Fe(NO3)3",
  "Al3+|Cl-": "AlCl3",
  "Zn2+|SO4^2-": "ZnSO4",
  "NH4+|CH3COO-": "NH4CH3COO",
  "Cu2+|Cl-": "CuCl2",
  "Na+|CH3COO-": "CH3COONa",
  "Ag+|Cl-": "AgCl",
  "Pb2+|I-": "PbI2",
  "Ba2+|SO4^2-": "BaSO4",
  "Ca2+|CO3^2-": "CaCO3",
  "Cu(NH3)4^2+|SO4^2-": "Cu(NH3)4SO4",
};

const ION_TO_METAL_FORMULA: Record<string, string> = {
  "Ag+": "Ag",
  "Cu2+": "Cu",
  "Fe2+": "Fe",
  "Fe3+": "Fe",
  "Al3+": "Al",
  "Zn2+": "Zn",
  "Mg2+": "Mg",
  "Pb2+": "Pb",
  "Sn2+": "Sn",
  "Ni2+": "Ni",
};

const NEUTRALIZATION_SALT_ONLY_BASES = new Set(["NH3"]);

const PRECIPITATE_FORMULAS: Record<string, string> = {
  "Ag+|Cl-": "AgCl",
  "Cu2+|OH-": "Cu(OH)2",
  "Pb2+|I-": "PbI2",
  "Ba2+|SO4^2-": "BaSO4",
  "Ca2+|CO3^2-": "CaCO3",
};

const isInsolublePair = (cation?: string, anion?: string) => {
  if (!cation || !anion) return false;
  const solubleCations = new Set(["Na+", "K+", "Li+", "NH4+"]);
  if (solubleCations.has(cation)) return false;
  if (["NO3-", "ClO4-", "CH3COO-"].includes(anion)) return false;
  if (["Cl-", "Br-", "I-"].includes(anion) && ["Ag+", "Pb2+"].includes(cation)) return true;
  if (anion === "SO4^2-" && ["Ba2+", "Pb2+", "Ca2+"].includes(cation)) return true;
  if (anion === "OH-" && !["Na+", "K+", "Li+", "NH4+", "Ca2+"].includes(cation)) return true;
  if (["CO3^2-", "HCO3-"].includes(anion) && !["Na+", "K+", "Li+", "NH4+"].includes(cation)) return true;
  return false;
};

const getReactiveProfiles = (moles: Record<string, number>) =>
  Object.entries(moles)
    .filter(([, mol]) => mol > 0.00001)
    .map(([formula]) => getChemicalProfile(formula))
    .filter((profile): profile is ChemicalProfile => Boolean(profile));

const applySpecialPatternRule = (
  moles: Record<string, number>,
  thermal: { heatPower: number }
): EngineApplication | null => {
  for (const rule of SPECIAL_PATTERN_RULES) {
    if (rule.requiresHeat && thermal.heatPower < 9) continue;
    const extents = Object.entries(rule.reactants).map(([formula, coeff]) => (moles[formula] ?? 0) / coeff);
    const extentMol = Math.min(...extents);
    if (!Number.isFinite(extentMol) || extentMol < 0.00001) continue;
    const limitingIndex = extents.findIndex((value) => value === extentMol);
    const limitingReagent = Object.keys(rule.reactants)[Math.max(0, limitingIndex)] ?? "unknown";
    const consume: Record<string, number> = {};
    Object.entries(rule.reactants).forEach(([formula, coeff]) => {
      consume[formula] = coeff * extentMol;
    });
    return {
      consume,
      reaction: {
        id: `${rule.id}_${Date.now()}`,
        reactionType: rule.reactionType,
        equation: rule.equation,
        balancedEquation: rule.equation,
        ionicEquation: rule.ionicEquation,
        products: rule.products,
        explanation: rule.explanation,
        aiSummary: `${rule.reactionType}: ${rule.explanation.join(" ")}`,
        limitingReagent,
        extentMol: Number(extentMol.toFixed(4)),
        deltaTempC: Number((rule.deltaT * extentMol * 11.4).toFixed(2)),
        gas: rule.gas,
        precipitate: rule.precipitate,
        colorShift: rule.colorShift,
      },
    };
  }
  return null;
};

const applyAcidBaseRule = (moles: Record<string, number>): EngineApplication | null => {
  const profiles = getReactiveProfiles(moles);
  const acids = profiles.filter((profile) => profile.type === "acid").sort((a, b) => (moles[b.formula] ?? 0) - (moles[a.formula] ?? 0));
  const bases = profiles.filter((profile) => profile.type === "base").sort((a, b) => (moles[b.formula] ?? 0) - (moles[a.formula] ?? 0));
  const acid = acids[0];
  const base = bases[0];
  if (!acid || !base) return null;
  const acidEq = Math.max(1, Math.round(acid.acidEqPerMol || 1));
  const baseEq = Math.max(1, Math.round(base.baseEqPerMol || 1));
  const neutralEq = lcm(acidEq, baseEq);
  const acidCoeff = neutralEq / acidEq;
  const baseCoeff = neutralEq / baseEq;
  const extentMol = Math.min((moles[acid.formula] ?? 0) / acidCoeff, (moles[base.formula] ?? 0) / baseCoeff);
  if (!Number.isFinite(extentMol) || extentMol < 0.00001) return null;
  const waterCoeff = NEUTRALIZATION_SALT_ONLY_BASES.has(base.formula) ? 0 : neutralEq;
  const salt = buildSaltFormula(base.cation, acid.anion);
  const equationProducts = waterCoeff > 0 ? `${salt} + H2O` : salt;
  const balancedProducts = waterCoeff > 0 ? `${formatTerm(acidCoeff, salt)} + ${formatTerm(waterCoeff, "H2O")}` : `${formatTerm(acidCoeff, salt)}`;
  return {
    consume: {
      [acid.formula]: acidCoeff * extentMol,
      [base.formula]: baseCoeff * extentMol,
    },
    reaction: {
      id: `neutralization_${acid.formula}_${base.formula}_${Date.now()}`,
      reactionType: "Neutralization",
      equation: `${acid.formula} + ${base.formula} -> ${equationProducts}`,
      balancedEquation: `${formatTerm(acidCoeff, acid.formula)} + ${formatTerm(baseCoeff, base.formula)} -> ${balancedProducts}`,
      ionicEquation: waterCoeff > 0 ? `${formatTerm(neutralEq, "H+")} + ${formatTerm(neutralEq, "OH-")} -> ${formatTerm(neutralEq, "H2O")}` : `${acid.formula} + ${base.formula} -> ${salt}`,
      products: waterCoeff > 0 ? [`${salt}(aq)`, "H2O(l)"] : [`${salt}(aq)`],
      explanation: [waterCoeff > 0 ? "Acidic and basic equivalents neutralize to form water and dissolved salt." : "Weak base ammonia accepts proton to form ammonium salt in this model."],
      aiSummary: "Rule match: acid + base neutralization based on acidic/basic equivalent counts.",
      limitingReagent: (moles[acid.formula] ?? 0) / acidCoeff <= (moles[base.formula] ?? 0) / baseCoeff ? acid.formula : base.formula,
      extentMol: Number(extentMol.toFixed(4)),
      deltaTempC: Number((3.9 * extentMol * 11.4).toFixed(2)),
    },
  };
};

const applyAcidMetalRule = (moles: Record<string, number>): EngineApplication | null => {
  const profiles = getReactiveProfiles(moles);
  const acids = profiles.filter((profile) => profile.type === "acid");
  const metals = profiles
    .filter((profile) => profile.type === "metal" && (profile.metalReactivity ?? 0) > 0)
    .sort((a, b) => (b.metalReactivity ?? 0) - (a.metalReactivity ?? 0));
  const acid = acids[0];
  const metal = metals[0];
  if (!acid || !metal) return null;
  const acidEq = Math.max(1, Math.round(acid.acidEqPerMol || 1));
  const acidCoeff = Math.max(1, Math.ceil(2 / acidEq));
  const extentMol = Math.min(moles[metal.formula] ?? 0, (moles[acid.formula] ?? 0) / acidCoeff);
  if (!Number.isFinite(extentMol) || extentMol < 0.00001) return null;
  const salt = buildSaltFormula(metal.cation, acid.anion);
  return {
    consume: {
      [metal.formula]: extentMol,
      [acid.formula]: acidCoeff * extentMol,
    },
    reaction: {
      id: `metal_acid_${metal.formula}_${acid.formula}_${Date.now()}`,
      reactionType: "Single Displacement",
      equation: `${metal.formula} + ${acid.formula} -> ${salt} + H2`,
      balancedEquation: `${metal.formula} + ${formatTerm(acidCoeff, acid.formula)} -> ${salt} + H2`,
      ionicEquation: `${metal.formula} + 2H+ -> ${ionToken(metal.cation ?? metal.formula)}2+ + H2`,
      products: [`${salt}(aq)`, "H2(g)"],
      explanation: ["Reactive metal displaces hydrogen from acid, generating hydrogen gas."],
      aiSummary: "Rule match: acid + metal displacement based on metal reactivity and available acid.",
      limitingReagent: (moles[metal.formula] ?? 0) <= (moles[acid.formula] ?? 0) / acidCoeff ? metal.formula : acid.formula,
      extentMol: Number(extentMol.toFixed(4)),
      deltaTempC: Number(((2.2 + (metal.metalReactivity ?? 0) * 0.22) * extentMol * 11.4).toFixed(2)),
      gas: "H2",
    },
  };
};

const applyAcidCarbonateRule = (moles: Record<string, number>): EngineApplication | null => {
  const profiles = getReactiveProfiles(moles);
  const acids = profiles.filter((profile) => profile.type === "acid");
  const carbonates = profiles.filter((profile) => profile.type === "carbonate");
  const acid = acids[0];
  const carbonate = carbonates[0];
  if (!acid || !carbonate) return null;
  const acidEq = Math.max(1, Math.round(acid.acidEqPerMol || 1));
  const carbonateEq = Math.max(1, Math.round(carbonate.baseEqPerMol || 2));
  const acidCoeff = Math.max(1, Math.ceil(carbonateEq / acidEq));
  const extentMol = Math.min(moles[carbonate.formula] ?? 0, (moles[acid.formula] ?? 0) / acidCoeff);
  if (!Number.isFinite(extentMol) || extentMol < 0.00001) return null;
  const salt = buildSaltFormula(carbonate.cation, acid.anion);
  return {
    consume: {
      [carbonate.formula]: extentMol,
      [acid.formula]: acidCoeff * extentMol,
    },
    reaction: {
      id: `carbonate_acid_${carbonate.formula}_${acid.formula}_${Date.now()}`,
      reactionType: "Gas Evolution",
      equation: `${carbonate.formula} + ${acid.formula} -> ${salt} + H2O + CO2`,
      balancedEquation: `${carbonate.formula} + ${formatTerm(acidCoeff, acid.formula)} -> ${salt} + H2O + CO2`,
      products: [`${salt}(aq)`, "H2O(l)", "CO2(g)"],
      explanation: ["Carbonate species consume acid and release carbon dioxide gas."],
      aiSummary: "Rule match: carbonate + acid pathway with carbon dioxide evolution.",
      limitingReagent: (moles[carbonate.formula] ?? 0) <= (moles[acid.formula] ?? 0) / acidCoeff ? carbonate.formula : acid.formula,
      extentMol: Number(extentMol.toFixed(4)),
      deltaTempC: Number((1.1 * extentMol * 11.4).toFixed(2)),
      gas: "CO2",
    },
  };
};

const applyGasFormationRule = (moles: Record<string, number>): EngineApplication | null => {
  const profiles = getReactiveProfiles(moles);
  const acids = profiles.filter((profile) => profile.type === "acid");
  const hydroxides = profiles.filter((profile) => profile.anion === "OH-");
  const ammonium = profiles.filter((profile) => profile.cation === "NH4+");
  const sulfites = profiles.filter((profile) => profile.anion === "SO3^2-");
  const sulfides = profiles.filter((profile) => profile.anion === "S^2-");

  if (ammonium.length && hydroxides.length) {
    const left = ammonium[0];
    const right = hydroxides[0];
    const extentMol = Math.min(moles[left.formula] ?? 0, moles[right.formula] ?? 0);
    if (extentMol > 0.00001) {
      const spectatorSalt = buildSaltFormula(right.cation, left.anion);
      return {
        consume: { [left.formula]: extentMol, [right.formula]: extentMol },
        reaction: {
          id: `nh4_oh_${Date.now()}`,
          reactionType: "Gas Evolution",
          equation: `${left.formula} + ${right.formula} -> NH3 + H2O + ${spectatorSalt}`,
          balancedEquation: `${left.formula} + ${right.formula} -> NH3 + H2O + ${spectatorSalt}`,
          ionicEquation: "NH4+ + OH- -> NH3 + H2O",
          products: ["NH3(g)", "H2O(l)", `${spectatorSalt}(aq)`],
          explanation: ["Ammonium and hydroxide ions generate ammonia gas."],
          aiSummary: "Rule match: NH4+ with OH- gives NH3 gas evolution.",
          limitingReagent: (moles[left.formula] ?? 0) <= (moles[right.formula] ?? 0) ? left.formula : right.formula,
          extentMol: Number(extentMol.toFixed(4)),
          deltaTempC: Number((0.9 * extentMol * 11.4).toFixed(2)),
          gas: "NH3",
        },
      };
    }
  }

  if (acids.length && sulfites.length) {
    const acid = acids[0];
    const sulfite = sulfites[0];
    const extentMol = Math.min(moles[acid.formula] ?? 0, moles[sulfite.formula] ?? 0);
    if (extentMol > 0.00001) {
      const salt = buildSaltFormula(sulfite.cation, acid.anion);
      return {
        consume: { [acid.formula]: extentMol, [sulfite.formula]: extentMol },
        reaction: {
          id: `sulfite_acid_${Date.now()}`,
          reactionType: "Gas Evolution",
          equation: `${sulfite.formula} + ${acid.formula} -> ${salt} + SO2 + H2O`,
          balancedEquation: `${sulfite.formula} + ${acid.formula} -> ${salt} + SO2 + H2O`,
          products: [`${salt}(aq)`, "SO2(g)", "H2O(l)"],
          explanation: ["Sulfite anions release sulfur dioxide in acidic conditions."],
          aiSummary: "Rule match: acid + sulfite gives SO2 gas.",
          limitingReagent: (moles[acid.formula] ?? 0) <= (moles[sulfite.formula] ?? 0) ? acid.formula : sulfite.formula,
          extentMol: Number(extentMol.toFixed(4)),
          deltaTempC: Number((0.8 * extentMol * 11.4).toFixed(2)),
          gas: "SO2",
        },
      };
    }
  }

  if (acids.length && sulfides.length) {
    const acid = acids[0];
    const sulfide = sulfides[0];
    const extentMol = Math.min(moles[acid.formula] ?? 0, moles[sulfide.formula] ?? 0);
    if (extentMol > 0.00001) {
      const salt = buildSaltFormula(sulfide.cation, acid.anion);
      return {
        consume: { [acid.formula]: extentMol, [sulfide.formula]: extentMol },
        reaction: {
          id: `sulfide_acid_${Date.now()}`,
          reactionType: "Gas Evolution",
          equation: `${sulfide.formula} + ${acid.formula} -> ${salt} + H2S`,
          balancedEquation: `${sulfide.formula} + ${acid.formula} -> ${salt} + H2S`,
          products: [`${salt}(aq)`, "H2S(g)"],
          explanation: ["Sulfide ions react with acids to release hydrogen sulfide gas."],
          aiSummary: "Rule match: acid + sulfide gives H2S gas.",
          limitingReagent: (moles[acid.formula] ?? 0) <= (moles[sulfide.formula] ?? 0) ? acid.formula : sulfide.formula,
          extentMol: Number(extentMol.toFixed(4)),
          deltaTempC: Number((0.8 * extentMol * 11.4).toFixed(2)),
          gas: "H2S",
        },
      };
    }
  }

  return null;
};

const applySingleDisplacementRule = (moles: Record<string, number>): EngineApplication | null => {
  const profiles = getReactiveProfiles(moles);
  const metals = profiles.filter((profile) => profile.type === "metal" && typeof profile.metalReactivity === "number");
  const salts = profiles.filter((profile) => profile.type === "salt" || profile.type === "halide");
  for (const metal of metals) {
    for (const salt of salts) {
      const displacedMetal = ION_TO_METAL_FORMULA[salt.cation ?? ""];
      const displacedProfile = displacedMetal ? getChemicalProfile(displacedMetal) : null;
      if (!displacedMetal || !displacedProfile || displacedMetal === metal.formula) continue;
      if ((metal.metalReactivity ?? 0) <= (displacedProfile.metalReactivity ?? 0)) continue;
      const extentMol = Math.min(moles[metal.formula] ?? 0, moles[salt.formula] ?? 0);
      if (extentMol < 0.00001) continue;
      const newSalt = buildSaltFormula(metal.cation, salt.anion);
      return {
        consume: { [metal.formula]: extentMol, [salt.formula]: extentMol },
        reaction: {
          id: `single_disp_${metal.formula}_${salt.formula}_${Date.now()}`,
          reactionType: "Single Displacement",
          equation: `${metal.formula} + ${salt.formula} -> ${newSalt} + ${displacedMetal}`,
          balancedEquation: `${metal.formula} + ${salt.formula} -> ${newSalt} + ${displacedMetal}`,
          ionicEquation: `${metal.formula} + ${salt.cation} -> ${metal.cation} + ${displacedMetal}`,
          products: [`${newSalt}(aq)`, `${displacedMetal}(s)`],
          explanation: ["A more reactive metal displaced a less reactive metal ion from solution."],
          aiSummary: "Rule match: activity-series single displacement.",
          limitingReagent: (moles[metal.formula] ?? 0) <= (moles[salt.formula] ?? 0) ? metal.formula : salt.formula,
          extentMol: Number(extentMol.toFixed(4)),
          deltaTempC: Number((1.4 * extentMol * 11.4).toFixed(2)),
        },
      };
    }
  }
  return null;
};

const applyComplexIonRule = (moles: Record<string, number>): EngineApplication | null => {
  const profiles = getReactiveProfiles(moles);
  const hasAmmonia = (moles.NH3 ?? 0) > 0.00001;
  if (!hasAmmonia) return null;
  const cu2Source = profiles.find((profile) => profile.cation === "Cu2+");
  if (cu2Source) {
    const extentMol = Math.min((moles[cu2Source.formula] ?? 0), (moles.NH3 ?? 0) / 4);
    if (extentMol > 0.00001) {
      const complex = buildSaltFormula("Cu(NH3)4^2+", cu2Source.anion);
      return {
        consume: { [cu2Source.formula]: extentMol, NH3: extentMol * 4 },
        reaction: {
          id: `complex_cu_nh3_${Date.now()}`,
          reactionType: "Complex Formation",
          equation: `${cu2Source.formula} + 4NH3 -> ${complex}`,
          balancedEquation: `${cu2Source.formula} + 4NH3 -> ${complex}`,
          ionicEquation: "Cu2+ + 4NH3 -> [Cu(NH3)4]2+",
          products: [`${complex}(aq)`],
          explanation: ["Ammonia ligands coordinate with Cu2+ to form a soluble deep-blue complex."],
          aiSummary: "Rule match: ligand complexation of copper(II) by ammonia.",
          limitingReagent: (moles[cu2Source.formula] ?? 0) <= (moles.NH3 ?? 0) / 4 ? cu2Source.formula : "NH3",
          extentMol: Number(extentMol.toFixed(4)),
          deltaTempC: Number((0.4 * extentMol * 11.4).toFixed(2)),
          colorShift: "#2563eb",
        },
      };
    }
  }

  if ((moles.AgCl ?? 0) > 0.00001) {
    const extentMol = Math.min(moles.AgCl ?? 0, (moles.NH3 ?? 0) / 2);
    if (extentMol > 0.00001) {
      return {
        consume: { AgCl: extentMol, NH3: extentMol * 2 },
        reaction: {
          id: `complex_agcl_nh3_${Date.now()}`,
          reactionType: "Complex Formation",
          equation: "AgCl + 2NH3 -> [Ag(NH3)2]+ + Cl-",
          balancedEquation: "AgCl + 2NH3 -> [Ag(NH3)2]+ + Cl-",
          ionicEquation: "AgCl(s) + 2NH3 -> [Ag(NH3)2]+ + Cl-",
          products: ["[Ag(NH3)2]+(aq)", "Cl-(aq)"],
          explanation: ["Ammonia dissolves AgCl by forming a silver-ammine complex."],
          aiSummary: "Rule match: complex ion formation shifts AgCl dissolution equilibrium.",
          limitingReagent: (moles.AgCl ?? 0) <= (moles.NH3 ?? 0) / 2 ? "AgCl" : "NH3",
          extentMol: Number(extentMol.toFixed(4)),
          deltaTempC: Number((0.2 * extentMol * 11.4).toFixed(2)),
        },
      };
    }
  }
  return null;
};

const applyRedoxRule = (moles: Record<string, number>): EngineApplication | null => {
  const hasFe2 = (moles.FeSO4 ?? 0) + (moles.FeCl2 ?? 0);
  if ((moles.KMnO4 ?? 0) > 0.00001 && hasFe2 > 0.00001) {
    const feSource = (moles.FeSO4 ?? 0) >= (moles.FeCl2 ?? 0) ? "FeSO4" : "FeCl2";
    const extentMol = Math.min((moles.KMnO4 ?? 0) / 1, hasFe2 / 5);
    if (extentMol > 0.00001) {
      return {
        consume: { KMnO4: extentMol, [feSource]: extentMol * 5 },
        reaction: {
          id: `redox_mno4_fe2_${Date.now()}`,
          reactionType: "Redox",
          equation: "KMnO4 + 5Fe2+ + 8H+ -> Mn2+ + 5Fe3+ + 4H2O",
          balancedEquation: "KMnO4 + 5Fe2+ + 8H+ -> Mn2+ + 5Fe3+ + 4H2O",
          products: ["Fe3+(aq)", "Mn2+(aq)", "H2O(l)"],
          explanation: ["Permanganate oxidizes Fe2+ to Fe3+ in acidic medium."],
          aiSummary: "Rule match: oxidizer-reducer electron transfer (MnO4-/Fe2+).",
          limitingReagent: (moles.KMnO4 ?? 0) <= hasFe2 / 5 ? "KMnO4" : feSource,
          extentMol: Number(extentMol.toFixed(4)),
          deltaTempC: Number((1.8 * extentMol * 11.4).toFixed(2)),
        },
      };
    }
  }

  if ((moles.K2Cr2O7 ?? 0) > 0.00001 && hasFe2 > 0.00001) {
    const feSource = (moles.FeSO4 ?? 0) >= (moles.FeCl2 ?? 0) ? "FeSO4" : "FeCl2";
    const extentMol = Math.min((moles.K2Cr2O7 ?? 0) / 1, hasFe2 / 6);
    if (extentMol > 0.00001) {
      return {
        consume: { K2Cr2O7: extentMol, [feSource]: extentMol * 6 },
        reaction: {
          id: `redox_cr2o7_fe2_${Date.now()}`,
          reactionType: "Redox",
          equation: "Cr2O7^2- + 6Fe2+ + 14H+ -> 2Cr3+ + 6Fe3+ + 7H2O",
          balancedEquation: "Cr2O7^2- + 6Fe2+ + 14H+ -> 2Cr3+ + 6Fe3+ + 7H2O",
          products: ["Fe3+(aq)", "Cr3+(aq)", "H2O(l)"],
          explanation: ["Dichromate oxidizes Fe2+ to Fe3+ under acidic conditions."],
          aiSummary: "Rule match: dichromate/iron(II) redox system.",
          limitingReagent: (moles.K2Cr2O7 ?? 0) <= hasFe2 / 6 ? "K2Cr2O7" : feSource,
          extentMol: Number(extentMol.toFixed(4)),
          deltaTempC: Number((1.6 * extentMol * 11.4).toFixed(2)),
        },
      };
    }
  }

  if ((moles.H2O2 ?? 0) > 0.00001 && (moles.KI ?? 0) > 0.00001) {
    const extentMol = Math.min((moles.H2O2 ?? 0), (moles.KI ?? 0) / 2);
    if (extentMol > 0.00001) {
      return {
        consume: { H2O2: extentMol, KI: extentMol * 2 },
        reaction: {
          id: `redox_h2o2_ki_${Date.now()}`,
          reactionType: "Redox",
          equation: "H2O2 + 2I- + 2H+ -> I2 + 2H2O",
          balancedEquation: "H2O2 + 2KI + 2H+ -> I2 + 2H2O + 2K+",
          products: ["I2(s)", "H2O(l)"],
          explanation: ["Iodide is oxidized to iodine while peroxide is reduced to water."],
          aiSummary: "Rule match: peroxide-iodide redox yielding iodine.",
          limitingReagent: (moles.H2O2 ?? 0) <= (moles.KI ?? 0) / 2 ? "H2O2" : "KI",
          extentMol: Number(extentMol.toFixed(4)),
          deltaTempC: Number((1.2 * extentMol * 11.4).toFixed(2)),
          colorShift: "#7c3aed",
        },
      };
    }
  }

  return null;
};

const applyThermalDecompositionRule = (moles: Record<string, number>, thermal: { heatPower: number }): EngineApplication | null => {
  if (thermal.heatPower < 9) return null;
  if ((moles.NH4NO3 ?? 0) > 0.00001) {
    const extentMol = Math.min(moles.NH4NO3 ?? 0, 0.08);
    return {
      consume: { NH4NO3: extentMol },
      reaction: {
        id: `decomp_nh4no3_${Date.now()}`,
        reactionType: "Thermal Decomposition",
        equation: "NH4NO3 -> N2O + 2H2O",
        balancedEquation: "NH4NO3 -> N2O + 2H2O",
        products: ["N2O(g)", "H2O(g)"],
        explanation: ["Heating ammonium nitrate decomposes it to nitrous oxide and steam."],
        aiSummary: "Heat-triggered decomposition pathway activated.",
        limitingReagent: "NH4NO3",
        extentMol: Number(extentMol.toFixed(4)),
        deltaTempC: Number((-1.4 * extentMol * 11.4).toFixed(2)),
        gas: "N2O",
      },
    };
  }
  if ((moles.CaCO3 ?? 0) > 0.00001) {
    const extentMol = Math.min(moles.CaCO3 ?? 0, 0.06);
    return {
      consume: { CaCO3: extentMol },
      reaction: {
        id: `decomp_caco3_${Date.now()}`,
        reactionType: "Thermal Decomposition",
        equation: "CaCO3 -> CaO + CO2",
        balancedEquation: "CaCO3 -> CaO + CO2",
        products: ["CaO(s)", "CO2(g)"],
        explanation: ["Calcium carbonate decomposes at high temperature."],
        aiSummary: "Heat-triggered carbonate decomposition with CO2 release.",
        limitingReagent: "CaCO3",
        extentMol: Number(extentMol.toFixed(4)),
        deltaTempC: Number((-1.6 * extentMol * 11.4).toFixed(2)),
        gas: "CO2",
      },
    };
  }
  if ((moles.H2O2 ?? 0) > 0.00001) {
    const extentMol = Math.min(moles.H2O2 ?? 0, 0.08);
    return {
      consume: { H2O2: extentMol },
      reaction: {
        id: `decomp_h2o2_${Date.now()}`,
        reactionType: "Thermal Decomposition",
        equation: "2H2O2 -> 2H2O + O2",
        balancedEquation: "2H2O2 -> 2H2O + O2",
        products: ["H2O(l)", "O2(g)"],
        explanation: ["Hydrogen peroxide decomposes into water and oxygen."],
        aiSummary: "Peroxide decomposition produced oxygen gas.",
        limitingReagent: "H2O2",
        extentMol: Number(extentMol.toFixed(4)),
        deltaTempC: Number((-0.8 * extentMol * 11.4).toFixed(2)),
        gas: "O2",
      },
    };
  }
  return null;
};

const applyPrecipitationRule = (moles: Record<string, number>): EngineApplication | null => {
  const participants = getReactiveProfiles(moles).filter((profile) => Boolean(profile.cation) && Boolean(profile.anion));
  for (let i = 0; i < participants.length; i += 1) {
    for (let j = i + 1; j < participants.length; j += 1) {
      const left = participants[i];
      const right = participants[j];
      const crossPairs: Array<{ cation?: string; anion?: string; byproduct: string }> = [
        { cation: left.cation, anion: right.anion, byproduct: buildSaltFormula(right.cation, left.anion) },
        { cation: right.cation, anion: left.anion, byproduct: buildSaltFormula(left.cation, right.anion) },
      ];
      for (const pair of crossPairs) {
        if (!isInsolublePair(pair.cation, pair.anion)) continue;
        const extentMol = Math.min(moles[left.formula] ?? 0, moles[right.formula] ?? 0);
        if (extentMol < 0.00001) continue;
        const precipitate = PRECIPITATE_FORMULAS[`${pair.cation}|${pair.anion}`] ?? buildSaltFormula(pair.cation, pair.anion);
        return {
          consume: {
            [left.formula]: extentMol,
            [right.formula]: extentMol,
          },
          reaction: {
            id: `precip_${left.formula}_${right.formula}_${Date.now()}`,
            reactionType: "Precipitation",
            equation: `${left.formula} + ${right.formula} -> ${precipitate}(s) + ${pair.byproduct}(aq)`,
            balancedEquation: `${left.formula} + ${right.formula} -> ${precipitate}(s) + ${pair.byproduct}(aq)`,
            ionicEquation: `${pair.cation} + ${pair.anion} -> ${precipitate}(s)`,
            products: [`${precipitate}(s)`, `${pair.byproduct}(aq)`],
            explanation: ["Oppositely charged ions formed a low-solubility product and precipitated."],
            aiSummary: "Rule match: ionic exchange and solubility check predicted precipitate formation.",
            limitingReagent: (moles[left.formula] ?? 0) <= (moles[right.formula] ?? 0) ? left.formula : right.formula,
            extentMol: Number(extentMol.toFixed(4)),
            deltaTempC: Number((0.7 * extentMol * 11.4).toFixed(2)),
            precipitate,
          },
        };
      }
    }
  }
  return null;
};

const runReactionEngine = (
  contents: ContentEntry[],
  thermal: { previousTemperatureC: number; toolActive: boolean; toolLevel: number; heatPower: number; equipmentMaxC: number; targetTemperatureC?: number },
  centrifugeOn: boolean
): VesselState => {
  if (contents.length === 0) return createDefaultVesselState();

  const moles: Record<string, number> = {};
  let totalVolumeL = 0;
  contents.forEach((entry) => {
    moles[entry.formula] = (moles[entry.formula] ?? 0) + toMoles(entry);
    totalVolumeL += effectiveLiquidVolumeMl(entry) / 1000;
  });

  const reactions: ReactionResult[] = [];
  const generalRules = [
    () => applySpecialPatternRule(moles, thermal),
    () => applyThermalDecompositionRule(moles, thermal),
    () => applyAcidBaseRule(moles),
    () => applyAcidMetalRule(moles),
    () => applyAcidCarbonateRule(moles),
    () => applyGasFormationRule(moles),
    () => applySingleDisplacementRule(moles),
    () => applyComplexIonRule(moles),
    () => applyRedoxRule(moles),
    () => applyPrecipitationRule(moles),
  ];

  for (let stage = 0; stage < 6; stage += 1) {
    const application = generalRules.map((rule) => rule()).find((result): result is EngineApplication => Boolean(result));
    if (!application) break;
    Object.entries(application.consume).forEach(([formula, used]) => {
      moles[formula] = Math.max(0, (moles[formula] ?? 0) - used);
    });
    reactions.push(application.reaction);
  }

  if (reactions.length === 0) {
    const acids = contents.filter((entry) => {
      const chem = getChemical(entry.formula);
      return chem?.role === "acid";
    });
    const bases = contents.filter((entry) => {
      const chem = getChemical(entry.formula);
      return chem?.role === "base";
    });
    const metals = contents.filter((entry) => {
      const chem = getChemical(entry.formula);
      return chem?.role === "metal";
    });
    const carbonates = contents.filter((entry) => {
      const chem = getChemical(entry.formula);
      return chem?.role === "carbonate";
    });

    if (acids.length && bases.length) {
      const acid = acids[0].formula;
      const base = bases[0].formula;
      reactions.push({
        id: `generic_neutralization_${acid}_${base}`,
        reactionType: "Neutralization (Generic)",
        equation: `${acid} + ${base} -> Salt + H2O`,
        balancedEquation: `${acid} + ${base} -> Salt + H2O`,
        products: ["Salt(aq)", "H2O(l)"],
        explanation: ["Generic acid-base neutralization estimated from chemical roles."],
        aiSummary: "Estimated neutralization detected from acid/base role matching.",
        limitingReagent: acid,
        extentMol: 0.01,
        deltaTempC: 0.8,
        inferred: true,
      });
    } else if (acids.length && metals.length) {
      const acid = acids[0].formula;
      const metal = metals[0].formula;
      reactions.push({
        id: `generic_metal_acid_${metal}_${acid}`,
        reactionType: "Metal + Acid (Generic)",
        equation: `${metal} + acid -> metal salt + H2`,
        balancedEquation: `${metal} + 2H+ -> ${metal}2+ + H2`,
        products: ["Metal salt(aq)", "H2(g)"],
        explanation: ["A generic displacement pattern was inferred for this metal-acid pair."],
        aiSummary: "Predicted hydrogen gas evolution using generic metal-acid behavior.",
        limitingReagent: metal,
        extentMol: 0.01,
        deltaTempC: 0.9,
        gas: "H2",
        inferred: true,
      });
    } else if (acids.length && carbonates.length) {
      const acid = acids[0].formula;
      const carbonate = carbonates[0].formula;
      reactions.push({
        id: `generic_carbonate_${carbonate}_${acid}`,
        reactionType: "Acid + Carbonate (Generic)",
        equation: `${acid} + ${carbonate} -> Salt + H2O + CO2`,
        balancedEquation: `${acid} + carbonate -> Salt + H2O + CO2`,
        products: ["Salt(aq)", "H2O(l)", "CO2(g)"],
        explanation: ["A generic acid-carbonate gas evolution path was inferred."],
        aiSummary: "Predicted CO2 release based on carbonate with acid.",
        limitingReagent: carbonate,
        extentMol: 0.01,
        deltaTempC: 0.4,
        gas: "CO2",
        inferred: true,
      });
    } else {
      const formulas = Array.from(new Set(contents.map((entry) => entry.formula)));
      const allDissolvedSalts = formulas.length >= 2 && formulas.every((formula) => {
        const chem = getChemical(formula);
        return chem?.role === "salt" || chem?.role === "halide" || chem?.role === "solvent";
      });
      const fallback = buildPassiveEquation(contents);
      reactions.push({
        id: `mixture_${Date.now()}`,
        reactionType: allDissolvedSalts ? "No Reaction" : "Mixture State",
        equation: allDissolvedSalts ? `${formulas.join(" + ")} -> No reaction` : fallback.equation,
        balancedEquation: allDissolvedSalts ? `${formulas.join(" + ")} -> No reaction` : fallback.equation,
        products: allDissolvedSalts ? ["No new products"] : fallback.products,
        explanation: [allDissolvedSalts ? "All ions remain soluble and no gas, precipitate, or redox pathway matched." : fallback.description],
        aiSummary: allDissolvedSalts
          ? "Validation: no reaction because no ion change, precipitate, gas, or redox match was found."
          : "No dominant chemical transformation predicted; mixture behavior is reported.",
        limitingReagent: fallback.limitingReagent,
        extentMol: 0,
        deltaTempC: 0,
        inferred: true,
      });
    }
  }

  const acidBase = computeAcidBaseFromMoles(moles, totalVolumeL);
  const forms = new Set(contents.map((entry) => entry.formula));
  const hasPhenolphthalein = forms.has("C20H14O4");
  const hasMethylOrange = forms.has("C14H14N3NaO3S");
  const lastAdded = getChemical(contents[contents.length - 1].formula);
  let finalColor = lastAdded?.color ?? "#bfdbfe";
  if (hasPhenolphthalein && acidBase.pH > 8.2) finalColor = "#ec4899";
  if (hasMethylOrange && acidBase.pH < 3.1) finalColor = "#ef4444";
  if (hasMethylOrange && acidBase.pH > 4.4) finalColor = "#f59e0b";
  const reactionColor = reactions[reactions.length - 1]?.colorShift;
  if (reactionColor) finalColor = reactionColor;

  const reactionHeat = reactions.reduce((sum, reaction) => sum + reaction.deltaTempC, 0);
  const reactionOffset = clamp(reactionHeat * 0.45, -10, 24);
  const substanceMaxC = getMixtureMaxTemp(contents);
  const absoluteMaxC = Math.min(substanceMaxC, thermal.equipmentMaxC);

  const levelRatio = clamp(thermal.toolLevel / 100, 0, 1);
  let targetTemp = AMBIENT_TEMPERATURE_C + reactionOffset;
  let approach = 0.08;

  if (thermal.toolActive && typeof thermal.targetTemperatureC === "number") {
    targetTemp = clamp(thermal.targetTemperatureC, 0, absoluteMaxC) + reactionOffset;
    approach = 0.12;
  } else if (thermal.toolActive && thermal.heatPower > 0) {
    targetTemp = AMBIENT_TEMPERATURE_C + (absoluteMaxC - AMBIENT_TEMPERATURE_C) * levelRatio + reactionOffset;
    approach = 0.1 + 0.24 * levelRatio;
  }

  if (thermal.toolActive && thermal.heatPower < 0) {
    targetTemp = Math.max(0, AMBIENT_TEMPERATURE_C + thermal.heatPower * (1 + levelRatio * 1.2));
    approach = 0.18;
  }

  let nextTemperature = thermal.previousTemperatureC + (targetTemp - thermal.previousTemperatureC) * approach;
  nextTemperature = clamp(nextTemperature, 0, absoluteMaxC);
  const temperatureC = Number(nextTemperature.toFixed(2));

  const isActivelyHeating = thermal.toolActive && thermal.heatPower > 0 && thermal.toolLevel > 0;

  const boilingCompounds = Array.from(
    new Set(
      contents
        .map((entry) => {
          const chemical = getChemical(entry.formula);
          if (!chemical || chemical.state !== "liquid" || entry.unit !== "mL") return null;
          if (!isActivelyHeating) return null;
          const boilingPoint = getBoilingPointC(chemical);
          if (typeof boilingPoint !== "number") return null;
          const practicalBoilThreshold = Math.max(boilingPoint - 0.35, AMBIENT_TEMPERATURE_C + 12);
          return temperatureC >= practicalBoilThreshold ? chemical.formula : null;
        })
        .filter((formula): formula is string => Boolean(formula))
    )
  );
  const smokeLevel = boilingCompounds.length > 0 ? clamp((temperatureC - 90) / 90, 0, 1) : 0;

  return {
    color: finalColor,
    pH: acidBase.pH,
    temperatureC,
    gasType: reactions.find((reaction) => reaction.gas)?.gas ?? null,
    boilingCompounds,
    smokeLevel,
    precipitateType: reactions.find((reaction) => reaction.precipitate)?.precipitate ?? null,
    separated: centrifugeOn,
    heatLevel: thermal.heatPower,
    reactions,
    lastReactionAt: reactions.length > 0 ? Date.now() : null,
  };
};

function PrecisionLineChart({
  title,
  data,
  valueKey,
  color,
  yLabel,
  dark,
}: {
  title: string;
  data: TelemetryPoint[];
  valueKey: keyof Omit<TelemetryPoint, "t">;
  color: string;
  yLabel: string;
  dark: boolean;
}) {
  const width = 338;
  const height = 168;
  const leftPad = 36;
  const rightPad = 14;
  const bottomPad = 22;
  const topPad = 12;

  const values = data.map((point) => point[valueKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const expandedMin = min - (max - min || 1) * 0.08;
  const expandedMax = max + (max - min || 1) * 0.08;
  const range = Math.max(expandedMax - expandedMin, 0.0001);

  const points = data
    .map((point, index) => {
      const x = leftPad + (index / Math.max(data.length - 1, 1)) * (width - leftPad - rightPad);
      const y = topPad + (1 - (point[valueKey] - expandedMin) / range) * (height - topPad - bottomPad);
      return `${x},${y}`;
    })
    .join(" ");

  const ticks = Array.from({ length: 4 }).map((_, index) => {
    const ratio = index / 3;
    const y = topPad + ratio * (height - topPad - bottomPad);
    return { y, value: expandedMax - ratio * range };
  });

  const axisColor = dark ? "#334155" : "#cbd5e1";
  const labelColor = dark ? "#94a3b8" : "#64748b";

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {ticks.map((tick) => (
          <g key={tick.y}>
            <line x1={leftPad} y1={tick.y} x2={width - rightPad} y2={tick.y} stroke={axisColor} strokeDasharray="3 3" strokeWidth="1" />
            <text x={4} y={tick.y + 3} fill={labelColor} fontSize="10">
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}
        <line x1={leftPad} y1={height - bottomPad} x2={width - rightPad} y2={height - bottomPad} stroke={axisColor} />
        <line x1={leftPad} y1={topPad} x2={leftPad} y2={height - bottomPad} stroke={axisColor} />
        <polyline fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" points={points} />
        <text x={width - 54} y={height - 6} fill={labelColor} fontSize="10">
          time (s)
        </text>
        <text x={6} y={12} fill={labelColor} fontSize="10">
          {yLabel}
        </text>
      </svg>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Min {min.toFixed(3)} | Max {max.toFixed(3)} | Last {values[values.length - 1].toFixed(3)}
      </p>
    </div>
  );
}

function getVesselPath(type: EquipmentType) {
  switch (type) {
    case "beaker":
      return "M18 12 H122 V154 Q122 166 110 166 H30 Q18 166 18 154 Z";
    case "test_tube":
      return "M44 10 H86 V136 Q86 166 65 166 Q44 166 44 136 Z";
    case "flask":
      return "M56 10 H84 V48 L118 86 Q126 96 126 110 V146 Q126 166 108 166 H32 Q14 166 14 146 V110 Q14 96 22 86 L56 48 Z";
    case "conical_flask":
      return "M58 10 H82 V40 L118 152 Q121 166 108 166 H32 Q19 166 22 152 L58 40 Z";
    case "volumetric_flask":
      return "M64 8 H76 V50 L102 90 Q118 114 118 132 V146 Q118 166 98 166 H42 Q22 166 22 146 V132 Q22 114 38 90 L64 50 Z";
    case "graduated_cylinder":
      return "M28 18 H62 V156 Q62 166 52 166 H38 Q28 166 28 156 Z";
    case "burette":
      return "M28 8 H44 V164 H38 V176 H34 V164 H28 Z";
    case "pipette":
      return "M44 14 H58 V112 H66 V150 Q66 166 51 166 Q36 166 36 150 V112 H44 Z";
    case "petri_dish":
      return "M14 56 Q18 36 75 36 Q132 36 136 56 V78 Q132 94 75 94 Q18 94 14 78 Z";
    case "watch_glass":
      return "M14 66 Q22 40 69 40 Q116 40 124 66 Q116 90 69 90 Q22 90 14 66 Z";
    case "separatory_funnel":
      return "M60 8 H80 V40 L110 82 Q116 90 110 100 L80 142 V160 Q80 168 70 168 Q60 168 60 160 V142 L30 100 Q24 90 30 82 L60 40 Z";
    case "reagent_bottle":
      return "M44 10 H96 V30 H108 V156 Q108 166 96 166 H44 Q32 166 32 156 V30 H44 Z";
    case "dropper_bottle":
      return "M54 8 H86 V24 H92 V42 H48 V24 H54 Z M44 42 H96 V154 Q96 166 84 166 H56 Q44 166 44 154 Z";
    default:
      return "M18 12 H122 V154 Q122 166 110 166 H30 Q18 166 18 154 Z";
  }
}

function getLidGeometry(type: EquipmentType) {
  if (type === "test_tube") return { x: 46, y: 7, w: 48, h: 7, knobX: 66, knobW: 8 };
  if (type === "graduated_cylinder" || type === "burette" || type === "pipette") return { x: 48, y: 6, w: 44, h: 7, knobX: 66, knobW: 8 };
  if (type === "separatory_funnel") return { x: 52, y: 6, w: 36, h: 7, knobX: 66, knobW: 8 };
  if (type === "dropper_bottle") return { x: 50, y: 6, w: 40, h: 7, knobX: 66, knobW: 8 };
  if (type === "petri_dish" || type === "watch_glass") return { x: 32, y: 42, w: 76, h: 6, knobX: 66, knobW: 8 };
  return { x: 26, y: 8, w: 88, h: 9, knobX: 64, knobW: 12 };
}

function canAttach(vessel: PlacedEquipment, tool: PlacedEquipment) {
  const attachableTypes: EquipmentType[] = [
    "hot_plate",
    "bunsen_burner",
    "heating_mantle",
    "water_bath",
    "centrifuge",
    "weighing_scale",
    "magnetic_stirrer",
    "tripod_stand",
    "ice_bath",
  ];
  if (!attachableTypes.includes(tool.type)) return false;
  const anchorX = tool.x + tool.width / 2 - vessel.width / 2;
  const anchorY = tool.y - vessel.height + getAttachYOffset(tool.type);
  const deltaX = Math.abs(vessel.x - anchorX);
  const deltaY = Math.abs(vessel.y - anchorY);
  const xTolerance =
    tool.type === "bunsen_burner" ? Math.max(62, tool.width * 0.72) : tool.type === "water_bath" || tool.type === "heating_mantle" ? Math.max(64, tool.width * 0.66) : Math.max(58, tool.width * 0.62);
  const yTolerance = tool.type === "bunsen_burner" ? 78 : tool.type === "water_bath" || tool.type === "heating_mantle" || tool.type === "ice_bath" ? 74 : 70;
  return deltaX <= xTolerance && deltaY <= yTolerance;
}

function getAttachYOffset(toolType: EquipmentType) {
  if (toolType === "bunsen_burner") return 2;
  if (toolType === "water_bath") return 2;
  if (toolType === "ice_bath") return 2;
  if (toolType === "heating_mantle") return 1;
  if (toolType === "magnetic_stirrer") return 6;
  if (toolType === "weighing_scale") return 6;
  if (toolType === "tripod_stand") return 2;
  if (toolType === "centrifuge") return 3;
  if (toolType === "hot_plate") return 2;
  return 4;
}

function getTankTarget(tank: PlacedEquipment, items: PlacedEquipment[]) {
  if (tank.gasTargetId === AIR_TARGET_ID) return null;
  if (tank.gasTargetId) {
    return items.find((item) => item.id === tank.gasTargetId && item.kind === "vessel") ?? null;
  }
  return null;
}

function getToolTemperatureBounds(type: EquipmentType) {
  const def = EQUIPMENT_DEFS[type];
  const min = def.minTempC ?? AMBIENT_TEMPERATURE_C;
  const max = def.maxTempC ?? AMBIENT_TEMPERATURE_C;
  return { min, max };
}

function getToolLevelLabel(item: PlacedEquipment) {
  if (TEMP_CONTROLLED_TOOLS.has(item.type)) {
    return `Target Temperature (${item.toolLevel.toFixed(0)} C)`;
  }
  return `Power Level (${item.toolLevel.toFixed(0)}%)`;
}

function reactionSignature(reaction: ReactionResult) {
  return [reaction.reactionType, reaction.balancedEquation, reaction.products.join("+"), reaction.gas ?? "", reaction.precipitate ?? ""].join("|");
}

function parseEquationReactants(equation: string) {
  const [left] = equation.split("->");
  if (!left) return [];
  const parsed = left
    .split("+")
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) => term.replace(/^(\d+)\s*/, "").trim())
    .map((term) => term.replace(/\((aq|s|l|g)\)$/i, ""))
    .filter((term) => !["acid", "base", "salt", "carbonate"].includes(term.toLowerCase()));
  return parsed.filter((term) => Boolean(getChemical(term)));
}

function getDissociationLine(formula: string) {
  const profile = getChemicalProfile(formula);
  const fallbackChemical = getChemical(formula);
  if (!profile && !fallbackChemical) return `${formula}(aq) -> ${formula}`;
  const ions = profile?.ions?.length
    ? profile.ions
    : fallbackChemical?.role === "acid"
      ? ["H+", `${formula}-`]
      : fallbackChemical?.role === "base"
        ? ["M+", "OH-"]
        : [formula];
  const renderedFormula = profile?.formula ?? fallbackChemical?.formula ?? formula;
  const state = profile?.state ?? fallbackChemical?.state ?? "liquid";
  const phase = state === "liquid" ? "aq" : state === "gas" ? "g" : "s";
  return `${renderedFormula}(${phase}) -> ${ions.join(" + ")}`;
}

function sanitizeChemistryText(line: string) {
  return line
    .replace(/inferred/gi, "derived")
    .replace(/estimated/gi, "derived")
    .replace(/without basis/gi, "from available model data")
    .replace(/unavailable/gi, "not provided");
}

function buildOutputStages(reaction: ReactionResult, reactants: string[]): OutputStages {
  const stage1Reactants = reactants.length ? reactants : parseEquationReactants(reaction.balancedEquation || reaction.equation);
  const uniqueReactants = Array.from(new Set(stage1Reactants));
  const stage1 = uniqueReactants.map((formula) => getDissociationLine(formula));

  const stage2: string[] = [`Rule triggered: ${reaction.reactionType}`];
  if (reaction.ionicEquation) {
    stage2.push(`Ion-level mechanism: ${reaction.ionicEquation}`);
  } else if (reaction.reactionType === "No Reaction" || reaction.reactionType === "Mixture State") {
    stage2.push("Ion interaction: no net ionic change detected; all ions remain spectators.");
  } else if (reaction.reactionType === "Thermal Decomposition") {
    stage2.push("Ion interaction: thermal decomposition proceeds through molecular bond cleavage in this model.");
  } else {
    stage2.push("Ion interaction follows the matched rule stoichiometry shown below.");
  }
  reaction.explanation.forEach((line) => stage2.push(sanitizeChemistryText(line)));

  const stage3 = [
    `Balanced equation: ${reaction.balancedEquation}`,
    `Products with states: ${reaction.products.join(" + ") || "No new products"}`,
  ];

  const stage4 = sanitizeChemistryText(reaction.explanation[0] ?? `Rule applied: ${reaction.reactionType}.`);

  const hasPhysicsData = reaction.extentMol > 0 || Math.abs(reaction.deltaTempC) > 0.0001;
  const stage5 = hasPhysicsData
    ? [
        `Limiting reagent: ${reaction.limitingReagent}`,
        `Reaction extent: ${reaction.extentMol.toFixed(4)} mol`,
        `Temperature change (model-derived): ${reaction.deltaTempC.toFixed(2)} C`,
      ]
    : ["Physics data unavailable in current simulation model"];

  return { stage1, stage2, stage3, stage4, stage5 };
}

function summarizeLabAir(composition: Record<string, number>): LabAirState {
  let dominantGas: string | null = null;
  let dominantValue = 0;
  let flammableIndex = 0;
  const h2 = composition.H2 ?? 0;
  const ch4 = composition.CH4 ?? 0;

  Object.entries(composition).forEach(([formula, value]) => {
    if (value > dominantValue) {
      dominantGas = formula;
      dominantValue = value;
    }
    if (FLAMMABLE_GASES.has(formula)) flammableIndex += value;
  });

  const ignitionPotential = Number((h2 / 4 + ch4 / 5).toFixed(3));
  return {
    composition,
    dominantGas,
    flammableIndex: Number(flammableIndex.toFixed(3)),
    ignitionPotential,
  };
}

function normalizeAirComposition(composition: Record<string, number>) {
  const total = Object.values(composition).reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0) return { ...BASELINE_AIR_COMPOSITION };
  const normalized: Record<string, number> = {};
  Object.entries(composition).forEach(([formula, value]) => {
    const percent = (Math.max(0, value) / total) * 100;
    if (percent > 0.001) normalized[formula] = Number(percent.toFixed(4));
  });
  return normalized;
}

const DEFAULT_LAB_AIR: LabAirState = summarizeLabAir({ ...BASELINE_AIR_COMPOSITION });

function evolveLabAir(previous: LabAirState, items: PlacedEquipment[]): LabAirState {
  let nextComposition: Record<string, number> = { ...previous.composition };

  items.forEach((item) => {
    if (item.type !== "gas_tank" || !item.toolActive || !item.sourceChemical) return;
    const target = getTankTarget(item, items);
    if (target) return;

    const flowUnits = Math.max(0.8, item.toolLevel * 0.16);
    const dilution = 100 / (100 + flowUnits);
    const boosted = 100 - 100 * dilution;
    const mixed: Record<string, number> = {};

    Object.entries(nextComposition).forEach(([formula, pct]) => {
      mixed[formula] = Math.max(0, pct * dilution);
    });
    mixed[item.sourceChemical] = (mixed[item.sourceChemical] ?? 0) + boosted;
    nextComposition = normalizeAirComposition(mixed);
  });

  return summarizeLabAir(nextComposition);
}

function shouldTriggerAirIgnition(air: LabAirState) {
  const oxygenPct = air.composition.O2 ?? 0;
  if (oxygenPct < 8) return false;
  const h2Pct = air.composition.H2 ?? 0;
  const ch4Pct = air.composition.CH4 ?? 0;
  return h2Pct >= 4 || ch4Pct >= 5 || air.ignitionPotential >= 1;
}

function getDominantFlammableGas(composition: Record<string, number>) {
  const flammables = Object.entries(composition)
    .filter(([formula]) => FLAMMABLE_GASES.has(formula))
    .sort((a, b) => b[1] - a[1]);
  return flammables[0]?.[0] ?? "H2";
}

function AtmospherePieChart({ composition, dark }: { composition: Record<string, number>; dark: boolean }) {
  const entries = Object.entries(composition)
    .filter(([, value]) => value > 0.001)
    .sort((a, b) => b[1] - a[1]);
  const colors = ["#38bdf8", "#34d399", "#a78bfa", "#fbbf24", "#f87171", "#22d3ee", "#f472b6", "#94a3b8"];
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lab Atmosphere</p>
      <div className="mt-2 flex items-center gap-4">
        <svg viewBox="0 0 140 140" className="h-28 w-28">
          <circle cx="70" cy="70" r={radius} fill="none" stroke={dark ? "#1e293b" : "#e2e8f0"} strokeWidth="20" />
          {entries.map(([formula, value], idx) => {
            const segment = (value / 100) * circumference;
            const strokeDasharray = `${segment} ${circumference - segment}`;
            const el = (
              <circle
                key={formula}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={colors[idx % colors.length]}
                strokeWidth="20"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform="rotate(-90 70 70)"
              />
            );
            offset += segment;
            return el;
          })}
          <text x="70" y="66" textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold dark:fill-slate-200">
            AIR MIX
          </text>
          <text x="70" y="79" textAnchor="middle" className="fill-slate-500 text-[9px] dark:fill-slate-400">
            100%
          </text>
        </svg>
        <div className="max-h-28 flex-1 space-y-1 overflow-y-auto pr-1 text-[11px]">
          {entries.map(([formula, value], idx) => (
            <p key={formula} className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                {formula}
              </span>
              <span>{value.toFixed(2)}%</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function getAirCombustionReaction(gas: string, now: number): ReactionResult {
  if (gas === "CH4") {
    return {
      id: `air_ch4_ignition_${now}`,
      reactionType: "Air Ignition",
      equation: "CH4 + 2O2 -> CO2 + 2H2O",
      balancedEquation: "CH4 + 2O2 -> CO2 + 2H2O",
      products: ["CO2(g)", "H2O(g)", "Heat"],
      explanation: ["Methane accumulated in lab air and ignited at an active flame source."],
      aiSummary: "High-risk event: methane-air ignition produced a strong deflagration wave.",
      limitingReagent: "CH4",
      extentMol: 0.08,
      deltaTempC: 28,
      gas: "CO2",
    };
  }
  return {
    id: `air_h2_ignition_${now}`,
    reactionType: "Air Ignition",
    equation: "2H2 + O2 -> 2H2O",
    balancedEquation: "2H2 + O2 -> 2H2O",
    products: ["H2O(g)", "Heat"],
    explanation: ["Hydrogen accumulated in lab air and ignited at an active flame source."],
    aiSummary: "High-risk event: hydrogen-air ignition caused a rapid flash explosion.",
    limitingReagent: "H2",
    extentMol: 0.08,
    deltaTempC: 32,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const startedAtRef = useRef(Date.now());
  const placedItemsRef = useRef<PlacedEquipment[]>([]);
  const labAirRef = useRef<LabAirState>(DEFAULT_LAB_AIR);
  const airExplosionCooldownRef = useRef(0);

  const [theme, setTheme] = useState<Theme>("light");
  const [mode, setMode] = useState<Mode>("free");
  const [activeGuide, setActiveGuide] = useState(GUIDES[0].id);
  const [placedItems, setPlacedItems] = useState<PlacedEquipment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedChemical, setSelectedChemical] = useState("HCl");
  const [entryAmount, setEntryAmount] = useState(20);
  const [solidForm, setSolidForm] = useState<SolidForm>("pellets");
  const [chemicalQuery, setChemicalQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [chemicalSort, setChemicalSort] = useState<ChemicalSort>("formula_asc");
  const [reactionFeed, setReactionFeed] = useState<ReactionResult[]>([]);
  const [labAir, setLabAir] = useState<LabAirState>(DEFAULT_LAB_AIR);
  const [labExplosionUntil, setLabExplosionUntil] = useState(0);
  const [labExplosionGas, setLabExplosionGas] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(DEFAULT_TELEMETRY);
  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [attachPreview, setAttachPreview] = useState<{ vesselId: string; targetId: string } | null>(null);
  const [chemicalDropDraft, setChemicalDropDraft] = useState<ChemicalDropDraft | null>(null);
  const [ignitions, setIgnitions] = useState<Record<string, number>>({});
  const ignitionCooldownRef = useRef<Record<string, number>>({});

  const selectedItem = useMemo(() => placedItems.find((item) => item.id === selectedId) ?? null, [placedItems, selectedId]);

  const catalogChemicals = useMemo(() => {
    const seen = new Set<string>();
    return CHEMICALS.filter((chemical) => {
      const key = `${chemical.formula}::${chemical.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const filteredChemicals = useMemo(() => {
    const query = chemicalQuery.trim().toLowerCase();
    const result = catalogChemicals.filter((chemical) => {
      const rolePass = roleFilter === "all" || chemical.role === roleFilter;
      const queryPass = !query || `${chemical.formula} ${chemical.name} ${chemical.role}`.toLowerCase().includes(query);
      return rolePass && queryPass;
    });
    return sortChemicals(result, chemicalSort);
  }, [catalogChemicals, chemicalQuery, roleFilter, chemicalSort]);

  const selectedChemicalDef = useMemo(() => getChemical(selectedChemical), [selectedChemical]);

  const findTopItemAtPoint = useCallback(
    (x: number, y: number) => {
      return [...placedItems]
        .reverse()
        .find((item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height);
    },
    [placedItems]
  );

  const openChemicalDrop = (formula: string, x: number, y: number, targetVesselId: string | null) => {
    const chemical = getChemical(formula);
    if (!chemical) return;
    setChemicalDropDraft({
      formula,
      targetVesselId,
      x,
      y,
      amount: chemical.state === "solid" ? 4 : 20,
      form: "pellets",
    });
  };

  const addEquipment = (type: EquipmentType, x: number, y: number, prefill: ContentEntry[] = [], overrides: Partial<PlacedEquipment> = {}) => {
    const def = EQUIPMENT_DEFS[type];
    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item: PlacedEquipment = {
      id,
      type,
      kind: def.kind,
      x,
      y,
      width: def.width,
      height: def.height,
      capacityMl: def.capacityMl ?? 0,
      attachedTo: null,
      measureTargetId: null,
      toolActive: false,
      toolLevel:
        def.tempControlled
          ? Math.round(((def.minTempC ?? AMBIENT_TEMPERATURE_C) + (def.maxTempC ?? AMBIENT_TEMPERATURE_C)) / 2)
          : def.kind === "heater"
            ? 55
            : type === "centrifuge"
              ? 70
              : type === "gas_tank"
                ? 65
                : 0,
      sourceChemical: type === "gas_tank" ? "H2" : null,
      gasTargetId: null,
      contents: def.kind === "vessel" ? prefill : [],
      state: createDefaultVesselState(),
      ...overrides,
    };
    setPlacedItems((prev) => [...prev, item]);
    setSelectedId(id);
  };

  const bringItemToFront = (id: string) => {
    setPlacedItems((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx < 0) return prev;
      const picked = prev[idx];
      return [...prev.slice(0, idx), ...prev.slice(idx + 1), picked];
    });
  };

  const appendUniqueReactions = useCallback((incoming: ReactionResult[]) => {
    if (!incoming.length) return;
    setReactionFeed((prev) => {
      const seen = new Set(prev.map((reaction) => reactionSignature(reaction)));
      const merged = [...prev];
      incoming.forEach((reaction) => {
        const sig = reactionSignature(reaction);
        if (seen.has(sig)) return;
        seen.add(sig);
        merged.push(reaction);
      });
      return merged.slice(-120);
    });
  }, []);

  const recomputeAllVessels = useCallback((items: PlacedEquipment[]) => {
    return items.map((item) => {
      if (item.kind !== "vessel") return item;
      const attachedTool = items.find((entry) => entry.id === item.attachedTo);
      const activeGasTanks = items.filter(
        (entry) =>
          entry.type === "gas_tank" &&
          entry.toolActive &&
          entry.sourceChemical &&
          getTankTarget(entry, items)?.id === item.id
      );
      const injectedGasEntries: ContentEntry[] = activeGasTanks.map((tank) => ({
        formula: tank.sourceChemical as string,
        amount: Math.max(2, tank.toolLevel * 0.08),
        unit: "mL",
      }));
      const toolHeatPower = attachedTool ? (EQUIPMENT_DEFS[attachedTool.type].heatPower ?? 0) : 0;
      const def = attachedTool ? EQUIPMENT_DEFS[attachedTool.type] : null;
      const scaledHeatPower =
        attachedTool?.toolActive && def
          ? def.tempControlled
            ? toolHeatPower
            : (toolHeatPower * attachedTool.toolLevel) / 100
          : 0;
      const equipmentMaxC = attachedTool ? EQUIPMENT_DEFS[attachedTool.type].maxTempC ?? 1200 : 1200;
      const centrifugeOn = attachedTool?.type === "centrifuge" && attachedTool.toolActive;
      const nextState = runReactionEngine(
        [...item.contents, ...injectedGasEntries],
        {
          previousTemperatureC: item.state.temperatureC || AMBIENT_TEMPERATURE_C,
          toolActive: Boolean(attachedTool?.toolActive),
          toolLevel: attachedTool?.toolLevel ?? 0,
          heatPower: scaledHeatPower,
          equipmentMaxC,
          targetTemperatureC: attachedTool && EQUIPMENT_DEFS[attachedTool.type].tempControlled ? attachedTool.toolLevel : undefined,
        },
        Boolean(centrifugeOn)
      );
      return { ...item, state: nextState };
    });
  }, []);

  const appendTelemetry = useCallback((items: PlacedEquipment[]) => {
    const vessels = items.filter((item) => item.kind === "vessel" && item.contents.length > 0);
    if (!vessels.length) return;
    const elapsed = Number(((Date.now() - startedAtRef.current) / 1000).toFixed(1));
    let pH = 0;
    let temperatureC = 0;
    let acidEqM = 0;
    let baseEqM = 0;
    let ionicStrength = 0;
    vessels.forEach((vessel) => {
      pH += vessel.state.pH;
      temperatureC += vessel.state.temperatureC;
      const totalVolumeL = Math.max(vessel.contents.reduce((sum, entry) => sum + effectiveLiquidVolumeMl(entry), 0) / 1000, 0.001);
      vessel.contents.forEach((entry) => {
        const chem = getChemical(entry.formula);
        const mol = toMoles(entry);
        acidEqM += ((chem?.acidEqPerMol ?? 0) * (chem?.strength ?? 1) * mol) / totalVolumeL;
        baseEqM += ((chem?.baseEqPerMol ?? 0) * (chem?.strength ?? 1) * mol) / totalVolumeL;
        ionicStrength += mol / totalVolumeL;
      });
    });
    const count = vessels.length;
    const point: TelemetryPoint = {
      t: elapsed,
      pH: Number((pH / count).toFixed(3)),
      temperatureC: Number((temperatureC / count).toFixed(3)),
      acidEqM: Number((acidEqM / count).toFixed(3)),
      baseEqM: Number((baseEqM / count).toFixed(3)),
      ionicStrength: Number((ionicStrength / count).toFixed(3)),
    };
    setTelemetry((prev) => [...prev, point].slice(-160));
  }, []);

  useEffect(() => {
    placedItemsRef.current = placedItems;
  }, [placedItems]);

  useEffect(() => {
    labAirRef.current = labAir;
  }, [labAir]);

  useEffect(() => {
    const id = window.setInterval(() => appendTelemetry(placedItemsRef.current), 1400);
    return () => window.clearInterval(id);
  }, [appendTelemetry]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const stagedReactions: ReactionResult[] = [];
      const next = recomputeAllVessels(placedItemsRef.current);
      next.forEach((item) => {
        if (item.kind !== "vessel") return;
        item.state.reactions.forEach((reaction) => {
          stagedReactions.push({ ...reaction, id: `${reaction.id}_${item.id}` });
        });
      });

      const activeIgniters = next.filter((item) => (item.type === "match" || item.type === "bunsen_burner") && item.toolActive);
      if (activeIgniters.length > 0) {
        const now = Date.now();
        const updates: Record<string, number> = {};
        next.forEach((item) => {
          if (item.kind !== "vessel" || item.state.gasType !== "H2") return;
          const ignited = activeIgniters.some((source) => {
            const sx = source.x + source.width / 2;
            const sy = source.type === "match" ? source.y + 6 : source.y + 2;
            const vx = item.x + item.width / 2;
            const vy = item.y + 8;
            return Math.hypot(sx - vx, sy - vy) < 84;
          });
          if (!ignited) return;
          const lastFire = ignitionCooldownRef.current[item.id] ?? 0;
          if (now - lastFire < 2200) return;
          ignitionCooldownRef.current[item.id] = now;
          updates[item.id] = now + 1400;
          stagedReactions.push({
            id: `h2_ignition_${item.id}_${now}`,
            reactionType: "Combustion",
            equation: "2H2 + O2 -> 2H2O",
            balancedEquation: "2H2 + O2 -> 2H2O",
            products: ["H2O(g)", "Heat"],
            explanation: ["Hydrogen above the vessel ignited from a nearby flame source."],
            aiSummary: "Hydrogen ignition event: localized combustion flash detected.",
            limitingReagent: "H2",
            extentMol: 0.01,
            deltaTempC: 8.4,
          });
        });
        if (Object.keys(updates).length > 0) {
          setIgnitions((prevIgnitions) => ({ ...prevIgnitions, ...updates }));
        }
      }

      let stagedLabAir = evolveLabAir(labAirRef.current, next);
      const hasLiveIgnitionSource = activeIgniters.length > 0;
      if (hasLiveIgnitionSource && shouldTriggerAirIgnition(stagedLabAir) && Date.now() - airExplosionCooldownRef.current > 2600) {
        const now = Date.now();
        airExplosionCooldownRef.current = now;
        const triggerGas = getDominantFlammableGas(stagedLabAir.composition);
        stagedReactions.push(getAirCombustionReaction(triggerGas, now));
        setLabExplosionGas(triggerGas);
        setLabExplosionUntil(now + 1800);
        const depleted = { ...stagedLabAir.composition };
        if (triggerGas === "CH4") {
          const fuel = depleted.CH4 ?? 0;
          depleted.CH4 = fuel * 0.12;
          depleted.O2 = Math.max(0, (depleted.O2 ?? 0) - fuel * 0.4);
          depleted.CO2 = (depleted.CO2 ?? 0) + fuel * 0.32;
          depleted.H2O = (depleted.H2O ?? 0) + fuel * 0.24;
        } else {
          const fuel = depleted.H2 ?? 0;
          depleted.H2 = fuel * 0.08;
          depleted.O2 = Math.max(0, (depleted.O2 ?? 0) - fuel * 0.22);
          depleted.H2O = (depleted.H2O ?? 0) + fuel * 0.42;
        }
        stagedLabAir = summarizeLabAir(normalizeAirComposition(depleted));
      }

      setIgnitions((prevIgnitions) => {
        const now = Date.now();
        const nextIgnitions: Record<string, number> = {};
        Object.entries(prevIgnitions).forEach(([id, expiry]) => {
          if (expiry > now) nextIgnitions[id] = expiry;
        });
        return nextIgnitions;
      });

      setPlacedItems(next);
      placedItemsRef.current = next;
      labAirRef.current = stagedLabAir;
      setLabAir(stagedLabAir);
      appendUniqueReactions(stagedReactions);
    }, 850);
    return () => window.clearInterval(id);
  }, [appendUniqueReactions, recomputeAllVessels]);

  const resetLab = () => {
    setPlacedItems([]);
    setSelectedId(null);
    setReactionFeed([]);
    setLabAir(DEFAULT_LAB_AIR);
    setLabExplosionUntil(0);
    setLabExplosionGas(null);
    setTelemetry(DEFAULT_TELEMETRY);
    setChemicalDropDraft(null);
    setIgnitions({});
    airExplosionCooldownRef.current = 0;
    ignitionCooldownRef.current = {};
    startedAtRef.current = Date.now();
  };

  const clearAtmosphere = () => {
    setLabAir(DEFAULT_LAB_AIR);
    labAirRef.current = DEFAULT_LAB_AIR;
    setLabExplosionUntil(0);
    setLabExplosionGas(null);
    airExplosionCooldownRef.current = 0;
  };

  const loadGuide = () => {
    resetLab();
    const guide = GUIDES.find((entry) => entry.id === activeGuide);
    if (!guide) return;
    guide.setup.forEach((entry) => addEquipment(entry.equipment, entry.x, entry.y, entry.prefill ?? []));
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dropX = event.clientX - rect.left;
    const dropY = event.clientY - rect.top;

    const droppedType = event.dataTransfer.getData("equipment") as EquipmentType;
    if (droppedType) {
      addEquipment(droppedType, dropX - 70, dropY - 60);
      return;
    }

    const droppedChemical = event.dataTransfer.getData("chemical");
    if (droppedChemical) {
      const hit = findTopItemAtPoint(dropX, dropY);
      const targetVesselId = hit?.kind === "vessel" ? hit.id : null;
      openChemicalDrop(droppedChemical, dropX, dropY, targetVesselId);
    }
  };

  const confirmChemicalDrop = () => {
    if (!chemicalDropDraft) return;
    const chem = getChemical(chemicalDropDraft.formula);
    if (!chem || chemicalDropDraft.amount <= 0) return;

    const entry: ContentEntry = {
      formula: chem.formula,
      amount: chemicalDropDraft.amount,
      unit: chem.state === "solid" ? "g" : "mL",
      form: chem.state === "solid" ? chemicalDropDraft.form : undefined,
    };

    if (chemicalDropDraft.targetVesselId) {
      setPlacedItems((prev) =>
        recomputeAllVessels(prev.map((item) => (item.id === chemicalDropDraft.targetVesselId ? { ...item, contents: [...item.contents, entry] } : item)))
      );
      setSelectedId(chemicalDropDraft.targetVesselId);
      setChemicalDropDraft(null);
      return;
    }

    if (chem.state === "gas") {
      addEquipment("gas_tank", chemicalDropDraft.x - 70, chemicalDropDraft.y - 92, [], {
        sourceChemical: chem.formula,
        toolActive: true,
        toolLevel: 72,
      });
      setChemicalDropDraft(null);
      return;
    }

    addEquipment("reagent_bottle", chemicalDropDraft.x - 70, chemicalDropDraft.y - 92, [entry], {
      sourceChemical: chem.formula,
    });
    setChemicalDropDraft(null);
  };

  const addSubstance = () => {
    if (!selectedItem || selectedItem.kind !== "vessel" || entryAmount <= 0) return;
    const chem = getChemical(selectedChemical);
    if (!chem) return;
    const entry: ContentEntry = {
      formula: chem.formula,
      amount: entryAmount,
      unit: chem.state === "solid" ? "g" : "mL",
      form: chem.state === "solid" ? solidForm : undefined,
    };
    setPlacedItems((prev) => recomputeAllVessels(prev.map((item) => (item.id === selectedItem.id ? { ...item, contents: [...item.contents, entry] } : item))));
  };

  const removeContent = (index: number) => {
    if (!selectedItem || selectedItem.kind !== "vessel") return;
    setPlacedItems((prev) => recomputeAllVessels(prev.map((item) => (item.id === selectedItem.id ? { ...item, contents: item.contents.filter((_, i) => i !== index) } : item))));
  };

  const toggleToolActive = () => {
    if (!selectedItem || selectedItem.kind === "vessel") return;
    setPlacedItems((prev) => recomputeAllVessels(prev.map((item) => (item.id === selectedItem.id ? { ...item, toolActive: !item.toolActive } : item))));
  };

  const setToolLevel = (nextLevel: number) => {
    if (!selectedItem || selectedItem.kind === "vessel") return;
    setPlacedItems((prev) => recomputeAllVessels(prev.map((item) => (item.id === selectedItem.id ? { ...item, toolLevel: nextLevel } : item))));
  };

  const setThermometerTarget = (targetId: string) => {
    if (!selectedItem || selectedItem.type !== "thermometer") return;
    setPlacedItems((prev) => prev.map((item) => (item.id === selectedItem.id ? { ...item, measureTargetId: targetId || null } : item)));
  };

  const deleteSelectedEquipment = () => {
    if (!selectedItem) return;
    const deleteId = selectedItem.id;
    setPlacedItems((prev) => recomputeAllVessels(prev.filter((item) => item.id !== deleteId).map((item) => {
      if (item.kind === "vessel" && item.attachedTo === deleteId) {
        return { ...item, attachedTo: null };
      }
      if (item.type === "thermometer" && item.measureTargetId === deleteId) {
        return { ...item, measureTargetId: null };
      }
      return item;
    })));
    setSelectedId(null);
  };

  const exportCSV = () => {
    const header = "time_s,pH,temperature_c,acid_eq_m,base_eq_m,ionic_strength";
    const lines = telemetry.map((p) => `${p.t},${p.pH},${p.temperatureC},${p.acidEqM},${p.baseEqM},${p.ionicStrength}`);
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vicl_telemetry.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const vessels = placedItems.filter((item) => item.kind === "vessel");
    const reactionCount = vessels.reduce((sum, vessel) => sum + vessel.state.reactions.length, 0);
    const gasEvents = vessels.filter((vessel) => vessel.state.gasType).length;
    const precipitateEvents = vessels.filter((vessel) => vessel.state.precipitateType).length;
    const avgPH = vessels.length ? vessels.reduce((sum, vessel) => sum + vessel.state.pH, 0) / vessels.length : 7;
    const avgTemp = vessels.length ? vessels.reduce((sum, vessel) => sum + vessel.state.temperatureC, 0) / vessels.length : 25;
    const maxTemp = vessels.length ? Math.max(...vessels.map((vessel) => vessel.state.temperatureC)) : 25;
    const totalVolumeMl = vessels.reduce((sum, vessel) => sum + vessel.contents.reduce((inner, entry) => inner + effectiveLiquidVolumeMl(entry), 0), 0);
    const totalMoles = vessels.reduce((sum, vessel) => sum + vessel.contents.reduce((inner, entry) => inner + toMoles(entry), 0), 0);
    return {
      equipmentCount: placedItems.length,
      vesselCount: vessels.length,
      reactionCount,
      gasEvents,
      precipitateEvents,
      avgPH: Number(avgPH.toFixed(3)),
      avgTemp: Number(avgTemp.toFixed(3)),
      maxTemp: Number(maxTemp.toFixed(3)),
      totalVolumeMl: Number(totalVolumeMl.toFixed(1)),
      totalMoles: Number(totalMoles.toFixed(4)),
    };
  }, [placedItems]);

  const selectedMassEstimate = useMemo(() => {
    if (!selectedItem || selectedItem.kind !== "vessel") return 0;
    const vesselMass = 120 + selectedItem.width * 0.22;
    const contentMass = selectedItem.contents.reduce((sum, entry) => {
      if (entry.unit === "mL") return sum + entry.amount * 1.02;
      return sum + entry.amount;
    }, 0);
    return Number((vesselMass + contentMass).toFixed(2));
  }, [selectedItem]);

  const gasLinkedVesselIds = useMemo(
    () =>
      new Set(
        placedItems
          .filter((item) => item.type === "gas_tank")
          .map((tank) => getTankTarget(tank, placedItems)?.id)
          .filter((id): id is string => Boolean(id))
      ),
    [placedItems]
  );

  const getThermometerReading = (thermometer: PlacedEquipment) => {
    if (thermometer.type !== "thermometer") return AMBIENT_TEMPERATURE_C;
    if (!thermometer.measureTargetId) return AMBIENT_TEMPERATURE_C;
    const target = placedItems.find((item) => item.id === thermometer.measureTargetId);
    if (!target || target.kind !== "vessel") return AMBIENT_TEMPERATURE_C;
    return target.state.temperatureC;
  };

  const reactionReport = useMemo(() => {
    const selectedVesselReaction =
      selectedItem?.kind === "vessel" && selectedItem.state.reactions.length > 0
        ? selectedItem.state.reactions[selectedItem.state.reactions.length - 1]
        : null;
    if (selectedVesselReaction) return selectedVesselReaction;

    const freshestVesselReaction = placedItems
      .filter((item): item is PlacedEquipment => item.kind === "vessel" && item.state.reactions.length > 0)
      .sort((a, b) => (b.state.lastReactionAt ?? 0) - (a.state.lastReactionAt ?? 0))[0]
      ?.state.reactions.slice(-1)[0];
    if (freshestVesselReaction) return freshestVesselReaction;

    const latestReaction = reactionFeed[reactionFeed.length - 1];
    if (latestReaction) return latestReaction;
    const targetVessel =
      selectedItem?.kind === "vessel"
        ? selectedItem
        : [...placedItems].reverse().find((item) => item.kind === "vessel" && item.contents.length > 0);
    if (!targetVessel || targetVessel.kind !== "vessel") {
      return null;
    }
    const fallback = buildPassiveEquation(targetVessel.contents);
    return {
      id: "fallback_report",
      reactionType: "Mixture State",
      equation: fallback.equation,
      balancedEquation: fallback.equation,
      products: fallback.products,
      explanation: [fallback.description],
      aiSummary: "AI summary: no dominant transformation detected, so the system reports a stable mixture state.",
      limitingReagent: fallback.limitingReagent,
      extentMol: 0,
      deltaTempC: 0,
      inferred: true,
    } as ReactionResult;
  }, [placedItems, reactionFeed, selectedItem]);

  const reportReactants = useMemo(() => {
    if (selectedItem?.kind === "vessel" && selectedItem.contents.length > 0) {
      return Array.from(new Set(selectedItem.contents.map((entry) => entry.formula)));
    }
    const latestVessel = [...placedItems].reverse().find((item) => item.kind === "vessel" && item.contents.length > 0);
    if (latestVessel?.kind === "vessel") {
      return Array.from(new Set(latestVessel.contents.map((entry) => entry.formula)));
    }
    if (!reactionReport) return [];
    return parseEquationReactants(reactionReport.balancedEquation || reactionReport.equation);
  }, [selectedItem, placedItems, reactionReport]);

  const reportStages = useMemo(() => {
    if (!reactionReport) return null;
    return buildOutputStages(reactionReport, reportReactants);
  }, [reactionReport, reportReactants]);

  return (
    <div className={theme === "dark" ? "dark theme-dark" : "theme-light"} data-theme={theme}>
      <div className="app-bg min-h-screen text-slate-900 transition-colors duration-300 dark:text-slate-100">
        <header className="app-header sticky top-0 z-20 border-b backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-violet-600 dark:text-violet-400">VIRTUAL INTERACTIVE CHEMISTRY LAB</p>
              <h1 className="text-2xl font-bold tracking-tight">VICL</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-slate-300 bg-slate-100 p-1 text-sm dark:border-slate-700 dark:bg-slate-900">
                <button onClick={() => setMode("free")} className={`rounded-full px-3 py-1 ${mode === "free" ? "bg-white shadow dark:bg-slate-800" : "text-slate-600 dark:text-slate-300"}`}>
                  Free
                </button>
                <button onClick={() => setMode("guided")} className={`rounded-full px-3 py-1 ${mode === "guided" ? "bg-white shadow dark:bg-slate-800" : "text-slate-600 dark:text-slate-300"}`}>
                  Guided
                </button>
              </div>
              <button onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))} className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                {theme === "dark" ? "Light" : "Dark"}
              </button>
              <button onClick={resetLab} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                Reset Lab
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-[300px_1fr_390px]">
          <section className="ui-panel space-y-4 rounded-2xl border p-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Equipment</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Drag equipment into the lab workspace.</p>
            </div>
            <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
              {(Object.keys(EQUIPMENT_DEFS) as EquipmentType[]).map((type) => (
                <button
                  key={type}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("equipment", type)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-violet-400 hover:bg-violet-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <span>{EQUIPMENT_DEFS[type].label}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{EQUIPMENT_DEFS[type].icon}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Chemical Library</h3>
              <input
                value={chemicalQuery}
                onChange={(event) => setChemicalQuery(event.target.value)}
                placeholder="Search formula, name, role"
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              <div className="mt-2 flex items-center gap-2">
                <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} className="w-1/2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950">
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role === "all" ? "All categories" : role}
                    </option>
                  ))}
                </select>
                <select value={chemicalSort} onChange={(event) => setChemicalSort(event.target.value as ChemicalSort)} className="w-1/2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950">
                  <option value="formula_asc">Formula A-Z</option>
                  <option value="formula_desc">Formula Z-A</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                </select>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Showing {filteredChemicals.length} of {catalogChemicals.length} chemicals</p>
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
                {filteredChemicals.map((chemical) => (
                  <div
                    key={`${chemical.formula}_${chemical.name}`}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("chemical", chemical.formula)}
                    className="cursor-grab rounded-md bg-slate-50 px-2 py-1.5 text-xs active:cursor-grabbing dark:bg-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{chemical.formula}</p>
                      <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400">{chemical.role}</p>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">{chemical.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{chemical.state}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">bp: {typeof getBoilingPointC(chemical) === "number" ? `${getBoilingPointC(chemical)?.toFixed(1)} C` : "n/a"}</p>
                  </div>
                ))}
                {!filteredChemicals.length && <p className="text-xs text-slate-500 dark:text-slate-400">No chemicals match this filter.</p>}
              </div>
            </div>

            {mode === "guided" && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Guided Experiments</h3>
                <select value={activeGuide} onChange={(event) => setActiveGuide(event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                  {GUIDES.map((guide) => (
                    <option key={guide.id} value={guide.id}>
                      {guide.name}
                    </option>
                  ))}
                </select>
                <button onClick={loadGuide} className="mt-2 w-full rounded-md bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500">
                  Load Guide
                </button>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{GUIDES.find((guide) => guide.id === activeGuide)?.goal}</p>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div
              ref={canvasRef}
              onDrop={handleCanvasDrop}
              onDragOver={(event) => event.preventDefault()}
              onPointerMove={(event) => {
                if (!dragging || !canvasRef.current) return;
                const rect = canvasRef.current.getBoundingClientRect();
                const nextX = event.clientX - rect.left - dragging.dx;
                const nextY = event.clientY - rect.top - dragging.dy;

                setPlacedItems((prev) => {
                  const draggedItem = prev.find((item) => item.id === dragging.id);
                  if (!draggedItem) return prev;

                  const boundedX = clamp(nextX, 0, rect.width - draggedItem.width);
                  const boundedY = clamp(nextY, 0, rect.height - draggedItem.height);

                  let preview: { vesselId: string; targetId: string } | null = null;
                  let snapX = boundedX;
                  let snapY = boundedY;
                  if (draggedItem.kind === "vessel") {
                    const mockVessel = { ...draggedItem, x: boundedX, y: boundedY };
                    const target = prev
                      .filter((item) => item.kind !== "vessel" && canAttach(mockVessel, item))
                      .sort((a, b) => {
                        const aAnchorX = a.x + a.width / 2 - draggedItem.width / 2;
                        const aAnchorY = a.y - draggedItem.height + getAttachYOffset(a.type);
                        const bAnchorX = b.x + b.width / 2 - draggedItem.width / 2;
                        const bAnchorY = b.y - draggedItem.height + getAttachYOffset(b.type);
                        const da = Math.hypot(aAnchorX - boundedX, aAnchorY - boundedY);
                        const db = Math.hypot(bAnchorX - boundedX, bAnchorY - boundedY);
                        return da - db;
                      })[0];
                    if (target) {
                      preview = { vesselId: draggedItem.id, targetId: target.id };
                      snapX = clamp(target.x + target.width / 2 - draggedItem.width / 2, 0, rect.width - draggedItem.width);
                      snapY = clamp(target.y - draggedItem.height + getAttachYOffset(target.type), 0, rect.height - draggedItem.height);
                    }
                  }
                  if (draggedItem.type === "gas_tank") {
                    // Keep gas routing explicit via inspector pipe target.
                    // Dragging a tank should not silently rewire it to a nearby vessel.
                    preview = null;
                  }
                  setAttachPreview(preview);

                  const nextItems = prev.map((item) => {
                    if (item.id === dragging.id) {
                      if (draggedItem.kind === "vessel") {
                        return { ...item, x: snapX, y: snapY, attachedTo: preview?.targetId ?? null };
                      }
                      if (draggedItem.type === "gas_tank") {
                        return { ...item, x: boundedX, y: boundedY };
                      }
                      return { ...item, x: boundedX, y: boundedY, attachedTo: item.attachedTo };
                    }

                    if (draggedItem.kind !== "vessel" && item.attachedTo === draggedItem.id) {
                      return {
                        ...item,
                        x: boundedX + draggedItem.width / 2 - item.width / 2,
                        y: boundedY - item.height + getAttachYOffset(draggedItem.type),
                      };
                    }
                    return item;
                  });

                  return recomputeAllVessels(nextItems);
                });
              }}
              onPointerUp={() => {
                setDragging(null);
                setAttachPreview(null);
              }}
               className="lab-canvas relative h-[600px] overflow-hidden rounded-2xl border"
            >
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-slate-400/35 dark:bg-slate-700/35" />
              {placedItems.length === 0 && <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">Drag equipment onto the bench to begin.</p>}

              {placedItems.map((item) => {
                const isSelected = item.id === selectedId;
                const isReacting = item.state.lastReactionAt && Date.now() - item.state.lastReactionAt < 1200;
                const isIgnited = (ignitions[item.id] ?? 0) > Date.now();
                const totalLiquid = item.contents.reduce((sum, entry) => sum + (entry.unit === "mL" ? entry.amount : 0), 0);
                const fillRatio = item.capacityMl > 0 ? Math.min(totalLiquid / item.capacityMl, 1) : 0;
                const solids = item.contents.filter((entry) => getChemical(entry.formula)?.state === "solid");
                const autoAttachGlow = attachPreview && attachPreview.targetId === item.id;
                const boilingIntensity = item.state.smokeLevel;
                const hasValidPipeTarget = item.type === "gas_tank" ? Boolean(getTankTarget(item, placedItems)) : false;
                const ventingToAir = item.type === "gas_tank" && item.toolActive && !hasValidPipeTarget;
                const hasAirtightLid = item.kind === "vessel" && gasLinkedVesselIds.has(item.id);
                const lid = hasAirtightLid ? getLidGeometry(item.type) : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      bringItemToFront(item.id);
                    }}
                    onPointerDown={(event) => {
                      const box = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                      setSelectedId(item.id);
                      bringItemToFront(item.id);
                      setDragging({ id: item.id, dx: event.clientX - box.left, dy: event.clientY - box.top });
                    }}
                    className={`absolute select-none transition ${isReacting ? "reaction-flash" : ""}`}
                    style={{ left: item.x, top: item.y, width: item.width, height: item.height, zIndex: isSelected ? 30 : item.kind === "vessel" ? 18 : 10 }}
                  >
                    <p className={`mb-1 text-center text-[10px] font-semibold uppercase tracking-wide ${isSelected ? "text-violet-600 dark:text-violet-400" : "text-slate-500 dark:text-slate-400"}`}>
                      {EQUIPMENT_DEFS[item.type].label}
                    </p>
                    {item.sourceChemical && <p className="-mt-1 mb-1 text-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">{item.sourceChemical}</p>}

                    {item.kind === "vessel" ? (
                      <svg viewBox="0 0 140 176" className={`h-[calc(100%-14px)] w-full ${isSelected ? "drop-shadow-[0_0_12px_rgba(139,92,246,0.35)]" : ""}`}>
                        <defs>
                          <clipPath id={`clip_${item.id}`}>
                            <path d={getVesselPath(item.type)} />
                          </clipPath>
                        </defs>
                        <path d={getVesselPath(item.type)} fill={theme === "dark" ? "rgba(15,23,42,0.65)" : "rgba(255,255,255,0.86)"} stroke={theme === "dark" ? "#94a3b8" : "#334155"} strokeWidth="2.2" />
                        {hasAirtightLid && lid && (
                          <>
                            <rect x={lid.x} y={lid.y} width={lid.w} height={lid.h} rx="4" fill={theme === "dark" ? "#334155" : "#475569"} />
                            <rect x={lid.knobX} y={Math.max(2, lid.y - 6)} width={lid.knobW} height={Math.max(5, lid.h - 1)} rx="2" fill={theme === "dark" ? "#64748b" : "#94a3b8"} />
                          </>
                        )}
                        <rect x="0" y={170 - fillRatio * 150} width="140" height={fillRatio * 150} fill={item.state.color} opacity={0.92} clipPath={`url(#clip_${item.id})`} />
                        {item.state.precipitateType && <rect x="14" y="152" width="112" height="14" fill="#d1a64f" opacity={item.state.separated ? 0.95 : 0.7} clipPath={`url(#clip_${item.id})`} />}
                        {solids.map((entry, idx) =>
                          Array.from({ length: Math.min(8, Math.max(2, Math.round(entry.amount / 2))) }).map((_, dot) => {
                            const x = 24 + ((dot * 17 + idx * 9) % 90);
                            const y = 146 - (dot % 2) * 6;
                            const form = entry.form ?? "pellets";
                            if (form === "cube") {
                              return <rect key={`${entry.formula}_${idx}_${dot}`} x={x} y={y} width="5" height="5" fill="#d1d5db" clipPath={`url(#clip_${item.id})`} />;
                            }
                            if (form === "powder") {
                              return <circle key={`${entry.formula}_${idx}_${dot}`} cx={x} cy={y} r="1.8" fill="#e5e7eb" clipPath={`url(#clip_${item.id})`} />;
                            }
                            return <circle key={`${entry.formula}_${idx}_${dot}`} cx={x} cy={y} r="2.8" fill="#cbd5e1" clipPath={`url(#clip_${item.id})`} />;
                          })
                        )}
                        {item.state.gasType &&
                          Array.from({ length: 8 }).map((_, i) => (
                            <circle
                              key={`${item.id}_bubble_${i}`}
                              className="bubble-svg"
                              cx={24 + i * 12}
                              cy={140}
                              r="2"
                              style={{ animationDelay: `${i * 0.17}s`, animationDuration: `${1.2 + (i % 3) * 0.24}s` }}
                            />
                          ))}
                        {item.state.boilingCompounds.length > 0 &&
                          Array.from({ length: 9 }).map((_, i) => (
                            <circle
                              key={`${item.id}_steam_${i}`}
                              className="steam-svg"
                              cx={28 + i * 10}
                              cy={96}
                              r={2 + (i % 2)}
                              style={{
                                opacity: 0.28 + boilingIntensity * 0.5,
                                animationDelay: `${i * 0.14}s`,
                                animationDuration: `${1.6 - Math.min(0.45, boilingIntensity * 0.5)}s`,
                              }}
                            />
                          ))}
                        {item.state.smokeLevel > 0.45 &&
                          Array.from({ length: 4 }).map((_, i) => (
                            <circle
                              key={`${item.id}_smoke_${i}`}
                              className="smoke-svg"
                              cx={42 + i * 18}
                              cy={82}
                              r={4 + i}
                              style={{ animationDelay: `${i * 0.2}s`, opacity: 0.18 + item.state.smokeLevel * 0.3 }}
                            />
                          ))}
                        {isIgnited && (
                          <>
                            <circle cx="70" cy="56" r="14" className="vessel-blast-core" fill="rgba(251,146,60,0.9)" />
                            <circle cx="70" cy="56" r="24" className="vessel-blast-ring" fill="none" stroke="rgba(253,186,116,0.85)" strokeWidth="3.5" />
                            <path d="M70 22 C90 44 88 74 70 90 C52 74 50 44 70 22 Z" className="vessel-blast-plume" fill={`url(#flameGrad_${item.id})`} />
                            <defs>
                              <linearGradient id={`flameGrad_${item.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fef08a" />
                                <stop offset="45%" stopColor="#fb923c" />
                                <stop offset="100%" stopColor="#b91c1c" />
                              </linearGradient>
                            </defs>
                          </>
                        )}
                      </svg>
                    ) : (
                      <div className={`h-[calc(100%-14px)] w-full rounded-xl border ${isSelected ? "border-violet-400" : "border-slate-300 dark:border-slate-600"} ${autoAttachGlow ? "ring-2 ring-emerald-400" : ""} bg-slate-100 dark:bg-slate-800`}>
                        {item.type === "hot_plate" && (
                          <div className="relative mx-auto mt-2 h-16 w-[84%] rounded-lg border border-slate-500 bg-gradient-to-b from-slate-700 to-slate-800">
                            <div className={`mx-auto mt-1 h-3 w-[88%] rounded bg-slate-500 ${item.toolActive ? "heat-shimmer" : ""}`} />
                            <div className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-emerald-400" style={{ opacity: item.toolActive ? 1 : 0.2 }} />
                            <div className="absolute bottom-1 right-2 h-3 w-3 rounded-full border border-slate-300 bg-slate-700" />
                            <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-slate-200">{item.toolLevel.toFixed(0)} C</p>
                          </div>
                        )}
                        {item.type === "bunsen_burner" && (
                          <div className="relative mx-auto mt-2 h-16 w-12">
                            <div className="mx-auto h-10 w-2 rounded bg-slate-500" />
                            <div className="mx-auto mt-2 h-3 w-12 rounded-full bg-slate-600" />
                            {item.toolActive && (
                              <>
                                <div className="bunsen-flame-outer" />
                                <div className="bunsen-flame-inner" />
                              </>
                            )}
                          </div>
                        )}
                        {item.type === "centrifuge" && (
                          <div className="relative mx-auto mt-2 h-16 w-24 rounded-2xl border border-slate-500 bg-gradient-to-b from-slate-700 to-slate-800">
                            <div className="absolute left-1/2 top-1 h-4 w-14 -translate-x-1/2 rounded-full bg-slate-500" />
                            <div className={`absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-300 ${item.toolActive ? "spin-on" : ""}`}>
                              <div className="absolute left-1/2 top-1/2 h-1 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300" />
                              <div className="absolute left-1/2 top-1/2 h-7 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300" />
                            </div>
                          </div>
                        )}
                        {item.type === "weighing_scale" && (
                          <div className="mx-auto mt-3 h-12 w-[82%] rounded-md bg-slate-600 p-2">
                            <div className="h-4 rounded bg-emerald-300/80 text-center text-[10px] font-semibold text-slate-800">{selectedItem?.kind === "vessel" ? `${selectedMassEstimate} g` : "0.00 g"}</div>
                          </div>
                        )}
                        {item.type === "heating_mantle" && (
                          <div className="relative mx-auto mt-3 h-12 w-[84%] rounded-b-md rounded-t-[42%] border border-slate-500 bg-gradient-to-b from-slate-500 to-slate-700">
                            <div className="absolute inset-x-4 top-2 h-6 rounded-t-full border border-slate-400 bg-slate-800/70" />
                            {item.toolActive && <div className="absolute inset-x-5 top-3 h-4 rounded-t-full bg-orange-400/55 heat-shimmer" />}
                            <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] text-slate-200">{item.toolLevel.toFixed(0)} C</p>
                          </div>
                        )}
                        {item.type === "water_bath" && (
                          <div className="relative mx-auto mt-3 h-12 w-[86%] rounded-md border border-slate-500 bg-gradient-to-b from-slate-600 to-slate-700">
                            <div className="absolute inset-x-2 bottom-2 h-5 rounded bg-sky-300/75" />
                            <div className="absolute inset-x-4 bottom-6 h-1 rounded bg-sky-100/70" />
                            {item.toolActive && <div className="absolute inset-x-3 top-1.5 h-2 rounded bg-orange-400/45" />}
                            <p className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] text-slate-200">{item.toolLevel.toFixed(0)} C</p>
                          </div>
                        )}
                        {item.type === "thermometer" && (
                          <div className="mx-auto mt-3 h-11 w-[84%] rounded-md bg-slate-600 p-2 text-center text-xs text-emerald-300">{getThermometerReading(item).toFixed(2)} C</div>
                        )}
                        {item.type === "magnetic_stirrer" && (
                          <div className="relative mx-auto mt-3 h-12 w-[82%] rounded-md bg-slate-600">
                            <div className={`absolute left-1/2 top-1/2 h-2 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200 ${item.toolActive ? "spin-on" : ""}`} />
                          </div>
                        )}
                        {item.type === "tripod_stand" && (
                          <div className="relative mx-auto mt-2 h-16 w-[82%]">
                            <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-500" />
                            <div className="absolute left-3 top-3 h-11 w-1 -rotate-[20deg] rounded bg-slate-500" />
                            <div className="absolute left-1/2 top-3 h-11 w-1 -translate-x-1/2 rounded bg-slate-500" />
                            <div className="absolute right-3 top-3 h-11 w-1 rotate-[20deg] rounded bg-slate-500" />
                            <div className="absolute left-4 top-[52px] h-1 w-10 rounded bg-slate-500" />
                            <div className="absolute right-4 top-[52px] h-1 w-10 rounded bg-slate-500" />
                          </div>
                        )}
                        {item.type === "ice_bath" && (
                          <div className="relative mx-auto mt-3 h-12 w-[86%] rounded-md border border-slate-500 bg-gradient-to-b from-slate-600 to-slate-700">
                            <div className="absolute inset-x-2 bottom-2 h-5 rounded bg-cyan-300/70" />
                            <div className="absolute left-3 top-3 h-3.5 w-3.5 rotate-12 rounded-sm border border-cyan-100/80 bg-cyan-100/90" />
                            <div className="absolute left-8 top-4 h-2.5 w-2.5 rotate-6 rounded-sm border border-cyan-100/80 bg-cyan-100/90" />
                            <div className="absolute right-5 top-3 h-3 w-3 -rotate-12 rounded-sm border border-cyan-100/80 bg-cyan-100/90" />
                            <p className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] text-slate-200">{item.toolLevel.toFixed(0)} C</p>
                          </div>
                        )}
                        {item.type === "reflux_condenser" && (
                          <div className="relative mx-auto mt-1 h-[90%] w-12 rounded-full border-2 border-slate-300 bg-gradient-to-b from-slate-300 to-slate-500">
                            <div className="mx-auto mt-2 h-[78%] w-2 rounded bg-sky-300/70" />
                            <div className="absolute left-0 top-8 h-1.5 w-4 rounded bg-slate-300" />
                            <div className="absolute right-0 top-14 h-1.5 w-4 rounded bg-slate-300" />
                          </div>
                        )}
                        {item.type === "gas_tank" && (
                          <div className="relative mx-auto mt-1 h-[90%] w-16 rounded-3xl border-2 border-slate-300 bg-gradient-to-b from-slate-400 to-slate-600">
                            <div className="mx-auto mt-2 h-3 w-8 rounded-full bg-slate-700" />
                            <div className="mx-auto mt-2 h-8 w-9 rounded-md border border-slate-300 bg-slate-800 text-center text-[10px] leading-8 text-emerald-300">
                              {item.sourceChemical ?? "Gas"}
                            </div>
                            <div className={`absolute -right-3 top-1/2 h-2 w-5 -translate-y-1/2 rounded-full ${item.toolActive ? "bg-emerald-400" : "bg-slate-500"}`} />
                            {ventingToAir && (
                              <>
                                <div className="air-vent-cloud absolute right-[-24px] top-[48%] h-3.5 w-5.5 rounded-full" style={{ animationDelay: "0s" }} />
                                <div className="air-vent-cloud absolute right-[-32px] top-[40%] h-4.5 w-7 rounded-full" style={{ animationDelay: "0.25s" }} />
                                <div className="air-vent-cloud absolute right-[-40px] top-[52%] h-5 w-8 rounded-full" style={{ animationDelay: "0.45s" }} />
                              </>
                            )}
                          </div>
                        )}
                        {item.type === "match" && (
                          <div className="relative mx-auto mt-4 h-10 w-[86%]">
                            <div className="absolute left-2 top-3 h-1.5 w-[78%] rounded-full bg-amber-800" />
                            <div className="absolute right-2 top-1 h-5 w-2 rounded-sm bg-rose-700" />
                            {item.toolActive && <div className="match-flame absolute right-0 top-0 h-6 w-4" />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {placedItems
                  .filter((item) => item.type === "gas_tank" && item.toolActive)
                  .map((tank) => {
                    const target = getTankTarget(tank, placedItems);
                    if (!target) return null;
                    const x1 = tank.x + tank.width;
                    const y1 = tank.y + tank.height / 2;
                    const x2 = target.x + target.width * 0.56;
                    const y2 = target.y + target.height * 0.25;
                    return <path key={`${tank.id}_${target.id}`} d={`M${x1} ${y1} C ${x1 + 36} ${y1}, ${x2 - 36} ${y2}, ${x2} ${y2}`} stroke="#22c55e" strokeWidth="3" fill="none" strokeDasharray="6 4" />;
                  })}
              </svg>
              {labExplosionUntil > Date.now() && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="lab-flash absolute inset-0" />
                  <div className="lab-blast-core absolute h-44 w-44 rounded-full" />
                  <div className="lab-blast-wave absolute h-72 w-72 rounded-full border-4 border-orange-300/80" />
                  <div className="lab-blast-ring absolute h-[480px] w-[480px] rounded-full border-2 border-amber-200/50" />
                  <div className="lab-blast-debris absolute h-[560px] w-[560px] rounded-full border border-rose-200/30" />
                  <p className="absolute top-8 rounded-full bg-rose-600/85 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                    AIR IGNITION: {labExplosionGas ?? "FLAMMABLE GAS"}
                  </p>
                </div>
              )}
            </div>

            {chemicalDropDraft && (
              <div className="ui-panel rounded-2xl border p-3">
                <p className="text-sm font-semibold">Add {chemicalDropDraft.formula}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {chemicalDropDraft.targetVesselId ? "Dropped on vessel: choose quantity and form." : "Dropped on open space: create a labeled source container."}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={chemicalDropDraft.amount}
                    onChange={(event) => setChemicalDropDraft((prev) => (prev ? { ...prev, amount: Number(event.target.value) } : prev))}
                    className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  {getChemical(chemicalDropDraft.formula)?.state === "solid" ? (
                    <select
                      value={chemicalDropDraft.form}
                      onChange={(event) => setChemicalDropDraft((prev) => (prev ? { ...prev, form: event.target.value as SolidForm } : prev))}
                      className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="pellets">Pellets</option>
                      <option value="cube">Cube</option>
                      <option value="powder">Powder</option>
                    </select>
                  ) : (
                    <div className="rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-300">
                      Form: default ({getChemical(chemicalDropDraft.formula)?.state})
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={confirmChemicalDrop} className="flex-1 rounded-md bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500">
                      Confirm
                    </button>
                    <button onClick={() => setChemicalDropDraft(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="ui-panel rounded-2xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Scientific Output</h2>
                <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  Export CSV
                </button>
              </div>
              {reactionReport ? (
                <div className="space-y-3 text-sm">
                  <p className="font-semibold text-violet-600 dark:text-violet-400">{reactionReport.reactionType}</p>
                  {reportStages && (
                    <>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stage 1: Dissociation State</p>
                        {reportStages.stage1.map((line, index) => (
                          <p key={`report_s1_${index}`} className="font-mono text-xs text-slate-700 dark:text-slate-200">
                            {line}
                          </p>
                        ))}
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stage 2: Reaction Mechanism</p>
                        {reportStages.stage2.map((line, index) => (
                          <p key={`report_s2_${index}`} className="text-xs text-slate-700 dark:text-slate-200">
                            {line}
                          </p>
                        ))}
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stage 3: Final Products</p>
                        {reportStages.stage3.map((line, index) => (
                          <p key={`report_s3_${index}`} className="font-mono text-xs text-slate-700 dark:text-slate-200">
                            {line}
                          </p>
                        ))}
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stage 4: Summary</p>
                        <p className="text-xs text-sky-700 dark:text-sky-300">{reportStages.stage4}</p>
                      </div>
                      {reportStages.stage5 && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/70">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stage 5: Physics (Optional)</p>
                          {reportStages.stage5.map((line, index) => (
                            <p key={`report_s5_${index}`} className="text-xs text-slate-700 dark:text-slate-200">
                              {line}
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Output Timeline</p>
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {reactionFeed.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400">No generated outputs yet.</p>}
                      {reactionFeed.map((entry, idx) => {
                        const entryStages = buildOutputStages(entry, parseEquationReactants(entry.balancedEquation || entry.equation));
                        return (
                          <div key={reactionSignature(entry)} className="rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800/70">
                            <p className="font-semibold text-violet-600 dark:text-violet-300">Stage {idx + 1}: {entry.reactionType}</p>
                            <p className="font-semibold text-slate-500 dark:text-slate-400">1) Dissociation</p>
                            {entryStages.stage1.map((line) => (
                              <p key={`${entry.id}_s1_${line}`} className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                {line}
                              </p>
                            ))}
                            <p className="mt-1 font-semibold text-slate-500 dark:text-slate-400">2) Mechanism</p>
                            {entryStages.stage2.map((line) => (
                              <p key={`${entry.id}_s2_${line}`} className="text-[11px] text-slate-600 dark:text-slate-300">
                                {line}
                              </p>
                            ))}
                            <p className="mt-1 font-semibold text-slate-500 dark:text-slate-400">3) Final Products</p>
                            {entryStages.stage3.map((line) => (
                              <p key={`${entry.id}_s3_${line}`} className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                {line}
                              </p>
                            ))}
                            <p className="mt-1 font-semibold text-slate-500 dark:text-slate-400">4) Summary</p>
                            <p className="text-[11px] text-sky-700 dark:text-sky-300">{entryStages.stage4}</p>
                            {entryStages.stage5 && (
                              <>
                                <p className="mt-1 font-semibold text-slate-500 dark:text-slate-400">5) Physics (Optional)</p>
                                {entryStages.stage5.map((line) => (
                                  <p key={`${entry.id}_s5_${line}`} className="text-[11px] text-slate-600 dark:text-slate-300">
                                    {line}
                                  </p>
                                ))}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Add substances to a vessel to generate equations, limiting reagent, and visual effects.</p>
              )}
            </div>
          </section>

          <section className="ui-panel space-y-4 rounded-2xl border p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Inspector + Analytics</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Equipment: {stats.equipmentCount}</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Vessels: {stats.vesselCount}</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Reactions: {stats.reactionCount}</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Gas events: {stats.gasEvents}</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Precip events: {stats.precipitateEvents}</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Avg pH: {stats.avgPH}</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Avg temp: {stats.avgTemp} C</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Max temp: {stats.maxTemp} C</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Total volume: {stats.totalVolumeMl} mL</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Total moles: {stats.totalMoles}</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Air dominant: {labAir.dominantGas ?? "none"}</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Flammable index: {labAir.flammableIndex.toFixed(2)}</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Ignition potential: {labAir.ignitionPotential.toFixed(2)}</p>
              <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Oxygen: {(labAir.composition.O2 ?? 0).toFixed(2)}%</p>
            </div>

            <AtmospherePieChart composition={labAir.composition} dark={theme === "dark"} />
            <button
              onClick={clearAtmosphere}
              className="w-full rounded-md border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-700 hover:bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200 dark:hover:bg-cyan-900/50"
            >
              Clear Atmosphere Back To Normal
            </button>

            {selectedItem ? (
              <div className="space-y-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
                <p className="font-medium">Selected: {EQUIPMENT_DEFS[selectedItem.type].label}</p>
                <button onClick={deleteSelectedEquipment} className="w-full rounded-md border border-rose-300 px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/30">
                  Delete Equipment
                </button>

                {selectedItem.kind === "vessel" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">pH: {selectedItem.state.pH.toFixed(3)}</p>
                      <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Temp: {selectedItem.state.temperatureC.toFixed(2)} C</p>
                      <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Gas: {selectedItem.state.gasType ?? "none"}</p>
                      <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Precipitate: {selectedItem.state.precipitateType ?? "none"}</p>
                      <p className="col-span-2 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                        Phase change: {selectedItem.state.boilingCompounds.length ? `${selectedItem.state.boilingCompounds.join(", ")} liquid -> vapor` : "none"}
                      </p>
                      <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Attached: {selectedItem.attachedTo ? EQUIPMENT_DEFS[placedItems.find((item) => item.id === selectedItem.attachedTo)?.type ?? "beaker"].label : "none"}</p>
                      <p className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">Scale estimate: {selectedMassEstimate} g</p>
                    </div>

                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Add Substance</label>
                    <select value={selectedChemical} onChange={(event) => setSelectedChemical(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                      {filteredChemicals.map((chemical) => (
                        <option key={`${chemical.formula}_${chemical.name}`} value={chemical.formula}>
                          {chemical.formula} ({chemical.name})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={selectedChemicalDef?.state === "solid" ? 0.1 : 1}
                      step={selectedChemicalDef?.state === "solid" ? 0.1 : 1}
                      value={entryAmount}
                      onChange={(event) => setEntryAmount(Number(event.target.value))}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                    {selectedChemicalDef?.state === "solid" && (
                      <select value={solidForm} onChange={(event) => setSolidForm(event.target.value as SolidForm)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                        <option value="pellets">Pellets</option>
                        <option value="cube">Cube</option>
                        <option value="powder">Powder</option>
                      </select>
                    )}
                    <button onClick={addSubstance} className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500">
                      Add {selectedChemicalDef?.state === "solid" ? "Solid (g)" : selectedChemicalDef?.state === "gas" ? "Gas (mL eq)" : "Liquid (mL)"}
                    </button>

                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Contents</h3>
                      <div className="max-h-28 space-y-1 overflow-y-auto">
                        {selectedItem.contents.length > 0 ? (
                          selectedItem.contents.map((entry, index) => (
                            <div key={`${entry.formula}_${index}`} className="flex items-center justify-between rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                              <p>
                                {entry.formula} - {entry.amount} {entry.unit}
                                {entry.form ? ` (${entry.form})` : ""}
                              </p>
                              <button onClick={() => removeContent(index)} className="text-rose-600 hover:text-rose-500">
                                Remove
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400">No contents yet.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Move a vessel above this tool to auto-attach. Snap and alignment happen while hovering.</p>
                    {selectedItem.type === "thermometer" && (
                      <>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Measurement Target</label>
                        <select
                          value={selectedItem.measureTargetId ?? ""}
                          onChange={(event) => setThermometerTarget(event.target.value)}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                        >
                          <option value="">Ambient ({AMBIENT_TEMPERATURE_C.toFixed(2)} C)</option>
                          {placedItems
                            .filter((item) => item.kind === "vessel")
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {EQUIPMENT_DEFS[item.type].label} ({item.id.slice(-4)})
                              </option>
                            ))}
                        </select>
                      </>
                    )}
                    {selectedItem.type === "gas_tank" && (
                      <>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Gas Source</label>
                        <select
                          value={selectedItem.sourceChemical ?? "H2"}
                          onChange={(event) => {
                            const nextGas = event.target.value;
                            setPlacedItems((prev) => prev.map((item) => (item.id === selectedItem.id ? { ...item, sourceChemical: nextGas } : item)));
                          }}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                        >
                          {catalogChemicals
                            .filter((chemical) => chemical.state === "gas")
                            .map((chemical) => (
                              <option key={chemical.formula} value={chemical.formula}>
                                {chemical.formula} ({chemical.name})
                              </option>
                            ))}
                        </select>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Pipe Target</label>
                        <select
                          value={selectedItem.gasTargetId ?? ""}
                          onChange={(event) => {
                            const raw = event.target.value;
                            const nextTarget = raw === "" ? null : raw;
                            setPlacedItems((prev) => prev.map((item) => (item.id === selectedItem.id ? { ...item, gasTargetId: nextTarget } : item)));
                          }}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                        >
                          <option value="">Vent to lab air</option>
                          <option value={AIR_TARGET_ID}>Force vent to lab air</option>
                          {placedItems
                            .filter((item) => item.kind === "vessel")
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {EQUIPMENT_DEFS[item.type].label} ({item.id.slice(-4)})
                              </option>
                            ))}
                        </select>
                      </>
                    )}
                    <button onClick={toggleToolActive} className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600">
                      {selectedItem.toolActive ? "Turn Off" : "Turn On"}
                    </button>
                    {(selectedItem.kind === "heater" || selectedItem.type === "centrifuge" || selectedItem.type === "magnetic_stirrer" || selectedItem.type === "gas_tank") && (
                      <>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{getToolLevelLabel(selectedItem)}</label>
                        <input
                          type="range"
                          min={TEMP_CONTROLLED_TOOLS.has(selectedItem.type) ? getToolTemperatureBounds(selectedItem.type).min : 0}
                          max={TEMP_CONTROLLED_TOOLS.has(selectedItem.type) ? getToolTemperatureBounds(selectedItem.type).max : 100}
                          value={selectedItem.toolLevel}
                          onChange={(event) => setToolLevel(Number(event.target.value))}
                          className="w-full"
                        />
                      </>
                    )}
                  </>
                )}

                {mode === "guided" && (
                  <div>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Guide Steps</h3>
                    {GUIDES.find((guide) => guide.id === activeGuide)?.steps.map((step) => (
                      <p key={step} className="text-xs text-slate-600 dark:text-slate-300">
                        - {step}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Select equipment to inspect and control the experiment.</p>
            )}

            <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <PrecisionLineChart title="pH vs Time" data={telemetry} valueKey="pH" color="#8b5cf6" yLabel="pH" dark={theme === "dark"} />
              <PrecisionLineChart title="Temperature vs Time" data={telemetry} valueKey="temperatureC" color="#f97316" yLabel="C" dark={theme === "dark"} />
              <PrecisionLineChart title="Acid Equivalents (M)" data={telemetry} valueKey="acidEqM" color="#0ea5e9" yLabel="M" dark={theme === "dark"} />
              <PrecisionLineChart title="Ionic Strength Index" data={telemetry} valueKey="ionicStrength" color="#22c55e" yLabel="index" dark={theme === "dark"} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
