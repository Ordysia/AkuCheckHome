# AkuCheckHome — protokoły oddechowe

Ta baza zawiera edukacyjne ćwiczenia oddechowe przeznaczone dla dorosłych
użytkowników. Nie służy do leczenia duszności ani zastępowania konsultacji
medycznej.

## Status

- Wersja schematu: `1.0.0`
- Wersja treści: `0.1.0`
- Właściciel merytoryczny: Product Owner AkuCheckHome
- Data przeglądu: `2026-07-29`
- Plik wykonywalny aplikacji: `web/app/data/breathing-protocols.ts`

## Poziomy publikacji

- `approved_general` — aplikacja może proponować zdrowej osobie dorosłej.
- `conditional` — wymaga informacji o przeciwwskazaniach lub właściwego
  kontekstu, dlatego nie jest automatycznie proponowany.
- `clinical_context` — dotyczy duszności albo choroby; aplikacja nie uruchamia
  go jako samopomocy bez wcześniejszego uzgodnienia ze specjalistą.

## Reguły wspólne

- Oddech ma być spokojny, cichy i niewymuszony.
- Nie należy nabierać maksymalnej ilości powietrza.
- Barki i szyja pozostają rozluźnione.
- Bezdech nie jest wymagany do uzyskania efektu uspokojenia.
- Użytkownik może skrócić fazę wdechu lub wydechu, jeśli pojawia się dyskomfort.
- Ćwiczenie należy natychmiast przerwać przy zawrotach głowy, mrowieniu wokół
  ust lub dłoni, bólu w klatce piersiowej, narastającej duszności, zaburzeniach
  widzenia albo uczuciu omdlenia.
- Nowa lub niewyjaśniona duszność nie może być obsługiwana wyłącznie
  ćwiczeniem oddechowym.

## Automatyczne rekomendacje MVP

W MVP automatycznie proponowane są:

1. spokojny oddech `5–5`,
2. wydłużony wydech `4–6`,
3. łagodna nauka oddechu przeponowego.

Pozostałe protokoły są zapisane i wersjonowane, lecz pozostają zablokowane
do czasu dodania profilu przeciwwskazań oraz zatwierdzenia reguł kwalifikacji.

## Źródła

- Materiał przekazany przez Product Ownera, 2026-07-29.
- American Heart Association — Stress Management.
- NHS — Breathing exercises for stress.
- American Lung Association — Breathing Exercises for Better Lung Health.
- Cambridge University Hospitals — Breathing techniques to ease breathlessness.

