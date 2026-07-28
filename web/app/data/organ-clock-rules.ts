export type OrganClockEntry = {
  meridian: string;
  appAlias?: string;
  name: string;
  maximum: string;
  minimum: string;
  oppositeMeridian: string;
  oppositeName: string;
  maximumStartHour: number;
};

const traditionalThemes: Record<string, string> = {
  GB: "decydowaniem, kierunkiem działania i elastycznością",
  LV: "swobodnym przepływem, planowaniem i regeneracją",
  LU: "oddechem, rytmem oraz rozpoczynaniem nowego cyklu",
  LI: "wydalaniem, uwalnianiem i robieniem miejsca",
  ST: "przyjmowaniem pokarmu oraz pierwszym etapem trawienia",
  SP: "przemianą, odżywianiem i stabilnością",
  HT: "spokojem umysłu, świadomością i relacjami",
  SI: "oddzielaniem tego, co użyteczne, od tego, co zbędne",
  BL: "gospodarką płynami i aktywnością w ciągu dnia",
  KI: "zasobami, regeneracją i poczuciem bezpieczeństwa",
  PC: "ochroną Serca, granicami i wyciszeniem emocjonalnym",
  SJ: "koordynacją procesów organizmu i przechodzeniem do odpoczynku",
};

export const organClock: OrganClockEntry[] = [
  {
    meridian: "GB",
    name: "Pęcherzyk Żółciowy",
    maximum: "23:00–01:00",
    minimum: "11:00–13:00",
    oppositeMeridian: "HT",
    oppositeName: "Serce",
    maximumStartHour: 23,
  },
  {
    meridian: "LV",
    appAlias: "LIV",
    name: "Wątroba",
    maximum: "01:00–03:00",
    minimum: "13:00–15:00",
    oppositeMeridian: "SI",
    oppositeName: "Jelito Cienkie",
    maximumStartHour: 1,
  },
  {
    meridian: "LU",
    name: "Płuca",
    maximum: "03:00–05:00",
    minimum: "15:00–17:00",
    oppositeMeridian: "BL",
    oppositeName: "Pęcherz Moczowy",
    maximumStartHour: 3,
  },
  {
    meridian: "LI",
    name: "Jelito Grube",
    maximum: "05:00–07:00",
    minimum: "17:00–19:00",
    oppositeMeridian: "KI",
    oppositeName: "Nerki",
    maximumStartHour: 5,
  },
  {
    meridian: "ST",
    name: "Żołądek",
    maximum: "07:00–09:00",
    minimum: "19:00–21:00",
    oppositeMeridian: "PC",
    oppositeName: "Osierdzie",
    maximumStartHour: 7,
  },
  {
    meridian: "SP",
    name: "Śledziona",
    maximum: "09:00–11:00",
    minimum: "21:00–23:00",
    oppositeMeridian: "SJ",
    oppositeName: "Potrójny Ogrzewacz",
    maximumStartHour: 9,
  },
  {
    meridian: "HT",
    appAlias: "HE",
    name: "Serce",
    maximum: "11:00–13:00",
    minimum: "23:00–01:00",
    oppositeMeridian: "GB",
    oppositeName: "Pęcherzyk Żółciowy",
    maximumStartHour: 11,
  },
  {
    meridian: "SI",
    name: "Jelito Cienkie",
    maximum: "13:00–15:00",
    minimum: "01:00–03:00",
    oppositeMeridian: "LV",
    oppositeName: "Wątroba",
    maximumStartHour: 13,
  },
  {
    meridian: "BL",
    name: "Pęcherz Moczowy",
    maximum: "15:00–17:00",
    minimum: "03:00–05:00",
    oppositeMeridian: "LU",
    oppositeName: "Płuca",
    maximumStartHour: 15,
  },
  {
    meridian: "KI",
    appAlias: "KID",
    name: "Nerki",
    maximum: "17:00–19:00",
    minimum: "05:00–07:00",
    oppositeMeridian: "LI",
    oppositeName: "Jelito Grube",
    maximumStartHour: 17,
  },
  {
    meridian: "PC",
    name: "Osierdzie",
    maximum: "19:00–21:00",
    minimum: "07:00–09:00",
    oppositeMeridian: "ST",
    oppositeName: "Żołądek",
    maximumStartHour: 19,
  },
  {
    meridian: "SJ",
    name: "Potrójny Ogrzewacz",
    maximum: "21:00–23:00",
    minimum: "09:00–11:00",
    oppositeMeridian: "SP",
    oppositeName: "Śledziona",
    maximumStartHour: 21,
  },
];

export function getOrganClockEntryAt(date = new Date()) {
  const hour = date.getHours();
  return organClock.find((entry) => {
    const end = (entry.maximumStartHour + 2) % 24;
    return entry.maximumStartHour === 23
      ? hour >= 23 || hour < end
      : hour >= entry.maximumStartHour && hour < end;
  });
}

export function getOrganClockEntryAtTime(time: string) {
  const [hourText] = time.split(":");
  const hour = Number(hourText);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return undefined;

  return organClock.find((entry) => {
    const end = (entry.maximumStartHour + 2) % 24;
    return entry.maximumStartHour === 23
      ? hour >= 23 || hour < end
      : hour >= entry.maximumStartHour && hour < end;
  });
}

export function getOrganClockEntry(meridianOrAlias: string) {
  return organClock.find(
    (entry) =>
      entry.meridian === meridianOrAlias ||
      entry.appAlias === meridianOrAlias,
  );
}

export function getOrganClockGuidance(
  entry: OrganClockEntry | undefined,
  context: "sleep" | "wake",
) {
  if (!entry) return "";
  const theme = traditionalThemes[entry.meridian];

  if (context === "sleep") {
    return `Zasypianie przypada na maksimum ${entry.meridian}, tradycyjnie łączonego z ${theme}. W tym samym czasie ${entry.oppositeMeridian} (${entry.oppositeName}) jest w minimum. Porównuj tę porę z jakością snu, łatwością zasypiania i poczuciem wyspania następnego dnia.`;
  }

  return `Pobudka przypada na maksimum ${entry.meridian}, tradycyjnie łączonego z ${theme}. W tym samym czasie ${entry.oppositeMeridian} (${entry.oppositeName}) jest w minimum. Obserwuj łatwość wstawania, poranną energię i poczucie wyspania.`;
}
