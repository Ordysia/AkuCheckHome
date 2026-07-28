export type BreathingProtocol = {
  id: string;
  version: string;
  name: string;
  purpose: string[];
  status: "approved_general" | "conditional" | "clinical_context";
  duration: string;
  steps: string[];
  gentlerOption?: string;
  avoidWhen: string[];
  stopWhen: string[];
};

const commonStopConditions = [
  "zawroty głowy",
  "mrowienie wokół ust lub dłoni",
  "ból w klatce piersiowej",
  "narastająca duszność",
  "zaburzenia widzenia",
  "uczucie omdlenia",
];

export const breathingProtocols: BreathingProtocol[] = [
  {
    id: "calm-5-5",
    version: "0.1.0",
    name: "Spokojny oddech 5–5",
    purpose: ["codzienne uspokojenie", "napięcie", "regulacja oddechu"],
    status: "approved_general",
    duration: "5 minut",
    steps: [
      "Usiądź wygodnie i rozluźnij barki.",
      "Wdychaj nosem przez 5 sekund.",
      "Wydychaj nosem lub lekko rozchylonymi ustami przez 5 sekund.",
      "Nie zatrzymuj oddechu i nie nabieraj powietrza na siłę.",
    ],
    gentlerOption: "Skróć obie fazy do 4 sekund.",
    avoidWhen: ["ostra lub niewyjaśniona duszność"],
    stopWhen: commonStopConditions,
  },
  {
    id: "long-exhale-4-6",
    version: "0.1.0",
    name: "Wydłużony wydech 4–6",
    purpose: ["stres", "napięcie", "wyciszenie przed snem"],
    status: "approved_general",
    duration: "10–20 cykli, około 3–5 minut",
    steps: [
      "Usiądź lub połóż się wygodnie.",
      "Wdychaj spokojnie nosem przez 4 sekundy.",
      "Wydychaj bez wysiłku przez 6 sekund.",
      "Przejdź od razu do kolejnego wdechu, bez zatrzymania.",
    ],
    gentlerOption: "Zastosuj rytm 3–4 albo 3–5.",
    avoidWhen: ["ostra lub niewyjaśniona duszność"],
    stopWhen: commonStopConditions,
  },
  {
    id: "diaphragmatic",
    version: "0.1.0",
    name: "Oddech przeponowy",
    purpose: ["napięcie górnej części klatki piersiowej", "nauka spokojnego oddechu"],
    status: "approved_general",
    duration: "5 minut",
    steps: [
      "Usiądź z podparciem lub połóż się na plecach.",
      "Połóż jedną dłoń na klatce piersiowej, drugą na brzuchu lub dolnych żebrach.",
      "Wdychaj nosem i pozwól dolnym żebrom delikatnie się rozszerzyć.",
      "Wydychaj swobodnie; nie wypychaj brzucha i nie unoś barków.",
    ],
    avoidWhen: ["ostra lub niewyjaśniona duszność"],
    stopWhen: commonStopConditions,
  },
  {
    id: "box-4-4-4-4",
    version: "0.1.0",
    name: "Oddech kwadratowy 4–4–4–4",
    purpose: ["porządkowanie uwagi", "krótkie napięcie"],
    status: "conditional",
    duration: "3–5 cykli",
    steps: [
      "Wdech nosem przez 4 sekundy.",
      "Zatrzymanie po wdechu przez 4 sekundy.",
      "Wydech przez 4 sekundy.",
      "Zatrzymanie po wydechu przez 4 sekundy.",
    ],
    avoidWhen: [
      "silny lęk",
      "zła tolerancja bezdechu",
      "ciąża",
      "niekontrolowane nadciśnienie",
      "choroba serca lub płuc bez zgody specjalisty",
    ],
    stopWhen: commonStopConditions,
  },
  {
    id: "sleep-4-7-8",
    version: "0.1.0",
    name: "Oddech 4–7–8",
    purpose: ["wyciszenie przed snem"],
    status: "conditional",
    duration: "maksymalnie 4 cykle na początku",
    steps: [
      "Wdech nosem przez 4 sekundy.",
      "Zatrzymanie przez 7 sekund.",
      "Wydech ustami przez 8 sekund.",
    ],
    gentlerOption: "Zachowaj proporcje 2–3,5–4 albo wybierz 4–6 bez bezdechu.",
    avoidWhen: [
      "zła tolerancja bezdechu",
      "ciąża",
      "nawracające omdlenia",
      "choroba serca lub płuc bez zgody specjalisty",
    ],
    stopWhen: commonStopConditions,
  },
  {
    id: "pursed-lips",
    version: "0.1.0",
    name: "Oddech przez zasznurowane usta",
    purpose: ["odzyskanie kontroli nad przyspieszonym oddechem", "duszność"],
    status: "clinical_context",
    duration: "do odzyskania swobodnego oddechu",
    steps: [
      "Rozluźnij szyję i barki.",
      "Wdychaj nosem przez około 2–3 sekundy.",
      "Ułóż usta jak do delikatnego gwizdania.",
      "Wydychaj łagodnie przez 4–6 sekund, bez wydmuchiwania na siłę.",
    ],
    avoidWhen: ["nowa, silna lub niewyjaśniona duszność bez oceny medycznej"],
    stopWhen: commonStopConditions,
  },
  {
    id: "effort-control",
    version: "0.1.0",
    name: "Oddech kontrolowany podczas wysiłku",
    purpose: ["podnoszenie", "rehabilitacja", "ćwiczenia siłowe"],
    status: "conditional",
    duration: "przez czas wykonywania ruchu",
    steps: [
      "Wdychaj podczas łatwiejszej fazy ruchu.",
      "Wydychaj podczas fazy wymagającej większego wysiłku.",
      "Nie zatrzymuj oddechu podczas podnoszenia.",
    ],
    avoidWhen: ["ograniczenia wysiłku zalecone przez lekarza"],
    stopWhen: commonStopConditions,
  },
  {
    id: "post-effort-recovery",
    version: "0.1.0",
    name: "Odzyskanie oddechu po wysiłku",
    purpose: ["uspokojenie oddechu po intensywnym ruchu"],
    status: "conditional",
    duration: "do odzyskania swobodnego oddechu",
    steps: [
      "Oprzyj ręce na udach lub stabilnym podłożu.",
      "Rozluźnij barki i szyję.",
      "Wdychaj nosem przez 2–3 sekundy.",
      "Wydychaj przez zasznurowane usta przez 4–6 sekund.",
    ],
    avoidWhen: ["nowa, silna lub niewyjaśniona duszność"],
    stopWhen: commonStopConditions,
  },
];

export function getBreathingProtocol(id: string) {
  return breathingProtocols.find((protocol) => protocol.id === id);
}
