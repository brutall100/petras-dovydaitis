# Petras Dovydaitis — asmeninis puslapis su vaizdo sveikinimų rezervacija

Statinis vieno puslapio (`index.html`) tinklalapis, kuriame galima užsisakyti asmeninį
Petro Dovydaičio vaizdo sveikinimą už 30 €.

## Kas viduje

- **Hero** — pristatymas, firminės frazės („kvietiniai miltai“, „grietininis“), kaina.
- **Apie Petrą** — TikTok fenomenas, dainos/repas, „Jungle King 5“ pergalė.
- **Kaip tai veikia** — 3 žingsniai iki sveikinimo.
- **Užsakymo forma** — gavėjo vardas, proga, ką paminėti, tonas, terminas,
  užsakovo el. paštas/telefonas, sutikimas su sąlygomis.
- **Sąlygos** — 30 € kaina, pristatymas per 5–7 d., pinigų grąžinimo garantija.
- **DUK** ir footeris su socialinių tinklų nuorodomis (pažymėtos kaip gerbėjų/archyvinės).

## Kaip veikia forma

Backend'o nėra — paspaudus „Siųsti užsakymą“, sugeneruojamas `mailto:` laiškas su visais
užsakymo duomenimis. Gavėjo adresas keičiamas `index.html` faile, kintamajame `ORDER_EMAIL`.

Norint priimti užsakymus be el. pašto programos, formą galima prijungti prie
[Formspree](https://formspree.io) ar panašios paslaugos: formai pridėti
`action="https://formspree.io/f/JŪSŲ_ID" method="POST"` ir pašalinti `mailto:` logiką skripte.

## Paleidimas

Jokių priklausomybių — tiesiog atidarykite `index.html` naršyklėje, arba įjunkite
**GitHub Pages** (Settings → Pages → Deploy from branch → `main`, root).

## ⚠️ Svarbu prieš paleidžiant viešai

1. **Būtinas raštiškas paties Petro sutikimas** naudoti jo vardą ir atvaizdą komercinei
   paslaugai bei susitarimas dėl atlygio. Be sutikimo svetainės su jo vardu skelbti negalima.
2. **Patikrinkite socialinių tinklų nuorodas rankiniu būdu** — oficialus Petro TikTok
   profilis nėra patvirtintas; footeryje esančios nuorodos veda į gerbėjų/archyvines paskyras.
3. **Pridėkite tikrą Petro nuotrauką** (su jo leidimu) vietoje dabartinio 🌾 portreto
   (`.portrait` blokas `index.html` faile).
