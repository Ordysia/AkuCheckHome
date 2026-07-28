# Reguła bloków wejścia–wyjścia na 12 pulsach

- Wersja: `1.1.0`
- Status: `approved_by_product_owner`
- Data: `2026-07-29`
- Implementacja: `web/app/data/pulse-entry-exit-rules.ts`

## Warunek

Dla każdego przejścia `A → B`:

`różnica = puls B − puls A`

Podejrzenie wzorca jest wskazywane, gdy puls wyjścia `A` jest słabszy od pulsu
wejścia `B` o co najmniej jeden poziom, czyli gdy `różnica ≥ 1`:

- `1` — możliwy wzorzec bloku,
- `2` — wyraźne podejrzenie wzorca,
- `3–4` — bardzo silne podejrzenie wzorca.

## Analizowane przejścia

| Przejście | Punkt wyjścia | Punkt wejścia |
|---|---|---|
| SI → BL | SI19 | BL1 |
| KI → PC | KI22 | PC1 u mężczyzn / PC2 u kobiet |
| SJ → GB | SJ22 | GB1 |
| LV → LU | LV14 | LU1 |
| LI → ST | LI20 | ST1 |
| SP → HT | SP21 | HT1 |

Formularz używa aliasów `HE`, `KID` i `LIV`. Przed analizą są one mapowane
odpowiednio na `HT`, `KI` i `LV`.

## Prezentacja wyniku

Wynik opisujemy jako „podejrzenie wzorca bloku wejścia–wyjścia”, nigdy jako
potwierdzony blok. Punkty prezentowane są w kolejności:

1. punkt wyjścia — lewa strona;
2. punkt wyjścia — prawa strona;
3. punkt wejścia — lewa strona;
4. punkt wejścia — prawa strona.

Po oznaczeniu wykonania należy wyświetlić:

„Wykonano stymulację punktów przypisanych do wzorca bloku. Wynik należy
zweryfikować w kolejnym codziennym badaniu pulsów.”

## Bezpieczeństwo

- Bez igieł; wyłącznie delikatny i bezbolesny ucisk.
- Przerwać przy bólu, zawrotach głowy, nudnościach lub pogorszeniu.
- BL1, ST1 i GB1 znajdują się przy oku — nie naciskać gałki ocznej.
- Punkty klatki piersiowej, piersi i pachy nie mogą być uciskane głęboko.
- Przy kilku wzorcach aplikacja nie zaleca wykonywania wszystkich procedur;
  kolejność i zakres powinien zweryfikować terapeuta.
- Efekt ocenia się dopiero w kolejnym codziennym badaniu.
