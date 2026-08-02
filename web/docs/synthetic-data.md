# Generator danych syntetycznych

Generator korzysta ze wspólnego modelu `lib/health-data/model.ts` i z
zatwierdzonych reguł Entry–Exit z `app/data/pulse-entry-exit-rules.ts`.
Wszystkie rekordy mają `isSynthetic: true`.

## Uruchamianie

```bash
npm run seed:synthetic
npm run seed:synthetic -- --users=5 --days=10 --seed=12345
npm run seed:synthetic -- --scenario=kid-li
npm run seed:synthetic -- --clean
```

Domyślnie dane są zapisywane idempotentnie do lokalnego SQLite w
`synthetic-output/akucheckhome.synthetic.sqlite` oraz eksportowane do JSON i
zestawu plików CSV w `synthetic-output/`. Katalog jest ignorowany przez Git.

Dostępne cele:

```bash
npm run seed:synthetic -- --target=export
npm run seed:synthetic -- --target=local
npm run seed:synthetic -- --target=supabase
```

## Supabase

1. Uruchom migrację `supabase/migrations/20260802123000_synthetic_health_data.sql`.
2. Ustaw lokalnie `SUPABASE_SECRET_KEY`, `ALLOW_SYNTHETIC_SEED=true` oraz
   `ALLOW_SYNTHETIC_SUPABASE_URL` identyczny z testowym originem Supabase.
3. Uruchom generator z `--target=supabase`.

Publishable key nie wystarcza do zapisu fixture'ów. Tabele mają włączone RLS i
celowo nie mają polityk dostępu dla aplikacji klienckiej. Generator Supabase
działa wyłącznie po jawnym podaniu secret key i flagi odblokowującej.

## Bezpieczeństwo i ponowne uruchomienie

- Identyfikatory są wyliczane deterministycznie z seed, użytkownika, daty i fazy.
- Zapis używa upsert, więc ponowne uruchomienie nie duplikuje danych.
- `--clean` usuwa wyłącznie rekordy z `is_synthetic = true`.
- Czyszczenie Supabase wymaga dodatkowo dokładnej wartości
  `CONFIRM_SYNTHETIC_CLEAN=DELETE SYNTHETIC DATA`.
- URL celu Supabase musi dokładnie odpowiadać jawnie dozwolonemu testowemu
  originowi w `ALLOW_SYNTHETIC_SUPABASE_URL`.
- CLI odmawia działania po wykryciu środowiska produkcyjnego.
- Rekordy celowo błędne są eksportowane jako `rejectedRecords`; nie trafiają do
  SQLite ani Supabase.

## Znaczenie scenariuszy

`entry-exit` opiera się na istniejącej regule różnicy `entry - exit >= 1`.
`entry-block` i `exit-block` to jednostronne, niepełne fixture'y bez diagnozy.
`kid-li` ustawia KI/KID na `-2` i LI na `+2`, ale nie przypisuje diagnozy, ponieważ
w aktualnym kodzie i dokumentacji nie istnieje reguła KID–LI.
