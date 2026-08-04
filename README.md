# AkuCheckHome

AkuCheckHome to aplikacja do codziennej samoobserwacji samopoczucia i zapisywania wyników badania 12 pulsów. Prowadzi użytkownika przez uporządkowaną ścieżkę:

1. **Samopoczucie** — opis własnymi słowami.
2. **Check-in** — sen, energia, stres, nastrój, napięcie i zauważone objawy.
3. **12 pulsów** — zapis wartości dla 12 meridianów w skali od `-2` do `+2`.
4. **Pomóż sobie** — edukacyjne propozycje przygotowane na podstawie zapisanych obserwacji.
5. **Postępy** — historia i porównanie danych z kolejnych dni.

> **Ważne:** aplikacja ma charakter edukacyjny i wspiera samoobserwację. Nie stawia diagnozy, nie zastępuje konsultacji medycznej ani leczenia.

## Wersja

Aktualne wydanie: **v1.2** (`1.2.0`).

## Wersja testowa

Aplikację można przetestować pod adresem:

**[Otwórz AkuCheckHome](https://akucheckhome.aniasieradzan.chatgpt.site)**

Witryna jest publicznie dostępna, ale dane użytkownika są chronione przez logowanie Supabase.

## Najważniejsze funkcje

- rejestracja, logowanie i odzyskiwanie hasła przez Supabase Auth;
- dzienny opis samopoczucia do 2000 znaków;
- check-in obejmujący sen, energię, stres, nastrój, napięcie i objawy;
- zapis pełnego badania 12 pulsów;
- analiza jawnych reguł Entry–Exit;
- edukacyjne propozycje akupresurowe oparte na lokalnej bazie wiedzy;
- historia samopoczucia, check-inów i pulsów;
- deterministyczny generator bezpiecznych danych syntetycznych;
- widoki responsywne na komputer i telefon.

## Źródło wiedzy o meridianach

Jedynym źródłem właściwości punktów używanym w projekcie jest pakiet:

`14_meridianow_5_elementow_TXT_v1.zip`

Zaimportowana baza obejmuje 12 meridianów głównych, Ren Mai i Du Mai. Aktualna wersja źródła to **v1 z 08.2026**. Pliki źródłowe znajdują się w katalogu [`knowledge-base/meridians`](knowledge-base/meridians), a zasady korzystania z nich opisano w [`knowledge-base/README.md`](knowledge-base/README.md).

Projekt nie powinien uzupełniać właściwości punktów wiedzą z internetu ani innymi materiałami bez wyraźnej decyzji właściciela merytorycznego.

## Technologie

- TypeScript
- React 19
- Next.js / vinext
- Supabase Auth i Supabase Database
- Zod
- Drizzle ORM
- wbudowany runner testów Node.js uruchamiany przez `tsx --test`
- Sites / Cloudflare Workers

## Uruchomienie lokalne

### Wymagania

- Node.js `>=22.13.0`
- npm
- projekt Supabase

### Instalacja

```bash
git clone https://github.com/Ordysia/AkuCheckHome.git
cd AkuCheckHome/web
npm install
```

Utwórz plik `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TWOJ-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TWOJ_PUBLICZNY_KLUCZ
```

Następnie uruchom aplikację:

```bash
npm run dev
```

Adres lokalny zostanie pokazany w terminalu.

Plik `.env.local` jest ignorowany przez Git i nie powinien być dodawany do repozytorium. Nie zapisuj w kodzie haseł, klucza secret/service-role ani innych sekretów.

## Supabase

Migracja tabel danych syntetycznych znajduje się w:

[`web/supabase/migrations/20260802123000_synthetic_health_data.sql`](web/supabase/migrations/20260802123000_synthetic_health_data.sql)

Tabele syntetyczne mają włączone RLS i nie udostępniają polityk zapisu aplikacji klienckiej. Do ich zasilenia wymagany jest jawnie podany klucz secret oraz flaga bezpieczeństwa.

## Dane syntetyczne

Generator tworzy deterministyczne dane testowe oznaczone `isSynthetic: true`.

```bash
npm run seed:synthetic
npm run seed:synthetic -- --users=5 --days=10 --seed=12345
npm run seed:synthetic -- --scenario=kid-li
npm run seed:synthetic -- --clean
```

Domyślnie dane trafiają do lokalnego katalogu `synthetic-output/`, który jest ignorowany przez Git. Szczegóły: [`web/docs/synthetic-data.md`](web/docs/synthetic-data.md).

## Testy i weryfikacja

```bash
cd web
npm test
```

Polecenie uruchamia testy generatora danych syntetycznych oraz pełny build aplikacji.

Oddzielne komendy:

```bash
npm run test:synthetic
npm run build
npm run lint
```

## Struktura repozytorium

```text
AkuCheckHome/
├── knowledge-base/       # zatwierdzona baza meridianów i reguły
└── web/
    ├── app/              # interfejs i logika aplikacji
    ├── docs/             # dokumentacja techniczna
    ├── lib/              # wspólne modele i walidacja
    ├── scripts/          # generator danych syntetycznych
    ├── supabase/         # migracje Supabase
    └── tests/            # testy automatyczne
```

## Bezpieczeństwo i prywatność

- Nie wpisuj danych innych osób w polach samoobserwacji.
- Nie umieszczaj plików `.env*` ani sekretów Supabase w repozytorium.
- Dane syntetyczne muszą mieć `isSynthetic: true`.
- Generator blokuje przypadkowe uruchomienie w środowisku produkcyjnym.
- Błędne rekordy testowe są odrzucane przez walidację.

## Status projektu

Projekt jest aktywnie rozwijany. Stabilny punkt odniesienia dla tej wersji stanowi tag [`v1.2`](https://github.com/Ordysia/AkuCheckHome/tree/v1.2).
