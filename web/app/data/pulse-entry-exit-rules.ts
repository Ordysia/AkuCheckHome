export type BlockSuspicion =
  | "POSSIBLE_BLOCK"
  | "CLEAR_BLOCK_SUSPICION"
  | "VERY_STRONG_BLOCK_SUSPICION";

export type EntryExitBlockRule = {
  id: string;
  exitMeridian: string;
  entryMeridian: string;
  transition: string;
  fullName: string;
  exitPoint: string;
  entryPoint: string;
  warning: string;
};

export type EntryExitBlockResult = EntryExitBlockRule & {
  exitValue: number;
  entryValue: number;
  difference: number;
  suspicion: BlockSuspicion;
  suspicionLabel: string;
};

const eyeWarning =
  "Punkt wejścia znajduje się przy oku. Nie naciskaj gałki ocznej. Stosuj wyłącznie bardzo delikatną stymulację, najlepiej po wcześniejszym instruktażu specjalisty.";
const chestWarning =
  "Punkty znajdują się w okolicy klatki piersiowej, piersi lub pachy. Nie stosuj głębokiego ani bolesnego ucisku. Przy ciąży, chorobach piersi, zmianach skórnych, urazie, bólu w klatce piersiowej lub przebytym zabiegu skonsultuj procedurę ze specjalistą.";
const templeWarning =
  "Punkt znajduje się w okolicy skroni i ucha. Stosuj wyłącznie delikatny, bezbolesny ucisk i przerwij przy zawrotach głowy lub pogorszeniu samopoczucia.";

export const entryExitBlockRules: EntryExitBlockRule[] = [
  {
    id: "SI_TO_BL",
    exitMeridian: "SI",
    entryMeridian: "BL",
    transition: "SI → BL",
    fullName: "Jelito Cienkie → Pęcherz Moczowy",
    exitPoint: "SI19",
    entryPoint: "BL1",
    warning: eyeWarning,
  },
  {
    id: "KI_TO_PC",
    exitMeridian: "KI",
    entryMeridian: "PC",
    transition: "KI → PC",
    fullName: "Nerki → Osierdzie",
    exitPoint: "KI22",
    entryPoint: "PC1 u mężczyzn / PC2 u kobiet",
    warning: chestWarning,
  },
  {
    id: "SJ_TO_GB",
    exitMeridian: "SJ",
    entryMeridian: "GB",
    transition: "SJ → GB",
    fullName: "Potrójny Ogrzewacz → Pęcherzyk Żółciowy",
    exitPoint: "SJ22",
    entryPoint: "GB1",
    warning: `${templeWarning} ${eyeWarning}`,
  },
  {
    id: "LV_TO_LU",
    exitMeridian: "LV",
    entryMeridian: "LU",
    transition: "LV → LU",
    fullName: "Wątroba → Płuca",
    exitPoint: "LV14",
    entryPoint: "LU1",
    warning: chestWarning,
  },
  {
    id: "LI_TO_ST",
    exitMeridian: "LI",
    entryMeridian: "ST",
    transition: "LI → ST",
    fullName: "Jelito Grube → Żołądek",
    exitPoint: "LI20",
    entryPoint: "ST1",
    warning: eyeWarning,
  },
  {
    id: "SP_TO_HT",
    exitMeridian: "SP",
    entryMeridian: "HT",
    transition: "SP → HT",
    fullName: "Śledziona → Serce",
    exitPoint: "SP21",
    entryPoint: "HT1",
    warning: chestWarning,
  },
];

function normalizePulseValues(values: Record<string, number>) {
  const normalized: Record<string, number> = { ...values };
  const aliases = {
    HT: values.HT ?? values.HE,
    KI: values.KI ?? values.KID,
    LV: values.LV ?? values.LIV,
    SJ: values.SJ ?? values.TE,
  };
  for (const [code, value] of Object.entries(aliases)) {
    if (value !== undefined) normalized[code] = value;
  }
  return normalized;
}

function classifyDifference(difference: number): {
  suspicion: BlockSuspicion;
  suspicionLabel: string;
} {
  if (difference >= 3) {
    return {
      suspicion: "VERY_STRONG_BLOCK_SUSPICION",
      suspicionLabel: "Bardzo silne podejrzenie wzorca",
    };
  }
  if (difference === 2) {
    return {
      suspicion: "CLEAR_BLOCK_SUSPICION",
      suspicionLabel: "Wyraźne podejrzenie wzorca",
    };
  }
  return {
    suspicion: "POSSIBLE_BLOCK",
    suspicionLabel: "Możliwy wzorzec bloku",
  };
}

export function analyzeEntryExitBlocks(
  values: Record<string, number>,
): EntryExitBlockResult[] {
  const pulses = normalizePulseValues(values);

  return entryExitBlockRules
    .flatMap((rule) => {
      const exitValue = pulses[rule.exitMeridian];
      const entryValue = pulses[rule.entryMeridian];
      if (exitValue === undefined || entryValue === undefined) return [];

      const difference = entryValue - exitValue;
      if (difference < 1) return [];

      return [
        {
          ...rule,
          exitValue,
          entryValue,
          difference,
          ...classifyDifference(difference),
        },
      ];
    })
    .sort((a, b) => b.difference - a.difference);
}

export type BlockTrend =
  | "PATTERN_ABSENT"
  | "PATTERN_WEAKER"
  | "PATTERN_UNCHANGED"
  | "PATTERN_STRONGER"
  | "NEW_PATTERN"
  | "NO_PATTERN";

export function compareBlockDifference(
  previousDifference: number,
  currentDifference: number,
): BlockTrend {
  if (previousDifference >= 1 && currentDifference < 1) return "PATTERN_ABSENT";
  if (
    previousDifference >= 1 &&
    currentDifference >= 1 &&
    currentDifference < previousDifference
  )
    return "PATTERN_WEAKER";
  if (previousDifference >= 1 && currentDifference === previousDifference)
    return "PATTERN_UNCHANGED";
  if (previousDifference >= 1 && currentDifference > previousDifference)
    return "PATTERN_STRONGER";
  if (previousDifference < 1 && currentDifference >= 1) return "NEW_PATTERN";
  return "NO_PATTERN";
}
