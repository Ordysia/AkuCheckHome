# Zegar narządów — maksimum i minimum aktywności meridianów

- Wersja: `1.1.0`
- Status: `approved_by_product_owner`
- Data: `2026-07-29`
- Implementacja: `web/app/data/organ-clock-rules.ts`

Zegar narządów jest tradycyjnym modelem TCM, a nie opisem potwierdzonej
fizjologicznej aktywności narządów. Nie może samodzielnie służyć do diagnozy.

Każdy meridian ma:

- tradycyjne maksimum aktywności Qi w dwugodzinnym przedziale;
- tradycyjne minimum 12 godzin później;
- meridian przeciwny, który w czasie tego minimum osiąga maksimum.

| Meridian | Maksimum | Minimum | Aktywny w czasie minimum |
|---|---|---|---|
| GB — Pęcherzyk Żółciowy | 23:00–01:00 | 11:00–13:00 | HT — Serce |
| LV — Wątroba | 01:00–03:00 | 13:00–15:00 | SI — Jelito Cienkie |
| LU — Płuca | 03:00–05:00 | 15:00–17:00 | BL — Pęcherz Moczowy |
| LI — Jelito Grube | 05:00–07:00 | 17:00–19:00 | KI — Nerki |
| ST — Żołądek | 07:00–09:00 | 19:00–21:00 | PC — Osierdzie |
| SP — Śledziona | 09:00–11:00 | 21:00–23:00 | SJ — Potrójny Ogrzewacz |
| HT — Serce | 11:00–13:00 | 23:00–01:00 | GB — Pęcherzyk Żółciowy |
| SI — Jelito Cienkie | 13:00–15:00 | 01:00–03:00 | LV — Wątroba |
| BL — Pęcherz Moczowy | 15:00–17:00 | 03:00–05:00 | LU — Płuca |
| KI — Nerki | 17:00–19:00 | 05:00–07:00 | LI — Jelito Grube |
| PC — Osierdzie | 19:00–21:00 | 07:00–09:00 | ST — Żołądek |
| SJ — Potrójny Ogrzewacz | 21:00–23:00 | 09:00–11:00 | SP — Śledziona |

## Zasady aplikacji

- Przedział `23:00–01:00` poprawnie przechodzi przez północ.
- Alias `LIV` jest mapowany na `LV`, `HE` na `HT`, a `KID` na `KI`.
- Funkcja może wskazać przedział dla bieżącej godziny lub znaleźć dane
  konkretnego meridianu.
- Sam czas nie uruchamia rekomendacji ani rozpoznania. Wymaga osobnej,
  zatwierdzonej reguły łączącej godzinę z danymi check-inu.
- Dla czasu snu aplikacja opisuje maksimum, minimum i tradycyjny temat
  meridianu oraz zachęca do porównania z jakością snu i wyspaniem.
- Dla czasu pobudki aplikacja opisuje ten sam układ i zachęca do obserwacji
  łatwości wstawania oraz porannej energii.
