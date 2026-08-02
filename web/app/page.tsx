"use client";

import { useEffect, useMemo, useState } from "react";
import type { LocalHealthStore, Scores } from "@/lib/health-data/model";
import { getBreathingProtocol } from "./data/breathing-protocols";
import { analyzeEntryExitBlocks } from "./data/pulse-entry-exit-rules";
import {
  getOrganClockEntryAtTime,
  getOrganClockGuidance,
} from "./data/organ-clock-rules";

type View = "home" | "checkin" | "pulse" | "support" | "progress" | "rules";
const STORAGE_KEY = "akucheckhome.health-data.v1";

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readLocalStore(): LocalHealthStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as LocalHealthStore;
  } catch {
    // A damaged local record should not prevent opening the application.
  }
  return { checkins: {}, pulses: {} };
}

const scoreLabels: Record<keyof Scores, string> = {
  sleep: "Jakość snu",
  rested: "Wyspanie",
  energy: "Energia",
  stress: "Stres",
  mood: "Nastrój",
  tension: "Napięcie",
};

const defaultScores: Scores = {
  sleep: 3,
  rested: 3,
  energy: 3,
  stress: 3,
  mood: 3,
  tension: 3,
};

const symptoms = [
  "Zmęczenie",
  "Ból głowy",
  "Napięcie karku",
  "Zimne dłonie",
  "Wzdęcia",
  "Trudność z koncentracją",
  "Rozdrażnienie",
  "Niespokojny sen",
];

const pulseHands = [
  {
    id: "left",
    label: "Lewa ręka",
    rows: [
      { position: "Cun", pair: "SI / HE", surface: ["SI", "Jelito Cienkie"], deep: ["HE", "Serce"] },
      { position: "Guan", pair: "GB / LIV", surface: ["GB", "Pęcherzyk Żółciowy"], deep: ["LIV", "Wątroba"] },
      { position: "Chi", pair: "BL / KID", surface: ["BL", "Pęcherz Moczowy"], deep: ["KID", "Nerka"] },
    ],
  },
  {
    id: "right",
    label: "Prawa ręka",
    rows: [
      { position: "Cun", pair: "LU / LI", surface: ["LI", "Jelito Grube"], deep: ["LU", "Płuco"] },
      { position: "Guan", pair: "SP / ST", surface: ["ST", "Żołądek"], deep: ["SP", "Śledziona"] },
      { position: "Chi", pair: "PC / SJ", surface: ["SJ", "Potrójny Ogrzewacz"], deep: ["PC", "Osierdzie"] },
    ],
  },
] as const;

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "home", label: "Dzisiaj", icon: "⌂" },
  { id: "checkin", label: "Check-in", icon: "✓" },
  { id: "pulse", label: "12 pulsów", icon: "∿" },
  { id: "support", label: "Pomóż sobie", icon: "✦" },
  { id: "progress", label: "Postępy", icon: "↗" },
  { id: "rules", label: "Reguły", icon: "◇" },
];

export default function Home() {
  const today = localDateKey();
  const formattedDate = new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .toUpperCase();
  const [view, setView] = useState<View>("home");
  const [scores, setScores] = useState<Scores>(defaultScores);
  const [bedtime, setBedtime] = useState("22:45");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherSymptom, setOtherSymptom] = useState("");
  const [saved, setSaved] = useState(false);
  const [pulseValues, setPulseValues] = useState<Record<string, number>>({});
  const [pulseSaved, setPulseSaved] = useState(false);
  const [completedActions, setCompletedActions] = useState<string[]>([]);

  useEffect(() => {
    const store = readLocalStore();
    const checkin = store.checkins[today];
    const pulse = store.pulses[today];

    if (checkin) {
      setScores({ ...defaultScores, ...checkin.scores });
      setBedtime(checkin.bedtime);
      setWakeTime(checkin.wakeTime);
      setSelectedSymptoms(checkin.symptoms);
      setOtherSymptom(checkin.otherSymptom);
      setSaved(true);
    }

    if (pulse) {
      setPulseValues(pulse.values);
      setPulseSaved(true);
    }
  }, [today]);

  const saveCheckin = () => {
    const store = readLocalStore();
    store.checkins[today] = {
      scores,
      bedtime,
      wakeTime,
      symptoms: selectedSymptoms,
      otherSymptom,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    setSaved(true);
    setView("home");
  };

  const savePulses = () => {
    const store = readLocalStore();
    store.pulses[today] = {
      values: pulseValues,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    setPulseSaved(true);
  };

  const sleepDuration = useMemo(() => {
    const [bh, bm] = bedtime.split(":").map(Number);
    const [wh, wm] = wakeTime.split(":").map(Number);
    let minutes = wh * 60 + wm - (bh * 60 + bm);
    if (minutes < 0) minutes += 24 * 60;
    return `${Math.floor(minutes / 60)} godz. ${minutes % 60} min`;
  }, [bedtime, wakeTime]);

  const toggleSymptom = (item: string) => {
    setSelectedSymptoms((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item],
    );
  };

  const toggleAction = (id: string) => {
    setCompletedActions((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("home")}>
          <span className="brand-mark">A</span>
          <span>
            <strong>AkuCheck</strong>
            <small>Home</small>
          </span>
        </button>

        <nav aria-label="Główna nawigacja">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-item active" : "nav-item"}
              onClick={() => setView(item.id)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="desktop-account">
          <span className="nav-date">{formattedDate}</span>
          <button className="language" aria-label="Zmień język">
            PL
          </button>
          <span className="avatar">AM</span>
          <span className="profile-copy">
            <strong>Anna</strong>
            <small>Pierwszy użytkownik</small>
          </span>
        </div>

      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">{formattedDate}</p>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className="profile">
            <button className="language" aria-label="Zmień język">
              PL
            </button>
            <span className="avatar">AM</span>
            <span className="profile-copy">
              <strong>Anna</strong>
              <small>Pierwszy użytkownik</small>
            </span>
          </div>
        </header>

        <div className="content">
          {view === "home" && (
            <HomeView
              saved={saved}
              scores={scores}
              setView={setView}
              completedActions={completedActions}
              toggleAction={toggleAction}
            />
          )}
          {view === "checkin" && (
            <CheckInView
              scores={scores}
              setScores={setScores}
              bedtime={bedtime}
              setBedtime={setBedtime}
              wakeTime={wakeTime}
              setWakeTime={setWakeTime}
              sleepDuration={sleepDuration}
              selectedSymptoms={selectedSymptoms}
              toggleSymptom={toggleSymptom}
              otherSymptom={otherSymptom}
              setOtherSymptom={setOtherSymptom}
              saved={saved}
              save={saveCheckin}
            />
          )}
          {view === "pulse" && (
            <PulseView
              pulseValues={pulseValues}
              setPulseValues={setPulseValues}
              saved={pulseSaved}
              save={savePulses}
            />
          )}
          {view === "support" && (
            <SupportView
              completedActions={completedActions}
              toggleAction={toggleAction}
              scores={scores}
              bedtime={bedtime}
              wakeTime={wakeTime}
              symptoms={selectedSymptoms}
              otherSymptom={otherSymptom}
              checkinSaved={saved}
              pulseValues={pulseValues}
              pulseSaved={pulseSaved}
            />
          )}
          {view === "progress" && <ProgressView />}
          {view === "rules" && <RulesView />}
        </div>

        <p className="medical-note">
          AkuCheckHome ma charakter edukacyjny i wspierający. Nie diagnozuje i
          nie zastępuje konsultacji z lekarzem lub terapeutą.
        </p>
      </section>

      <nav className="mobile-nav" aria-label="Nawigacja mobilna">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => setView(item.id)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </main>
  );
}

function HomeView({
  saved,
  scores,
  setView,
  completedActions,
  toggleAction,
}: {
  saved: boolean;
  scores: Scores;
  setView: (view: View) => void;
  completedActions: string[];
  toggleAction: (id: string) => void;
}) {
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow green">CODZIENNA CHWILA DLA SIEBIE</p>
          <h2>{saved ? "Check-in zapisany. Dziękujemy." : "Jak się dziś masz?"}</h2>
          <p>
            {saved
              ? "Możesz przejrzeć swoje wyniki albo wykonać opcjonalne badanie pulsów."
              : "Krótki check-in zajmie około 2 minut i pomoże Ci zauważać zmiany w czasie."}
          </p>
        </div>
        <button className="primary" onClick={() => setView("checkin")}>
          {saved ? "Edytuj dzisiejszy check-in" : "Rozpocznij check-in"}
          <span>→</span>
        </button>
      </section>

      <div className="dashboard-grid">
        <section className="card daily-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">DZISIEJSZY OBRAZ</p>
              <h3>{saved ? "Twoje samopoczucie" : "Jeszcze bez wpisu"}</h3>
            </div>
            <button className="text-button" onClick={() => setView("progress")}>
              Zobacz historię
            </button>
          </div>
          <div className="score-row">
            {(Object.keys(scores) as (keyof Scores)[]).map((key) => (
              <div className="score" key={key}>
                <span className={`score-ring score-${scores[key]}`}>
                  {saved ? scores[key] : "–"}
                </span>
                <small>{scoreLabels[key]}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="card observation">
          <div className="leaf-mark">⌁</div>
          <p className="eyebrow green">ŁAGODNA OBSERWACJA</p>
          <h3>W tym tygodniu warto zwrócić uwagę na regenerację.</h3>
          <p>
            To jedynie edukacyjna obserwacja oparta na Twoich wpisach, nie
            diagnoza.
          </p>
        </section>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NA DZIŚ</p>
            <h2>Małe działania, które możesz wykonać</h2>
          </div>
          <button className="text-button" onClick={() => setView("support")}>
            Wszystkie propozycje →
          </button>
        </div>
        <div className="action-grid">
          <ActionCard
            id="breath"
            label="Oddech"
            title="Spokojny wydech"
            description="2 minuty · bez sprzętu"
            color="sage"
            completed={completedActions.includes("breath")}
            toggle={toggleAction}
          />
          <ActionCard
            id="li4"
            label="Akupresura"
            title="LI4 · Hegu"
            description="30 sekund na każdą dłoń"
            color="clay"
            completed={completedActions.includes("li4")}
            toggle={toggleAction}
          />
          <ActionCard
            id="rest"
            label="Regeneracja"
            title="Cicha przerwa"
            description="5 minut bez ekranu"
            color="sand"
            completed={completedActions.includes("rest")}
            toggle={toggleAction}
          />
        </div>
      </section>
    </>
  );
}

function CheckInView(props: {
  scores: Scores;
  setScores: (scores: Scores) => void;
  bedtime: string;
  setBedtime: (value: string) => void;
  wakeTime: string;
  setWakeTime: (value: string) => void;
  sleepDuration: string;
  selectedSymptoms: string[];
  toggleSymptom: (item: string) => void;
  otherSymptom: string;
  setOtherSymptom: (value: string) => void;
  saved: boolean;
  save: () => void;
}) {
  const bedtimeClock = getOrganClockEntryAtTime(props.bedtime);
  const wakeClock = getOrganClockEntryAtTime(props.wakeTime);
  const bedtimeGuidance = getOrganClockGuidance(bedtimeClock, "sleep");
  const wakeGuidance = getOrganClockGuidance(wakeClock, "wake");

  return (
    <div className="form-layout">
      <div className="form-main">
        <section className="card form-card">
          <div className="form-intro">
            <span className="step-badge">1</span>
            <div>
              <h2>Sen i regeneracja</h2>
              <p>Oceń ostatnią noc bez zastanawiania się zbyt długo.</p>
            </div>
          </div>
          <ScorePicker
            label="Jak oceniasz jakość snu?"
            value={props.scores.sleep}
            low="Bardzo słaba"
            high="Bardzo dobra"
            onChange={(sleep) =>
              props.setScores({ ...props.scores, sleep })
            }
          />
          <ScorePicker
            label="Czy czujesz się wyspana/wyspany?"
            value={props.scores.rested}
            low="Zdecydowanie nie"
            high="Zdecydowanie tak"
            onChange={(rested) =>
              props.setScores({ ...props.scores, rested })
            }
          />
          <div className="time-grid">
            <label>
              Pora położenia się spać
              <input
                type="time"
                value={props.bedtime}
                onChange={(event) => props.setBedtime(event.target.value)}
              />
            </label>
            <label>
              Pora wstania
              <input
                type="time"
                value={props.wakeTime}
                onChange={(event) => props.setWakeTime(event.target.value)}
              />
            </label>
            <div className="duration">
              <small>Łączny czas</small>
              <strong>{props.sleepDuration}</strong>
            </div>
          </div>
        </section>

        <section className="card form-card">
          <div className="form-intro">
            <span className="step-badge">2</span>
            <div>
              <h2>Jak czujesz się teraz?</h2>
              <p>Każda odpowiedź korzysta ze skali od 1 do 5.</p>
            </div>
          </div>
          <div className="picker-stack">
            {(Object.keys(props.scores) as (keyof Scores)[])
              .filter((key) => key !== "sleep" && key !== "rested")
              .map((key) => (
                <ScorePicker
                  key={key}
                  label={scoreLabels[key]}
                  value={props.scores[key]}
                  low={
                    key === "stress" || key === "tension"
                      ? "Bardzo niskie"
                      : "Bardzo nisko"
                  }
                  high={
                    key === "stress" || key === "tension"
                      ? "Bardzo wysokie"
                      : "Bardzo wysoko"
                  }
                  onChange={(value) =>
                    props.setScores({ ...props.scores, [key]: value })
                  }
                />
              ))}
          </div>
        </section>

        <section className="card form-card">
          <div className="form-intro">
            <span className="step-badge">3</span>
            <div>
              <h2>Czy zauważasz jakieś objawy?</h2>
              <p>Możesz zaznaczyć kilka odpowiedzi albo pominąć ten krok.</p>
            </div>
          </div>
          <div className="chips">
            {symptoms.map((item) => (
              <button
                key={item}
                className={
                  props.selectedSymptoms.includes(item)
                    ? "chip selected"
                    : "chip"
                }
                onClick={() => props.toggleSymptom(item)}
              >
                {props.selectedSymptoms.includes(item) ? "✓ " : "+ "}
                {item}
              </button>
            ))}
          </div>
          <label className="other-field">
            Inny objaw
            <input
              value={props.otherSymptom}
              maxLength={100}
              placeholder="Krótki opis..."
              onChange={(event) => props.setOtherSymptom(event.target.value)}
            />
            <small>
              {props.otherSymptom.length}/100 · Nie wpisuj danych innych osób.
            </small>
          </label>
        </section>

        <button className="primary save-button" onClick={props.save}>
          {props.saved ? "Zapisz zmiany" : "Zapisz dzisiejszy check-in"} →
        </button>
      </div>

      <aside className="form-aside">
        <div className="aside-card organ-clock-card">
          <span className="aside-symbol" aria-hidden="true">☾</span>
          <p className="eyebrow green">ZEGAR NARZĄDÓW · SEN</p>
          <h3>Pora snu · {props.bedtime}</h3>
          {bedtimeClock && (
            <>
              <p>
                Maksimum:{" "}
                <strong>{bedtimeClock.meridian} — {bedtimeClock.name}</strong>{" "}
                ({bedtimeClock.maximum})
              </p>
              <p className="clock-minimum">
                {bedtimeGuidance}
              </p>
            </>
          )}
        </div>
        <div className="aside-card organ-clock-card wake-clock-card">
          <span className="aside-symbol" aria-hidden="true">☼</span>
          <p className="eyebrow green">ZEGAR NARZĄDÓW · POBUDKA</p>
          <h3>Pora wstania · {props.wakeTime}</h3>
          {wakeClock && (
            <>
              <p>
                Maksimum:{" "}
                <strong>{wakeClock.meridian} — {wakeClock.name}</strong>{" "}
                ({wakeClock.maximum})
              </p>
              <p className="clock-minimum">
                {wakeGuidance}
              </p>
            </>
          )}
        </div>
        <p className="clock-disclaimer">
          Zegar narządów jest tradycyjnym modelem TCM i nie stanowi diagnozy.
        </p>
      </aside>
    </div>
  );
}

function ScorePicker({
  label,
  value,
  low,
  high,
  onChange,
}: {
  label: string;
  value: number;
  low: string;
  high: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="score-picker">
      <strong>{label}</strong>
      <div className="number-buttons">
        {[1, 2, 3, 4, 5].map((number) => (
          <button
            key={number}
            className={value === number ? "selected" : ""}
            onClick={() => onChange(number)}
            aria-label={`${label}: ${number}`}
          >
            {number}
          </button>
        ))}
      </div>
      <div className="range-labels">
        <small>{low}</small>
        <small>{high}</small>
      </div>
    </div>
  );
}

function PulseView({
  pulseValues,
  setPulseValues,
  saved,
  save,
}: {
  pulseValues: Record<string, number>;
  setPulseValues: (values: Record<string, number>) => void;
  saved: boolean;
  save: () => void;
}) {
  const liveBlocks = analyzeEntryExitBlocks(pulseValues);
  const normalizedCode = (code: string) =>
    code === "HE" ? "HT" : code === "KID" ? "KI" : code === "LIV" ? "LV" : code;
  const blockStateFor = (code: string) => {
    const normalized = normalizedCode(code);
    const block = liveBlocks.find(
      (item) =>
        item.exitMeridian === normalized || item.entryMeridian === normalized,
    );
    if (!block) return undefined;
    return {
      role: block.exitMeridian === normalized ? ("exit" as const) : ("entry" as const),
      difference: block.difference,
      transition: block.transition,
    };
  };

  return (
    <>
      <section className="pulse-intro">
        <div>
          <p className="eyebrow green">OPCJONALNE BADANIE</p>
          <h2>Porównaj 12 pulsów</h2>
          <p>
            Oceń względną siłę każdego pulsu w tej samej sesji. To zapis
            samoobserwacji, nie diagnoza.
          </p>
        </div>
        <div className="pulse-legend">
          <span>−2 niewyczuwalny</span>
          <span>0 domyślny</span>
          <span>+2 bardzo wyraźny</span>
        </div>
      </section>

      {liveBlocks.length > 0 && (
        <section className="pulse-block-alert" aria-live="polite">
          <div>
            <p className="eyebrow">WYKRYTE WZORCE WEJŚCIA–WYJŚCIA</p>
            <strong>
              {liveBlocks.length === 1
                ? "Możliwy wzorzec bloku"
                : `Możliwe wzorce bloków: ${liveBlocks.length}`}
            </strong>
          </div>
          <div className="pulse-block-chips">
            {liveBlocks.map((block) => (
              <span
                key={block.id}
                className={`block-chip block-level-${block.difference}`}
              >
                {block.transition} · różnica {block.difference}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="pulse-hands">
        {pulseHands.map((hand) => (
          <section className={`card pulse-hand pulse-hand-${hand.id}`} key={hand.id}>
            <div className="pulse-hand-title">
              <span className="hand-symbol" aria-hidden="true">
                {hand.id === "left" ? "L" : "P"}
              </span>
              <div>
                <p className="eyebrow">BADANIE NA TĘTNICY PROMIENIOWEJ</p>
                <h3>{hand.label}</h3>
              </div>
            </div>

            <div className="pulse-table-head">
              <span>Pozycja</span>
              <span>Para meridianów</span>
              <span>{hand.id === "right" ? "GŁ" : "POW"}</span>
              <span>{hand.id === "right" ? "POW" : "GŁ"}</span>
            </div>

            {hand.rows.map((row) => (
              <div className="pulse-table-row" key={`${hand.id}-${row.position}`}>
                <div className="pulse-position">
                  <strong>{row.position}</strong>
                  <small>
                    {row.position === "Cun"
                      ? "najbliżej dłoni"
                      : row.position === "Guan"
                        ? "pośrodku"
                        : "najbliżej łokcia"}
                  </small>
                </div>
                <div className="pulse-pair">
                  <strong>{row.pair}</strong>
                  <small>
                    {hand.id === "right"
                      ? `${row.deep[1]} · ${row.surface[1]}`
                      : `${row.surface[1]} · ${row.deep[1]}`}
                  </small>
                </div>
                {(hand.id === "right"
                  ? [row.deep, row.surface]
                  : [row.surface, row.deep]
                ).map(([code]) => (
                  <PulseReading
                    key={code}
                    code={code}
                    value={pulseValues[code]}
                    blockState={blockStateFor(code)}
                    change={(value) =>
                      setPulseValues({ ...pulseValues, [code]: value })
                    }
                  />
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className="pulse-footer">
        <p>
          Uzupełniono <strong>{Object.keys(pulseValues).length} z 12</strong>{" "}
          odczytów.
        </p>
        <button
          className="primary"
          disabled={Object.keys(pulseValues).length < 12}
          onClick={save}
        >
          {saved ? "Zapisz zmiany w pulsach" : "Zapisz badanie pulsów"}
        </button>
      </div>
    </>
  );
}

function PulseReading({
  code,
  value,
  blockState,
  change,
}: {
  code: string;
  value?: number;
  blockState?: {
    role: "exit" | "entry";
    difference: number;
    transition: string;
  };
  change: (value: number) => void;
}) {
  return (
    <div
      className={`pulse-reading ${
        blockState
          ? `pulse-blocked pulse-block-${blockState.role} block-level-${blockState.difference}`
          : ""
      }`}
    >
      <strong>
        {code}
        {blockState && (
          <small>
            {blockState.role === "exit" ? "przed blokiem" : "za blokiem"}
          </small>
        )}
      </strong>
      <div className="pulse-buttons">
        {[-2, -1, 0, 1, 2].map((number) => (
          <button
            key={number}
            aria-label={`${code}: ${number === 0 ? "odczyt domyślny" : number}`}
            onClick={() => change(number)}
            className={value === number ? "selected" : ""}
          >
            {number > 0 ? `+${number}` : number === 0 ? "v" : number}
          </button>
        ))}
      </div>
    </div>
  );
}

function SupportView({
  completedActions,
  toggleAction,
  scores,
  bedtime,
  wakeTime,
  symptoms,
  otherSymptom,
  checkinSaved,
  pulseValues,
  pulseSaved,
}: {
  completedActions: string[];
  toggleAction: (id: string) => void;
  scores: Scores;
  bedtime: string;
  wakeTime: string;
  symptoms: string[];
  otherSymptom: string;
  checkinSaved: boolean;
  pulseValues: Record<string, number>;
  pulseSaved: boolean;
}) {
  const recommendations: Array<{
    id: string;
    title: string;
    tag: string;
    reason: string;
    description: string;
    steps?: string[];
    warning?: string;
  }> = [];

  const [bedHour, bedMinute] = bedtime.split(":").map(Number);
  const [wakeHour, wakeMinute] = wakeTime.split(":").map(Number);
  let sleepMinutes =
    wakeHour * 60 + wakeMinute - (bedHour * 60 + bedMinute);
  if (sleepMinutes < 0) sleepMinutes += 24 * 60;

  const alteredPulses = Object.entries(pulseValues)
    .filter(([, value]) => value !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const entryExitBlocks = pulseSaved
    ? analyzeEntryExitBlocks(pulseValues)
    : [];

  if (
    checkinSaved &&
    (scores.stress >= 4 ||
      scores.tension >= 4 ||
      scores.sleep <= 2 ||
      scores.rested <= 2)
  ) {
    const protocol = getBreathingProtocol("long-exhale-4-6")!;
    recommendations.push({
      id: "breath",
      title: protocol.name,
      tag: `Protokół oddechowy · ${protocol.duration}`,
      reason: `Dlaczego: ${scores.stress >= 4 ? `stres ${scores.stress}/5` : ""}${
        scores.stress >= 4 && scores.tension >= 4 ? " · " : ""
      }${scores.tension >= 4 ? `napięcie ${scores.tension}/5` : ""}${
        scores.sleep <= 2 ? `${scores.stress >= 4 || scores.tension >= 4 ? " · " : ""}sen ${scores.sleep}/5` : ""
      }${scores.rested <= 2 ? `${scores.stress >= 4 || scores.tension >= 4 || scores.sleep <= 2 ? " · " : ""}wyspanie ${scores.rested}/5` : ""
      }.`,
      description: `${protocol.steps.join(" ")} ${protocol.gentlerOption ?? ""}`,
      warning: `Przerwij przy: ${protocol.stopWhen.join(", ")}.`,
    });
  }

  if (
    checkinSaved &&
    (scores.sleep <= 2 ||
      scores.rested <= 2 ||
      scores.energy <= 2 ||
      sleepMinutes < 7 * 60)
  ) {
    recommendations.push({
      id: "rest",
      title: "Przerwa regeneracyjna",
      tag: "Regeneracja · 5–10 min",
      reason: `Dlaczego: ${
        scores.sleep <= 2 ? `jakość snu ${scores.sleep}/5 · ` : ""
      }${scores.rested <= 2 ? `wyspanie ${scores.rested}/5 · ` : ""}${
        scores.energy <= 2 ? `energia ${scores.energy}/5 · ` : ""
      }sen ${Math.floor(
        sleepMinutes / 60,
      )} godz. ${sleepMinutes % 60} min.`,
      description:
        "Odłóż ekran, oprzyj ciało i pozwól oczom odpocząć. Jeśli możesz, zaplanuj dziś spokojniejsze tempo i regularną porę snu.",
    });
  }

  if (
    checkinSaved &&
    (symptoms.includes("Ból głowy") ||
      otherSymptom.toLocaleLowerCase("pl").includes("ból głowy"))
  ) {
    recommendations.push({
      id: "li4",
      title: "LI4 · Hegu",
      tag: "Akupresura · 30 s na dłoń",
      reason: "Dlaczego: w check-inie zaznaczono ból głowy.",
      description:
        "Na grzbiecie dłoni znajdź miękkie miejsce między kciukiem a palcem wskazującym. Uciskaj komfortowo opuszkiem kciuka, małymi ruchami okrężnymi.",
      warning:
        "Nie stosuj w ciąży. Nie uciskaj rany, wysypki, obrzęku ani bolesnego miejsca. Nacisk nie może boleć.",
    });
  }

  if (entryExitBlocks.length > 0) {
    entryExitBlocks.forEach((block) => {
      const multipleBlocksWarning =
        entryExitBlocks.length > 1
          ? " Wykryto kilka możliwych wzorców. Kolejność i zakres stymulacji powinien zweryfikować terapeuta; nie wykonuj automatycznie wszystkich procedur."
          : "";
      recommendations.push({
        id: `block-${block.id}`,
        title: `Wzorzec ${block.transition}`,
        tag: `12 pulsów · ${block.suspicionLabel}`,
        reason: `Dlaczego: ${block.exitMeridian} ${block.exitValue > 0 ? "+" : ""}${block.exitValue}, ${block.entryMeridian} ${block.entryValue > 0 ? "+" : ""}${block.entryValue}; różnica ${block.difference}.`,
        description: `${block.fullName}. Delikatny ucisk wykonaj dokładnie w podanej kolejności. Jest to procedura wspomagająca wyrównanie przejścia.`,
        steps: [
          `${block.exitPoint} — lewa strona`,
          `${block.exitPoint} — prawa strona`,
          `${block.entryPoint} — lewa strona`,
          `${block.entryPoint} — prawa strona`,
        ],
        warning: `${block.warning} Przerwij przy bólu, zawrotach głowy, nudnościach lub pogorszeniu samopoczucia. Wynik należy zweryfikować w kolejnym codziennym badaniu pulsów.${multipleBlocksWarning}`,
      });
    });
  } else if (pulseSaved && alteredPulses.length > 0) {
    const pulseSummary = alteredPulses
      .slice(0, 3)
      .map(([code, value]) => `${code} ${value > 0 ? "+" : ""}${value}`)
      .join(", ");
    recommendations.push({
      id: "pulse-reset",
      title: "Wyciszenie i ponowna obserwacja",
      tag: "Pulsy · 3 min",
      reason: `Dlaczego: najbardziej wyróżniające się odczyty to ${pulseSummary}.`,
      description:
        "Odpocznij w ciszy przez 3 minuty, ogrzej dłonie i rozluźnij chwyt. Jeśli chcesz, powtórz badanie później w podobnych warunkach i porównaj wynik.",
      warning:
        "Nie wykryto wzorca, w którym puls wyjścia jest słabszy od pulsu wejścia o co najmniej 1 poziom. Różnice pulsów pozostają zapisem samoobserwacji, nie diagnozą.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "gentle-pause",
      title: checkinSaved ? "Krótka chwila równowagi" : "Najpierw dzisiejszy check-in",
      tag: checkinSaved ? "Dobrostan · 5 min" : "Brak dzisiejszych danych",
      reason: checkinSaved
        ? "Dzisiejsze odpowiedzi nie uruchomiły szczególnej reguły wsparcia."
        : "Zapisz check-in, aby propozycje mogły uwzględnić Twoje samopoczucie.",
      description: checkinSaved
        ? "Wybierz spokojny spacer, szklankę wody albo pięć minut bez ekranu — zgodnie z tym, czego teraz potrzebujesz."
        : "Po zapisaniu odpowiedzi wróć tutaj. Badanie 12 pulsów jest opcjonalne i uzupełnia obserwację.",
    });
  }

  return (
    <>
      <section className="support-hero">
        <p className="eyebrow green">DZISIEJSZA ANALIZA</p>
        <h2>Co możesz zrobić dla siebie teraz</h2>
        <p>
          Jawne reguły uwzględniają dzisiejszy check-in
          {pulseSaved ? " i zapis 12 pulsów" : ""}. To wsparcie edukacyjne,
          nie diagnoza ani plan leczenia.
        </p>
        <div className="analysis-status">
          <span className={checkinSaved ? "ready" : ""}>
            {checkinSaved ? "✓" : "○"} Check-in
          </span>
          <span className={pulseSaved ? "ready" : ""}>
            {pulseSaved ? "✓" : "○"} 12 pulsów
          </span>
        </div>
      </section>
      <div className="support-list">
        {recommendations.map((recommendation, index) => (
          <SupportDetail
            key={recommendation.id}
            number={String(index + 1).padStart(2, "0")}
            {...recommendation}
            completed={completedActions.includes(recommendation.id)}
            toggle={toggleAction}
          />
        ))}
      </div>
    </>
  );
}

function SupportDetail({
  number,
  id,
  title,
  tag,
  reason,
  description,
  steps,
  warning,
  completed,
  toggle,
}: {
  number: string;
  id: string;
  title: string;
  tag: string;
  reason: string;
  description: string;
  steps?: string[];
  warning?: string;
  completed: boolean;
  toggle: (id: string) => void;
}) {
  return (
    <section className={completed ? "support-detail completed" : "support-detail"}>
      <span className="support-number">{number}</span>
      <div>
        <p className="eyebrow green">{tag}</p>
        <h3>{title}</h3>
        <p className="support-reason">{reason}</p>
        <p className="support-description">{description}</p>
        {steps && (
          <ol className="support-steps">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
        {warning && <p className="support-warning">{warning}</p>}
      </div>
      <button onClick={() => toggle(id)}>
        {completed ? "✓ Wykonano" : "Oznacz jako wykonane"}
      </button>
    </section>
  );
}

function ProgressView() {
  const days = [
    ["Śr", 3, 2],
    ["Czw", 4, 3],
    ["Pt", 3, 4],
    ["Sob", 4, 2],
    ["Nd", 2, 4],
    ["Pon", 3, 3],
    ["Dziś", 4, 2],
  ];
  return (
    <>
      <section className="progress-summary">
        <div>
          <p className="eyebrow green">OSTATNIE 7 DNI</p>
          <h2>Twoje tempo, nie wyścig</h2>
          <p>
            Trendy pomagają zauważyć zmianę. Nie służą do oceny ani diagnozy.
          </p>
        </div>
        <div className="streak">
          <strong>6</strong>
          <span>check-inów<br />w tym tygodniu</span>
        </div>
      </section>
      <section className="card chart-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">ENERGIA I STRES</p>
            <h3>Codzienny obraz</h3>
          </div>
          <div className="chart-legend">
            <span><i className="energy-dot" /> Energia</span>
            <span><i className="stress-dot" /> Stres</span>
          </div>
        </div>
        <div className="bar-chart">
          {days.map(([day, energy, stress]) => (
            <div className="bar-day" key={day}>
              <div className="bars">
                <span
                  className="bar energy"
                  style={{ height: `${Number(energy) * 16}%` }}
                />
                <span
                  className="bar stress"
                  style={{ height: `${Number(stress) * 16}%` }}
                />
              </div>
              <small>{day}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="insight-grid">
        <section className="card mini-insight">
          <span>☾</span>
          <p>Średnia jakość snu</p>
          <strong>3,4 <small>/ 5</small></strong>
        </section>
        <section className="card mini-insight">
          <span>◇</span>
          <p>Najczęściej zaznaczasz</p>
          <strong>Napięcie karku</strong>
        </section>
        <section className="card mini-insight">
          <span>↗</span>
          <p>Łagodny trend</p>
          <strong>Więcej energii</strong>
        </section>
      </div>
    </>
  );
}

function RulesView() {
  return (
    <>
      <section className="rules-hero">
        <p className="eyebrow green">REJESTR REGUŁ TCM</p>
        <h2>Jak aplikacja interpretuje dane</h2>
        <p>
          Poniżej znajdują się jawne reguły tradycyjnej medycyny chińskiej
          zaimplementowane w AkuCheckHome. Są modelem edukacyjnym, nie diagnozą.
        </p>
      </section>

      <div className="rules-grid">
        <article className="rule-card">
          <div className="rule-card-heading">
            <span>01</span>
            <small>WERSJA 1.0</small>
          </div>
          <h3>Układ 12 pulsów</h3>
          <p>
            Lewa ręka: SI/HE, GB/LIV, BL/KID. Prawa ręka w układzie lustrzanym:
            LU/LI, SP/ST, PC/SJ. Każdy puls ma odczyt powierzchowny lub głęboki.
          </p>
          <div className="rule-formula">−2 · −1 · v · +1 · +2</div>
          <small className="rule-location">Działa w: 12 pulsów</small>
        </article>

        <article className="rule-card featured">
          <div className="rule-card-heading">
            <span>02</span>
            <small>WERSJA 1.1</small>
          </div>
          <h3>Bloki wejścia–wyjścia</h3>
          <p>
            Wzorzec pojawia się, gdy puls wyjścia jest słabszy od pulsu wejścia
            o co najmniej jeden poziom. Analizowanych jest sześć przejść.
          </p>
          <div className="rule-formula">wejście − wyjście ≥ 1</div>
          <ul>
            <li>SI → BL</li><li>KI → PC</li><li>SJ → GB</li>
            <li>LV → LU</li><li>LI → ST</li><li>SP → HT</li>
          </ul>
          <small className="rule-location">Działa w: 12 pulsów i Pomóż sobie</small>
        </article>

        <article className="rule-card">
          <div className="rule-card-heading">
            <span>03</span>
            <small>WERSJA 1.0</small>
          </div>
          <h3>Kolejność punktów</h3>
          <p>
            Najpierw delikatnie stymulowany jest punkt wyjścia po lewej i
            prawej stronie, następnie punkt wejścia po lewej i prawej stronie.
          </p>
          <div className="rule-formula">wyjście L/P → wejście L/P</div>
          <small className="rule-location">Działa w: Pomóż sobie</small>
        </article>

        <article className="rule-card">
          <div className="rule-card-heading">
            <span>04</span>
            <small>WERSJA 1.0</small>
          </div>
          <h3>Zegar narządów</h3>
          <p>
            Każdy meridian ma tradycyjne maksimum w dwugodzinnym przedziale
            oraz minimum 12 godzin później, gdy maksimum ma meridian przeciwny.
          </p>
          <div className="rule-formula">maksimum ↔ minimum +12 h</div>
          <small className="rule-location">Działa w: Check-in · Sen i regeneracja</small>
        </article>

        <article className="rule-card">
          <div className="rule-card-heading">
            <span>05</span>
            <small>BEZPIECZEŃSTWO</small>
          </div>
          <h3>Ograniczenia akupresury</h3>
          <p>
            Bez igieł i bez bolesnego ucisku. Punkty przy oku, klatce
            piersiowej, piersi i pachy otrzymują dodatkowe ostrzeżenia.
            Kilku procedur nie należy wykonywać automatycznie jedna po drugiej.
          </p>
          <small className="rule-location">Działa w: Pomóż sobie</small>
        </article>

        <article className="rule-card subtle-rule">
          <div className="rule-card-heading">
            <span>06</span>
            <small>ALIASES</small>
          </div>
          <h3>Kody aplikacji i WHO</h3>
          <p>
            Interfejs zachowuje skróty używane podczas badania, a reguły
            automatycznie mapują je na nomenklaturę bazy.
          </p>
          <div className="rule-formula">HE→HT · KID→KI · LIV→LV</div>
        </article>
      </div>
    </>
  );
}

function ActionCard({
  id,
  label,
  title,
  description,
  color,
  completed,
  toggle,
}: {
  id: string;
  label: string;
  title: string;
  description: string;
  color: string;
  completed: boolean;
  toggle: (id: string) => void;
}) {
  return (
    <article className={`action-card ${color} ${completed ? "completed" : ""}`}>
      <span className="action-orb">{completed ? "✓" : "·"}</span>
      <p className="eyebrow">{label}</p>
      <h3>{title}</h3>
      <p>{description}</p>
      <button onClick={() => toggle(id)}>
        {completed ? "Wykonano" : "Wykonaj teraz"} <span>→</span>
      </button>
    </article>
  );
}

function viewTitle(view: View) {
  return {
    home: "Dzień dobry, Anno",
    checkin: "Codzienny check-in",
    pulse: "Badanie 12 pulsów",
    support: "Pomóż sobie",
    progress: "Twoje postępy",
    rules: "Reguły aplikacji",
  }[view];
}
