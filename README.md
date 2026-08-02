# AkuCheckHome

AkuCheckHome to responsywna aplikacja webowa wspierająca codzienną samoobserwację samopoczucia, regeneracji oraz wyników badania 12 pulsów. Łączy prosty dziennik zdrowia z edukacyjnymi regułami dotyczącymi meridianów, zegara narządów, oddechu i zależności Entry–Exit.

> [!IMPORTANT]
> AkuCheckHome ma charakter edukacyjny i wspierający. Nie diagnozuje, nie zaleca leczenia i nie zastępuje konsultacji z lekarzem ani wykwalifikowanym terapeutą.

## Demo

Aktualną wersję aplikacji można otworzyć pod adresem:

**[akucheckhome.aniasieradzan.chatgpt.site](https://akucheckhome.aniasieradzan.chatgpt.site)**

Do korzystania z aplikacji wymagane jest konto użytkownika. Rejestrację, logowanie, reset hasła i sesję obsługuje Supabase Auth.

## Jak działa aplikacja

Codzienna ścieżka użytkownika jest dostępna jako jeden prowadzony „Dzisiejszy wpis”:

1. **Samopoczucie** — swobodny opis dnia, maksymalnie 2000 znaków.
2. **Check-in** — ocena snu, wyspania, energii, stresu, nastroju i napięcia oraz zapis objawów.
3. **Badanie 12 pulsów** — wartości dla 12 meridianów w skali od `-2` do `+2`, wraz z instruktażem wideo.
4. **Podsumowanie** — stan zapisanych części oraz interpretacja Entry–Exit pokazywana dopiero po zakończeniu badania pulsów.
5. **Pomóż sobie** — uporządkowane edukacyjne wskazówki wybrane na podstawie zapisanych obserwacji.
6. **Historia** — historia, porównanie wpisów i możliwość otwarcia wybranego dnia.

Skale check-inu nie mają domyślnych odpowiedzi — użytkownik świadomie wybiera każdą ocenę. Datę wpisu można wybrać w nagłówku, przy czym aplikacja nie pozwala tworzyć wpisów z przyszłości. Mobilna nawigacja obejmuje cztery główne obszary: Dzisiaj, Wpis, Wsparcie i Historia.

Dodatkowo aplikacja udostępnia:

- analizę jawnych reguł Entry–Exit;
- wskazówki powiązane z zegarem narządów;
- lokalnie zdefiniowane protokoły oddechowe;
- bazę 14 meridianów i 361 klasycznych punktów;
- responsywny interfejs na komputer i telefon;
- generator deterministycznych danych syntetycznych do testów.

## Prywatność i sposób zapisu danych

Supabase służy obecnie do uwierzytelniania użytkowników. Wpisy samopoczucia,
check-iny i wyniki pulsów są zapisywane w `localStorage` bieżącej przeglądarki
w osobnym magazynie dla identyfikatora zalogowanego konta. Starszy, wspólny
zapis `akucheckhome.health-data.v1` nie jest przypisywany automatycznie:
zalogowany użytkownik może jawnie przejąć go z komunikatu w aplikacji, jeśli
dane należą do jego konta.

Oznacza to, że dane:

- pozostają na danym urządzeniu i w danym profilu przeglądarki;
- nie synchronizują się obecnie pomiędzy urządzeniami;
- mogą zostać utracone po wyczyszczeniu danych witryny;
- nie są jeszcze zapisywane w bazie Supabase użytkownika.

Nie należy wpisywać danych innych osób ani umieszczać sekretów i danych szczególnie wrażliwych w repozytorium.

## Stos technologiczny

- TypeScript 5
- React 19
- Next.js 16 uruchamiany przez vinext
- Supabase Auth
- Zod
- Drizzle ORM
- Tailwind CSS 4 / własne style CSS
- Cloudflare Workers / Sites
- test runner Node.js przez `tsx --test`

## Uruchomienie lokalne

### Wymagania

- Node.js `>=22.13.0`
- npm
- projekt Supabase z włączonym logowaniem e-mail i hasłem

### Instalacja

```bash
git clone https://github.com/Ordysia/AkuCheckHome.git
cd AkuCheckHome/web
npm ci
```

Skopiuj przykładową konfigurację:

```bash
cp .env.example .env.local
```

Na Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Uzupełnij publiczne dane projektu Supabase w `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=twoj_publiczny_klucz
```

Uruchom serwer deweloperski:

```bash
npm run dev
```

Adres aplikacji zostanie wyświetlony w terminalu. W ustawieniach Supabase Auth dodaj ten adres do dozwolonych adresów przekierowania, aby poprawnie działały potwierdzanie konta i odzyskiwanie hasła.

> [!WARNING]
> Plik `.env.local` nie może trafić do repozytorium. Nigdy nie udostępniaj klucza secret/service-role w kodzie klienckim ani w zmiennych z prefiksem `NEXT_PUBLIC_`.

## Dostępne polecenia

Wszystkie polecenia uruchamiaj w katalogu `web/`.

| Polecenie | Działanie |
| --- | --- |
| `npm run dev` | uruchamia środowisko deweloperskie |
| `npm run build` | buduje wersję produkcyjną |
| `npm run start` | uruchamia zbudowaną aplikację |
| `npm run lint` | sprawdza kod przez ESLint |
| `npm test` | uruchamia testy danych syntetycznych i pełny build |
| `npm run test:synthetic` | uruchamia tylko testy generatora |
| `npm run seed:synthetic` | generuje lokalne dane testowe |
| `npm run db:generate` | generuje migracje Drizzle |

## Dane syntetyczne

Generator tworzy powtarzalne rekordy testowe oznaczone `isSynthetic: true`. Domyślnie zapisuje je w ignorowanym przez Git katalogu `web/synthetic-output/`.

```bash
npm run seed:synthetic
npm run seed:synthetic -- --users=5 --days=10 --seed=12345
npm run seed:synthetic -- --scenario=kid-li
npm run seed:synthetic -- --clean
```

Dostępne cele zapisu:

```bash
npm run seed:synthetic -- --target=export
npm run seed:synthetic -- --target=local
npm run seed:synthetic -- --target=supabase
```

Zasilenie Supabase wymaga wcześniejszego zastosowania migracji [`web/supabase/migrations/20260802123000_synthetic_health_data.sql`](web/supabase/migrations/20260802123000_synthetic_health_data.sql) oraz lokalnego ustawienia:

```env
SUPABASE_SECRET_KEY=uzupelnij_lokalnie
ALLOW_SYNTHETIC_SEED=true
ALLOW_SYNTHETIC_SUPABASE_URL=https://twoj-projekt-testowy.supabase.co
# Tylko dla --target=supabase --clean:
CONFIRM_SYNTHETIC_CLEAN=DELETE SYNTHETIC DATA
```

Migracja dotyczy wyłącznie danych syntetycznych. Tabele mają włączone RLS i celowo nie udostępniają zapisu aplikacji klienckiej. Pełny opis generatora znajduje się w [`web/docs/synthetic-data.md`](web/docs/synthetic-data.md).

## Baza wiedzy

Jedynym zatwierdzonym źródłem właściwości punktów w projekcie jest pakiet `14_meridianow_5_elementow_TXT_v1.zip`, przekazany przez właściciela merytorycznego. Zaimportowane materiały obejmują 12 meridianów głównych, Ren Mai, Du Mai i 361 klasycznych punktów.

Pliki źródłowe znajdują się w [`knowledge-base/meridians`](knowledge-base/meridians). Reguły korzystania z materiałów opisuje [`knowledge-base/README.md`](knowledge-base/README.md), a pochodzenie źródeł — [`knowledge-base/SOURCES.md`](knowledge-base/SOURCES.md).

Opisów punktów nie należy uzupełniać wiedzą modelu, internetu ani innymi publikacjami bez wyraźnej decyzji właściciela merytorycznego.

## Struktura repozytorium

```text
AkuCheckHome/
├── knowledge-base/          # zatwierdzone treści, reguły i materiały instruktażowe
│   ├── breathing/           # dokumentacja protokołów oddechowych
│   ├── instructional-videos/# materiały do badania pulsów
│   ├── meridians/           # źródłowe opisy 14 meridianów
│   └── rules/               # reguły Entry–Exit i zegara narządów
└── web/
    ├── app/                 # interfejs, widoki i reguły aplikacji
    ├── docs/                # dokumentacja techniczna
    ├── lib/                 # modele danych, walidacja i klient Supabase
    ├── public/              # statyczne zasoby i film instruktażowy
    ├── scripts/synthetic/   # generator danych syntetycznych
    ├── supabase/migrations/ # migracje tabel testowych
    └── tests/               # testy automatyczne
```

## Testy i kontrola jakości

Przed wysłaniem zmian uruchom:

```bash
cd web
npm run lint
npm test
```

`npm test` obejmuje testy generatora danych syntetycznych i produkcyjny build aplikacji.

## Wersja i status

Wersja pakietu: **1.2.0**. Stabilnym punktem odniesienia jest tag [`v1.2`](https://github.com/Ordysia/AkuCheckHome/tree/v1.2).

Projekt jest aktywnie rozwijany.
