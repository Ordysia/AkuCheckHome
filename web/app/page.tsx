"use client";

import { useEffect, useMemo, useState } from "react";
import type { LocalHealthStore, Scores } from "@/lib/health-data/model";
import { AuthGate } from "./auth-gate";
import { getBreathingProtocol } from "./data/breathing-protocols";
import { analyzeEntryExitBlocks } from "./data/pulse-entry-exit-rules";
import {
  getOrganClockEntryAtTime,
  getOrganClockGuidance,
} from "./data/organ-clock-rules";

type View = "home" | "wellbeing" | "checkin" | "pulse" | "support" | "progress" | "rules";
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
  { id: "wellbeing", label: "Samopoczucie", icon: "○" },
  { id: "checkin", label: "Check-in", icon: "✓" },
  { id: "pulse", label: "12 pulsów", icon: "∿" },
  { id: "support", label: "Pomóż sobie", icon: "✦" },
  { id: "progress", label: "Postępy", icon: "↗" },
  { id: "rules", label: "Reguły", icon: "◇" },
];

export default function Home() {
  return (
    <AuthGate>
      {(user, signOut) => (
        <AkuCheckApp userEmail={user.email ?? "Użytkownik"} signOut={signOut} />
      )}
    </AuthGate>
  );
}

function AkuCheckApp({
  userEmail,
  signOut,
}: {
  userEmail: string;
  signOut: () => Promise<void>;
}) {
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
  const [wellbeing, setWellbeing] = useState("");
  const [wellbeingSaved, setWellbeingSaved] = useState(false);
  const [history, setHistory] = useState<LocalHealthStore>({ checkins: {}, pulses: {}, wellbeing: {} });

  useEffect(() => {
    const store = readLocalStore();
    const checkin = store.checkins[today];
    const pulse = store.pulses[today];
    const wellbeingEntry = store.wellbeing?.[today];
    setHistory(store);

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

    if (wellbeingEntry) {
      setWellbeing(wellbeingEntry.text);
      setWellbeingSaved(true);
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
    setHistory({ ...store });
    setSaved(true);
    setView("pulse");
  };

  const savePulses = () => {
    const store = readLocalStore();
    store.pulses[today] = {
      values: pulseValues,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    setHistory({ ...store });
    setPulseSaved(true);
    setView("support");
  };

  const saveWellbeing = () => {
    const store = readLocalStore();
    store.wellbeing ??= {};
    store.wellbeing[today] = {
      text: wellbeing,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    setHistory({ ...store });
    setWellbeingSaved(true);
    setView("checkin");
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

  const isViewCompleted = (itemView: View) =>
    (itemView === "wellbeing" && wellbeingSaved) ||
    (itemView === "checkin" && saved) ||
    (itemView === "pulse" && pulseSaved);

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
            <div className="nav-entry" key={item.id}>
              <button
                className={`nav-item${view === item.id ? " active" : ""}${isViewCompleted(item.id) ? " completed" : ""}`}
                onClick={() => setView(item.id)}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            </div>
          ))}
        </nav>

        <div className="desktop-account">
          <span className="nav-date">{formattedDate}</span>
          <button className="language" aria-label="Zmień język">
            PL
          </button>
          <span className="avatar">{userEmail.slice(0, 2).toUpperCase()}</span>
          <span className="profile-copy">
            <strong>{userEmail.split("@")[0]}</strong>
            <button className="sign-out" onClick={() => void signOut()}>Wyloguj</button>
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
            <span className="avatar">{userEmail.slice(0, 2).toUpperCase()}</span>
            <span className="profile-copy">
              <strong>{userEmail.split("@")[0]}</strong>
              <button className="sign-out" onClick={() => void signOut()}>Wyloguj</button>
            </span>
          </div>
        </header>

        <div className="content">
          {view === "home" && (
            <HomeView
              saved={saved}
              wellbeingSaved={wellbeingSaved}
              pulseSaved={pulseSaved}
              setView={setView}
            />
          )}
          {view === "wellbeing" && (
            <WellbeingView
              value={wellbeing}
              setValue={(value) => {
                setWellbeing(value);
                setWellbeingSaved(false);
              }}
              saved={wellbeingSaved}
              save={saveWellbeing}
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
              wellbeing={wellbeing}
              wellbeingSaved={wellbeingSaved}
            />
          )}
          {view === "progress" && <ProgressView history={history} />}
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
            className={`${view === item.id ? "active" : ""}${isViewCompleted(item.id) ? " completed" : ""}`}
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

function WellbeingView({
  value,
  setValue,
  saved,
  save,
}: {
  value: string;
  setValue: (value: string) => void;
  saved: boolean;
  save: () => void;
}) {
  return (
    <div className="wellbeing-layout">
      <section className="card wellbeing-card">
        <div className="wellbeing-heading">
          <div>
            <p className="eyebrow green">SAMOBADANIE · SAMOPOCZUCIE</p>
            <h2>Jak się dziś czujesz?</h2>
            <p>Zapisz to, co teraz zauważasz — własnymi słowami i bez oceniania.</p>
          </div>
          <span className="wellbeing-symbol" aria-hidden="true">○</span>
        </div>
        <label className="wellbeing-field">
          Twój dzisiejszy opis
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={2000}
            rows={12}
            placeholder="Możesz opisać swoje samopoczucie, energię, emocje albo to, co zwraca dziś Twoją uwagę…"
          />
        </label>
        <div className="wellbeing-meta">
          <small>Nie wpisuj danych innych osób</small>
          <small aria-live="polite">{value.length} / 2000 znaków</small>
        </div>
        <div className="wellbeing-actions">
          {saved && <span role="status">✓ Zapisano dzisiejszy wpis</span>}
          <button className="primary" onClick={save} disabled={!value.trim()}>
            Zapisz samopoczucie <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function HomeView({
  saved,
  wellbeingSaved,
  pulseSaved,
  setView,
}: {
  saved: boolean;
  wellbeingSaved: boolean;
  pulseSaved: boolean;
  setView: (view: View) => void;
}) {
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow green">CODZIENNA CHWILA DLA SIEBIE</p>
          <h2>Jak się dziś masz?</h2>
          <p>
            {!wellbeingSaved
              ? "Zacznij od zapisania własnymi słowami, jak się dziś czujesz."
              : !saved
                ? "Samopoczucie zapisane. Teraz uzupełnij krótki check-in."
                : !pulseSaved
                  ? "Check-in zapisany. Zostało badanie 12 pulsów."
                  : "Dzisiejsza ścieżka jest kompletna. Zobacz przygotowane propozycje wsparcia."}
          </p>
        </div>
        <button className="primary" onClick={() => setView(!wellbeingSaved ? "wellbeing" : !saved ? "checkin" : !pulseSaved ? "pulse" : "support")}>
          {!wellbeingSaved ? "Rozpocznij check-in" : !saved ? "Przejdź do check-in" : !pulseSaved ? "Przejdź do 12 pulsów" : "Zobacz propozycje"}
          <span>→</span>
        </button>
      </section>

      <div className="dashboard-grid observation-only">
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
  const [showPulseVideo, setShowPulseVideo] = useState(false);
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

      <section className={`pulse-video-card ${showPulseVideo ? "open" : ""}`}>
        <div className="pulse-video-copy">
          <span className="pulse-video-icon" aria-hidden="true">▶</span>
          <div>
            <p className="eyebrow green">FILM INSTRUKTAŻOWY</p>
            <h3>Jak zbadać 12 pulsów na obu rękach?</h3>
            <p>
              Obejrzyj instrukcję przed rozpoczęciem i wykonaj badanie we
              własnym tempie. Następnie wpisz 12 odczytów poniżej.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="pulse-video-button"
          aria-expanded={showPulseVideo}
          aria-controls="pulse-instruction-video"
          onClick={() => setShowPulseVideo((visible) => !visible)}
        >
          {showPulseVideo ? "Ukryj film" : "Obejrzyj"}
          <span aria-hidden="true">{showPulseVideo ? "↑" : "→"}</span>
        </button>
        {showPulseVideo && (
          <div className="pulse-video-player" id="pulse-instruction-video">
            <video controls preload="metadata" playsInline>
              <source src="/media/badanie-12-pulsow-final-v2.mp4" type="video/mp4" />
              Twoja przeglądarka nie obsługuje odtwarzania filmu MP4.
            </video>
            <p>
              Materiał edukacyjny do samobadania. Przerwij badanie, jeśli
              powoduje ból lub pogorszenie samopoczucia.
            </p>
          </div>
        )}
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
  wellbeing,
  wellbeingSaved,
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
  wellbeing: string;
  wellbeingSaved: boolean;
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

  const wellbeingLower = wellbeing.toLocaleLowerCase("pl");
  const contextualPoints = wellbeingSaved
    ? getContextualPointRecommendations(wellbeingLower)
    : [];

  recommendations.push(...contextualPoints);

  if (wellbeingSaved && contextualPoints.length === 0) {
    recommendations.push({
      id: "wellbeing-no-point",
      title: "Brak jednoznacznego dopasowania punktu",
      tag: "Samopoczucie · baza 14 meridianów v1",
      reason:
        "Wpis nie zawiera tematu, który możemy bezpośrednio połączyć z właściwościami punktów opisanymi w bazie.",
      description:
        "Aplikacja nie wybiera punktu na podstawie domysłu. Możesz uzupełnić Samopoczucie własnymi słowami, opisując dominujące odczucia, potrzeby lub obszar napięcia.",
    });
  }

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
          Jawne reguły uwzględniają opis samopoczucia, dzisiejszy check-in
          {pulseSaved ? " i zapis 12 pulsów" : ""}. To wsparcie edukacyjne,
          nie diagnoza ani plan leczenia.
        </p>
        <p className="source-note">
          Punkty akupresurowe: dopasowanie tematów z wpisu · baza 14
          meridianów v1 · 08.2026
        </p>
        <div className="analysis-status">
          <span className={wellbeingSaved ? "ready" : ""}>
            {wellbeingSaved ? "✓" : "○"} Samopoczucie
          </span>
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

function getContextualPointRecommendations(wellbeing: string) {
  const commonWarning =
    "To edukacyjna propozycja akupresury, nie diagnoza ani plan leczenia. Stosuj wyłącznie łagodny, bezbolesny ucisk bez użycia igieł. Nie uciskaj miejsca zranionego lub bolesnego i przerwij przy pogorszeniu samopoczucia. Baza nie opisuje lokalizacji anatomicznych — położenie punktu potwierdź z wykwalifikowaną osobą.";

  const rules = [
    {
      id: "point-lu9-context",
      pattern: /granic|odpuś|strat|żał|żal|poczuci.{0,8}wartoś|brak.{0,8}wartoś/,
      title: "LU9 · Taiyuan · Wielka Otchłań",
      theme: "granic, odpuszczania, straty lub poczucia własnej wartości",
      description:
        "Baza opisuje LU9 jako punkt wspierający jasność, granice, poczucie wartości oraz zdolność zakończenia i odpuszczenia; w warstwie Shen także godność i przechodzenie przez stratę bez utraty wartości siebie.",
    },
    {
      id: "point-lr3-context",
      pattern: /frustr|złoś|gniew|utkn|kierun|decyz|bezrad|nadziej|now.{0,5}począt/,
      title: "LR3 · Taichong · Wielki Napór",
      theme: "frustracji, utknięcia, decyzji, kierunku lub nowego początku",
      description:
        "Baza opisuje LR3 jako punkt wspierający wizję, elastyczność, planowanie, decyzję i konstruktywne kierowanie impulsem działania; w warstwie Shen także kierunek, nadzieję i nowy początek.",
    },
    {
      id: "point-ht7-context",
      pattern: /smut|samot|radoś|bliskoś|relac|odrzuc|nieobecn|zamknię/,
      title: "HT7 · Shenmen",
      theme: "smutku, samotności, bliskości, relacji lub potrzeby obecności",
      description:
        "Baza opisuje HT7 jako punkt wspierający radość, świadomość, komunikację, obecność i bezpieczne relacje; w warstwie Shen także ciepło, bliskość i autentyczną obecność.",
    },
    {
      id: "point-pc6-context",
      pattern: /przytłocz|przeciąż|ochron|bezpiecz|adapt|komunik|otworzy|otwartoś/,
      title: "PC6 · Neiguan",
      theme: "przeciążenia, potrzeby ochrony, adaptacji lub komunikacji",
      description:
        "Baza opisuje PC6 jako punkt wspierający ochronę emocjonalną, połączenie, adaptację i harmonijną komunikację; w warstwie Shen ochronę przy zachowaniu otwartości na relację i wymianę.",
    },
    {
      id: "point-ki3-context",
      pattern: /lęk|strach|niepewn|brak.{0,8}sił|wyczerp|wytrwa|zasob/,
      title: "KI3 · Taixi · Wielki Strumień",
      theme: "lęku, niepewności, wyczerpania, wytrwałości lub zasobów",
      description:
        "Baza opisuje KI3 jako punkt wspierający spokój wobec niepewności, wolę, wytrwałość i mądre gospodarowanie zasobami; w warstwie Shen także mądrość, zaufanie i potencjał.",
    },
    {
      id: "point-sp3-context",
      pattern: /chaos|rozpros|koncentr|uziemi|wspar|opie|zamartw|myśl.{0,8}duż|natłok.{0,8}myśl/,
      title: "SP3 · Taibai",
      theme: "rozproszenia, potrzeby uziemienia, koncentracji, wsparcia lub opieki",
      description:
        "Baza opisuje SP3 jako punkt wspierający uziemienie, koncentrację, zdolność przyjmowania wsparcia i zdrową opiekę; w warstwie Shen także poczucie bycia wspieranym, przynależność i wewnętrzną obfitość.",
    },
    {
      id: "point-st36-context",
      pattern: /żołąd|brzuch|trawien|jelit|apetyt/,
      title: "ST36 · Zusanli",
      theme: "dolegliwości brzucha, żołądka, jelit, trawienia lub apetytu",
      description:
        "Baza opisuje ST36 w kontekście żołądka, jelit i brzucha, a także jako punkt wspierający uziemienie, koncentrację, przyjmowanie wsparcia i zdrową opiekę.",
    },
    {
      id: "point-si3-context",
      pattern: /kark|szyj|łopat|bark/,
      title: "SI3 · Houxi",
      theme: "napięcia lub dyskomfortu karku, szyi, łopatki albo barku",
      description:
        "Baza opisuje SI3 między innymi w kontekście karku, łopatki i barku oraz jako punkt wspierający radość, świadomość, komunikację, obecność i bezpieczne relacje.",
    },
  ];

  return rules
    .filter((rule) => rule.pattern.test(wellbeing))
    .slice(0, 3)
    .map(({ pattern: _pattern, theme, ...rule }) => ({
      ...rule,
      tag: "Akupresura · baza 14 meridianów v1",
      reason: `Na podstawie wpisu w Samopoczuciu: pojawia się temat ${theme}.`,
      warning: commonWarning,
    }));
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

function ProgressView({ history }: { history: LocalHealthStore }) {
  const checkinEntries = Object.entries(history.checkins).sort(([a], [b]) => a.localeCompare(b));
  const recentEntries = checkinEntries.slice(-7);
  const wellbeingCount = Object.keys(history.wellbeing ?? {}).length;
  const pulseCount = Object.keys(history.pulses).length;
  const average = (key: keyof Scores) =>
    checkinEntries.length
      ? checkinEntries.reduce((sum, [, entry]) => sum + entry.scores[key], 0) / checkinEntries.length
      : 0;
  const symptomCounts = new Map<string, number>();
  checkinEntries.forEach(([, entry]) => entry.symptoms.forEach((symptom) => symptomCounts.set(symptom, (symptomCounts.get(symptom) ?? 0) + 1)));
  const commonSymptom = [...symptomCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Jeszcze brak danych";
  const firstHalf = checkinEntries.slice(0, Math.min(3, checkinEntries.length));
  const lastHalf = checkinEntries.slice(-Math.min(3, checkinEntries.length));
  const segmentAverage = (entries: typeof checkinEntries, key: keyof Scores) =>
    entries.length ? entries.reduce((sum, [, entry]) => sum + entry.scores[key], 0) / entries.length : 0;
  const energyChange = segmentAverage(lastHalf, "energy") - segmentAverage(firstHalf, "energy");
  const trendLabel = checkinEntries.length < 2
    ? "Potrzeba więcej wpisów"
    : energyChange >= 0.5
      ? "Energia rośnie"
      : energyChange <= -0.5
        ? "Energia spada"
        : "Energia jest stabilna";
  return (
    <>
      <section className="progress-summary">
        <div>
          <p className="eyebrow green">TWOJA HISTORIA</p>
          <h2>Twoje tempo, nie wyścig</h2>
          <p>
            Trendy pomagają zauważyć zmianę. Nie służą do oceny ani diagnozy.
          </p>
        </div>
        <div className="streak">
          <strong>{checkinEntries.length}</strong>
          <span>zapisanych<br />check-inów</span>
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
          {recentEntries.length === 0 && <p className="chart-empty">Zapisz pierwszy check-in, aby rozpocząć wykres.</p>}
          {recentEntries.map(([date, entry]) => (
            <div className="bar-day" key={date}>
              <div className="bars">
                <span
                  className="bar energy"
                  style={{ height: `${entry.scores.energy * 16}%` }}
                />
                <span
                  className="bar stress"
                  style={{ height: `${entry.scores.stress * 16}%` }}
                />
              </div>
              <small>{new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(new Date(`${date}T12:00:00`))}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="insight-grid">
        <section className="card mini-insight">
          <span>☾</span>
          <p>Średnia jakość snu</p>
          <strong>{average("sleep").toFixed(1).replace(".", ",")} <small>/ 5</small></strong>
        </section>
        <section className="card mini-insight">
          <span>◇</span>
          <p>Najczęściej zaznaczasz</p>
          <strong>{commonSymptom}</strong>
        </section>
        <section className="card mini-insight">
          <span>↗</span>
          <p>Łagodny trend</p>
          <strong>{trendLabel}</strong>
        </section>
      </div>
      <section className="progress-compare">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CO WARTO PORÓWNYWAĆ</p>
            <h2>Zmiana jest ważniejsza niż pojedynczy wynik</h2>
          </div>
        </div>
        <div className="compare-grid">
          <article className="card compare-card"><span>01</span><h3>Sen → energia</h3><p>Porównuj jakość snu i wyspanie z energią następnego dnia. Średnia energia: <strong>{average("energy").toFixed(1).replace(".", ",")}/5</strong>.</p></article>
          <article className="card compare-card"><span>02</span><h3>Stres ↔ napięcie</h3><p>Obserwuj, czy oba wyniki rosną razem i czy odpoczynek pomaga je obniżyć. Średni stres: <strong>{average("stress").toFixed(1).replace(".", ",")}/5</strong>.</p></article>
          <article className="card compare-card"><span>03</span><h3>Objawy w czasie</h3><p>Sprawdzaj częstotliwość, nie pojedynczy dzień. Najczęstszy zapis: <strong>{commonSymptom}</strong>.</p></article>
          <article className="card compare-card"><span>04</span><h3>Wzorce 12 pulsów</h3><p>Porównuj, czy te same bloki powtarzają się i czy różnica maleje po wsparciu. Zapisane badania: <strong>{pulseCount}</strong>.</p></article>
          <article className="card compare-card"><span>05</span><h3>Opis samopoczucia</h3><p>Zestawiaj własne słowa z wynikami skal. Zapisane opisy: <strong>{wellbeingCount}</strong>.</p></article>
          <article className="card compare-card"><span>06</span><h3>Kierunek, nie ocena</h3><p>Za poprawę uznaj łagodny trend: więcej energii i snu, mniej stresu i napięcia. Nagłe pogorszenie skonsultuj ze specjalistą.</p></article>
        </div>
      </section>
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

        <article className="rule-card featured meridian-source-card">
          <div className="rule-card-heading">
            <span>07</span>
            <small>V1 · 08.2026</small>
          </div>
          <h3>Baza 14 meridianów</h3>
          <p>
            Aplikacja ma załadowany zestaw reguł i opisów dla 12 meridianów
            głównych oraz Ren Mai i Du Mai. Baza obejmuje 361 klasycznych
            punktów i jest obowiązującym źródłem ich właściwości.
          </p>
          <div className="rule-formula">14 meridianów · 361 punktów · wersja v1</div>
          <small className="rule-location">Obowiązuje od: 08.2026 · Działa w: Pomóż sobie</small>
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
    wellbeing: "Samopoczucie",
    checkin: "Codzienny check-in",
    pulse: "Badanie 12 pulsów",
    support: "Pomóż sobie",
    progress: "Twoje postępy",
    rules: "Reguły aplikacji",
  }[view];
}
