# AkuCheckHome — baza wiedzy o meridianach

Ta baza opisuje tradycyjny model akupunktury Pięciu Elementów. Nie jest modelem
anatomii człowieka, narzędziem diagnostycznym ani instrukcją wykonywania
akupunktury. W aplikacji punkty mogą być prezentowane wyłącznie jako propozycje
łagodnej, samodzielnej akupresury.

## Status

- Wersja schematu: `1.0.0`
- Wersja treści: `0.1.0`
- Status: `draft`
- Zakres punktów: `starter` — pierwsza wyselekcjonowana lista, nie pełne 361 punktów
- Właściciel merytoryczny: Product Owner AkuCheckHome
- Data przeglądu: `2026-07-28`

Treść `draft` nie może być automatycznie rekomendowana użytkownikowi. Do
publikacji w aplikacji kwalifikuje ją dopiero zmiana statusu danego punktu na
`approved`.

## Zakres

Każdy z 12 meridianów głównych oraz Ren Mai i Du Mai ma osobny plik w katalogu
`meridians/`. Plik zawiera:

1. nazwę i kod meridianu,
2. przypisanie do Elementu,
3. tradycyjnie opisywaną funkcję,
4. punkty uporządkowane według poziomów Ciało, Umysł i Duch,
5. lokalizację i prostą instrukcję odnalezienia,
6. zasady bezpiecznej akupresury,
7. ostrzeżenia,
8. źródła i historię wersji.

Poziomy Ciało–Umysł–Duch mogą się nakładać. Są klasyfikacją redakcyjną
stosowaną w tradycji Pięciu Elementów, a nie naukową klasyfikacją działania.

## Wspólna instrukcja akupresury

- Używaj opuszki palca lub kciuka.
- Zacznij od lekkiego nacisku i zwiększ go tylko do poziomu komfortowego.
- Nacisk nie może powodować bólu, drętwienia, zawrotów głowy ani pogorszenia
  samopoczucia.
- W wersji początkowej stosuj nacisk lub małe ruchy okrężne przez `30 sekund`.
- Punkt obustronny można uciskać po `30 sekund` z każdej strony.
- Przerwij natychmiast, jeśli pojawi się ból lub nietypowy objaw.

Instrukcja 30 sekund jest konserwatywnym ustawieniem początkowym zgodnym z
materiałem edukacyjnym US Veterans Health Administration. Dłuższe czasy mogą
być dodawane wyłącznie dla konkretnych punktów po osobnym zatwierdzeniu.

## Wspólne wykluczenia

Nie uciskaj punktu:

- na otwartej ranie, oparzeniu, wysypce lub uszkodzonej skórze,
- w obszarze aktywnego zakażenia, znacznego obrzęku albo świeżego zakrzepu,
- w miejscu bez czucia lub ze znacznie ograniczonym czuciem,
- bezpośrednio po urazie albo zabiegu,
- gdy ucisk wywołuje ból.

W ciąży lub przy jej podejrzeniu aplikacja nie może proponować punktów
oznaczonych `pregnancy_caution`. Do czasu niezależnego przeglądu bezpieczeństwa
najbezpieczniej jest nie generować w ciąży automatycznych zestawów akupresury.

## Ilustracje

Każdy punkt ma identyfikator planowanej ilustracji. Obraz może zostać dodany
dopiero po:

1. sprawdzeniu lokalizacji przez właściciela merytorycznego,
2. potwierdzeniu prawa do wykorzystania obrazu,
3. kontroli, że grafika nie sugeruje wkłuwania igły.

Standard WHO jest podstawą lokalizacji, ale jego ilustracje nie są automatycznie
kopiowane do projektu.

## Kody aplikacji i kody WHO

W formularzu pulsów zachowujemy skróty używane przez Product Ownera. W bazie
punktów kod główny jest zgodny z nomenklaturą WHO:

| Formularz pulsów | Kod główny bazy |
|---|---|
| `HE` | `HT` |
| `KID` | `KI` |
| `LIV` | `LR` |
| `REN` | `CV` |
| `DU` | `GV` |

Pozostałe skróty są takie same. Pole `app_alias` przechowuje alias używany w
interfejsie, dzięki czemu nie tracimy zgodności ani z tabelą pulsów, ani ze
źródłami WHO.

## Wersjonowanie

- Zmiana literówki bez zmiany znaczenia: `PATCH`, np. `0.1.1`.
- Dodanie punktu lub treści: `MINOR`, np. `0.2.0`.
- Zmiana znaczenia pola albo reguł bezpieczeństwa: `MAJOR`, np. `1.0.0`.
- Każda zmiana treści wymaga wpisu w `CHANGELOG.md`.
- Usunięty punkt otrzymuje status `retired`; nie kasujemy historii.

## Pliki

- `LU-lung.md`
- `LI-large-intestine.md`
- `ST-stomach.md`
- `SP-spleen.md`
- `HT-heart.md`
- `SI-small-intestine.md`
- `BL-bladder.md`
- `KI-kidney.md`
- `PC-pericardium.md`
- `SJ-san-jiao.md`
- `GB-gallbladder.md`
- `LR-liver.md`
- `CV-ren-mai.md`
- `GV-du-mai.md`
